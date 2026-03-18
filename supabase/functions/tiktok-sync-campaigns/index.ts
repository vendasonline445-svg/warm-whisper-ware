import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { bc_id, action } = body;

    if (!bc_id) {
      return new Response(JSON.stringify({ error: "bc_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get BC with access token
    const { data: bc, error: bcErr } = await supabase
      .from("business_centers")
      .select("*")
      .eq("id", bc_id)
      .single();

    if (bcErr || !bc?.access_token) {
      return new Response(JSON.stringify({ error: "BC not found or no token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "Access-Token": bc.access_token,
    };

    // ── Action: get advertiser accounts ──
    if (action === "get_advertisers") {
      const resp = await fetch(
        `${TIKTOK_API}/oauth2/advertiser/get/?app_id=${Deno.env.get("TIKTOK_APP_ID")}&secret=${Deno.env.get("TIKTOK_APP_SECRET")}&access_token=${bc.access_token}`,
        { headers }
      );
      const data = await resp.json();
      console.log("TikTok advertisers response:", JSON.stringify(data).slice(0, 1000));

      // For each advertiser, try to get its name via advertiser/info
      const advertisers = data?.data?.list || [];
      const enriched = [];
      for (const adv of advertisers) {
        let name = adv.advertiser_name || adv.advertiser_id;
        try {
          const infoResp = await fetch(
            `${TIKTOK_API}/advertiser/info/?advertiser_ids=["${adv.advertiser_id}"]`,
            { headers: { ...headers, "Access-Token": bc.access_token } }
          );
          const infoData = await infoResp.json();
          if (infoData.data?.list?.[0]?.name) {
            name = infoData.data.list[0].name;
          }
        } catch { /* ignore */ }
        enriched.push({
          advertiser_id: String(adv.advertiser_id),
          advertiser_name: name,
        });
      }

      return new Response(JSON.stringify({ code: 0, data: { list: enriched } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: sync campaigns ──
    if (action === "sync_campaigns") {
      const { advertiser_id } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch campaigns from TikTok
      const campResp = await fetch(
        `${TIKTOK_API}/campaign/get/?advertiser_id=${advertiser_id}&page_size=100`,
        { headers }
      );
      const campData = await campResp.json();
      console.log("TikTok campaigns response:", JSON.stringify(campData).slice(0, 500));

      if (campData.code !== 0) {
        return new Response(JSON.stringify({ error: campData.message, code: campData.code }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaigns = campData.data?.list || [];
      let synced = 0;

      for (const camp of campaigns) {
        const { error: upsertErr } = await supabase
          .from("campaigns")
          .upsert(
            {
              campaign_external_id: String(camp.campaign_id),
              campaign_name: camp.campaign_name,
              platform: "tiktok",
              client_id: bc.client_id,
            },
            { onConflict: "campaign_external_id" }
          );

        if (!upsertErr) synced++;
      }

      return new Response(
        JSON.stringify({ success: true, total: campaigns.length, synced }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Action: sync costs (reporting) ──
    if (action === "sync_costs") {
      const { advertiser_id, date_from, date_to } = body;
      if (!advertiser_id) {
        return new Response(JSON.stringify({ error: "advertiser_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

      const reportResp = await fetch(`${TIKTOK_API}/report/integrated/get/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          advertiser_id,
          report_type: "BASIC",
          data_level: "AUCTION_CAMPAIGN",
          dimensions: ["campaign_id", "stat_time_day"],
          metrics: ["spend", "impressions", "clicks", "cpc", "cpm", "ctr", "conversion", "cost_per_conversion"],
          start_date: date_from || weekAgo,
          end_date: date_to || today,
          page_size: 200,
        }),
      });
      const reportData = await reportResp.json();
      console.log("TikTok report response:", JSON.stringify(reportData).slice(0, 500));

      if (reportData.code !== 0) {
        return new Response(JSON.stringify({ error: reportData.message, code: reportData.code }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rows = reportData.data?.list || [];
      let inserted = 0;

      for (const row of rows) {
        const dims = row.dimensions || {};
        const metrics = row.metrics || {};
        const campExtId = String(dims.campaign_id);
        const date = dims.stat_time_day?.split(" ")[0];

        // Find internal campaign
        const { data: intCamp } = await supabase
          .from("campaigns")
          .select("id")
          .eq("campaign_external_id", campExtId)
          .maybeSingle();

        const spendCents = Math.round(parseFloat(metrics.spend || "0") * 100);

        await supabase.from("campaign_costs").upsert(
          {
            campaign_id: intCamp?.id || null,
            client_id: bc.client_id,
            date,
            spend: spendCents,
            impressions: parseInt(metrics.impressions || "0"),
            clicks: parseInt(metrics.clicks || "0"),
            cpc: parseFloat(metrics.cpc || "0"),
            cpm: parseFloat(metrics.cpm || "0"),
            ctr: parseFloat(metrics.ctr || "0"),
          },
          { onConflict: "campaign_id,date", ignoreDuplicates: false }
        );
        inserted++;
      }

      return new Response(
        JSON.stringify({ success: true, rows: rows.length, inserted }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("TikTok sync error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
