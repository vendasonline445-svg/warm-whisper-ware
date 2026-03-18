import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";

const safeJson = async (resp: Response) => {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response:", text.slice(0, 300));
    return { code: -1, message: `TikTok returned non-JSON (HTTP ${resp.status})`, data: null };
  }
};

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

    // ── Action: get advertiser accounts (with status) ──
    if (action === "get_advertisers") {
      const resp = await fetch(
        `${TIKTOK_API}/oauth2/advertiser/get/?app_id=${Deno.env.get("TIKTOK_APP_ID")}&secret=${Deno.env.get("TIKTOK_APP_SECRET")}&access_token=${bc.access_token}`,
        { headers }
      );
      const data = await safeJson(resp);
      console.log("TikTok advertisers response:", JSON.stringify(data).slice(0, 1000));

      const advList = data?.data?.list || [];
      const advIds = advList.map((a: any) => String(a.advertiser_id));

      // Fetch status for all advertisers in batches of 100
      const statusMap: Record<string, { status: string; name: string }> = {};
      for (let i = 0; i < advIds.length; i += 100) {
        const batch = advIds.slice(i, i + 100);
        try {
          const infoResp = await fetch(
            `${TIKTOK_API}/advertiser/info/?advertiser_ids=${JSON.stringify(batch)}&fields=["advertiser_id","name","status","description"]`,
            { headers }
          );
          const infoData = await safeJson(infoResp);
          if (infoData.code === 0 && infoData.data?.list) {
            for (const info of infoData.data.list) {
              statusMap[String(info.advertiser_id)] = {
                status: info.status || "STATUS_UNKNOWN",
                name: info.name || String(info.advertiser_id),
              };
            }
          }
        } catch (e) {
          console.error("Error fetching advertiser info batch:", e);
        }
      }

      const advertisers = advList.map((adv: any) => {
        const id = String(adv.advertiser_id);
        const info = statusMap[id];
        return {
          advertiser_id: id,
          advertiser_name: info?.name || adv.advertiser_name || id,
          status: info?.status || "STATUS_UNKNOWN",
        };
      });

      return new Response(JSON.stringify({ code: 0, data: { list: advertisers } }), {
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
        `${TIKTOK_API}/campaign/get/?advertiser_id=${advertiser_id}&page_size=200`,
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
      const errors: string[] = [];

      for (const camp of campaigns) {
        // Try upsert first, fall back to insert if needed
        const extId = String(camp.campaign_id);
        
        // Check if exists
        const { data: existing } = await supabase
          .from("campaigns")
          .select("id")
          .eq("campaign_external_id", extId)
          .maybeSingle();

        let upsertErr;
        if (existing) {
          const { error: err } = await supabase
            .from("campaigns")
            .update({ campaign_name: camp.campaign_name })
            .eq("id", existing.id);
          upsertErr = err;
        } else {
          const { error: err } = await supabase
            .from("campaigns")
            .insert({
              campaign_external_id: extId,
              campaign_name: camp.campaign_name,
              platform: "tiktok",
              client_id: bc.client_id,
            });
          upsertErr = err;
        }

        if (upsertErr) {
          console.error(`Campaign upsert error for ${extId}:`, upsertErr.message);
          errors.push(`${extId}: ${upsertErr.message}`);
        } else {
          synced++;
        }
      }

      console.log(`Sync result: ${synced}/${campaigns.length} synced. Errors: ${errors.length}`);

      return new Response(
        JSON.stringify({ success: true, total: campaigns.length, synced, errors }),
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

    // ── Action: update campaign status (enable/disable) ──
    if (action === "update_status") {
      const { advertiser_id, campaign_ids, operation_status } = body;
      if (!advertiser_id || !campaign_ids || !operation_status) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_ids, operation_status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resp = await fetch(`${TIKTOK_API}/campaign/status/update/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          advertiser_id,
          campaign_ids: campaign_ids.map(String),
          operation_status, // "ENABLE" | "DISABLE"
        }),
      });
      const data = await resp.json();
      console.log("TikTok update status response:", JSON.stringify(data).slice(0, 500));

      if (data.code !== 0) {
        return new Response(JSON.stringify({ error: data.message, code: data.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data: data.data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: update campaign budget ──
    if (action === "update_budget") {
      const { advertiser_id, campaign_id, budget } = body;
      if (!advertiser_id || !campaign_id || budget === undefined) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_id, budget required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const budgetPayload = {
        advertiser_id,
        campaign_id: String(campaign_id),
        budget: Number(budget),
      };

      const resp = await fetch(`${TIKTOK_API}/campaign/update/`, {
        method: "POST",
        headers,
        body: JSON.stringify(budgetPayload),
      });
      const data = await resp.json();
      console.log("TikTok update budget response:", JSON.stringify(data).slice(0, 500));

      if (data.code !== 0) {
        const isSmartLike = String(data?.message || "").toLowerCase().includes("smart");

        if (isSmartLike) {
          const fallbackEndpoints = [
            `${TIKTOK_API}/smart_plus/campaign/update/`,
            `${TIKTOK_API}/campaign/gmv_max/update/`,
          ];

          const fallbackErrors: Array<{ endpoint: string; code?: number; message?: string }> = [];

          for (const endpoint of fallbackEndpoints) {
            const fallbackResp = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify(budgetPayload),
            });
            const fallbackData = await fallbackResp.json();
            console.log(`TikTok fallback budget response (${endpoint}):`, JSON.stringify(fallbackData).slice(0, 500));

            if (fallbackData.code === 0) {
              return new Response(JSON.stringify({ success: true, mode: endpoint }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            fallbackErrors.push({ endpoint, code: fallbackData.code, message: fallbackData.message });
          }

          return new Response(JSON.stringify({
            error: "Não foi possível atualizar orçamento para campanha Smart/GMV Max.",
            code: data.code,
            details: fallbackErrors,
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ error: data.message, code: data.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: get campaign details (single or multi advertiser) ──
    if (action === "get_campaign_details") {
      const { advertiser_id, advertiser_ids } = body;
      const ids: string[] = advertiser_ids 
        ? advertiser_ids 
        : advertiser_id 
          ? [advertiser_id] 
          : [];
      
      if (!ids.length) {
        return new Response(JSON.stringify({ error: "advertiser_id or advertiser_ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allCampaigns: any[] = [];
      let errors = 0;

      // Process in parallel batches of 10
      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (advId: string) => {
            const resp = await fetch(
              `${TIKTOK_API}/campaign/get/?advertiser_id=${advId}&page_size=200&fields=["campaign_id","campaign_name","operation_status","budget","budget_mode","objective_type","secondary_status","create_time","modify_time"]`,
              { headers }
            );
            const data = await resp.json();
            if (data.code !== 0) return [];
            return (data.data?.list || []).map((c: any) => ({
              campaign_id: String(c.campaign_id),
              campaign_name: c.campaign_name,
              operation_status: c.operation_status,
              secondary_status: c.secondary_status,
              budget: c.budget,
              budget_mode: c.budget_mode,
              objective_type: c.objective_type,
              create_time: c.create_time,
              modify_time: c.modify_time,
              advertiser_id: advId,
            }));
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") allCampaigns.push(...r.value);
          else errors++;
        }
      }

      // Auto-upsert campaigns into DB so metrics/costs can be matched
      if (allCampaigns.length > 0) {
        const clientId = bc.client_id;
        const upsertBatch = allCampaigns.map((c: any) => ({
          campaign_external_id: c.campaign_id,
          campaign_name: c.campaign_name,
          platform: "tiktok",
          client_id: clientId,
        }));

        // Process in batches of 50
        for (let i = 0; i < upsertBatch.length; i += 50) {
          const batch = upsertBatch.slice(i, i + 50);
          for (const camp of batch) {
            const { data: existing } = await supabase
              .from("campaigns")
              .select("id")
              .eq("campaign_external_id", camp.campaign_external_id)
              .maybeSingle();

            if (existing) {
              await supabase.from("campaigns").update({ campaign_name: camp.campaign_name }).eq("id", existing.id);
            } else {
              await supabase.from("campaigns").insert(camp);
            }
          }
        }
        console.log(`Auto-upserted ${allCampaigns.length} campaigns into DB`);
      }

      console.log(`get_campaign_details: ${allCampaigns.length} campaigns from ${ids.length} accounts (${errors} errors)`);

      return new Response(JSON.stringify({ success: true, campaigns: allCampaigns, accounts: ids.length, errors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: duplicate campaign ──
    if (action === "duplicate_campaign") {
      const { advertiser_id, campaign_id, new_name, new_budget } = body;
      if (!advertiser_id || !campaign_id) {
        return new Response(JSON.stringify({ error: "advertiser_id, campaign_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Get original campaign details
      const origResp = await fetch(
        `${TIKTOK_API}/campaign/get/?advertiser_id=${advertiser_id}&page_size=1&filtering={"campaign_ids":["${campaign_id}"]}`,
        { headers }
      );
      const origData = await origResp.json();
      const orig = origData.data?.list?.[0];

      if (!orig) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Create new campaign with same settings
      const createBody: any = {
        advertiser_id,
        campaign_name: new_name || `Copy of ${orig.campaign_name}`,
        objective_type: orig.objective_type || "WEB_CONVERSIONS",
        budget_mode: orig.budget_mode || "BUDGET_MODE_DYNAMIC",
      };

      if (orig.budget && orig.budget > 0) {
        createBody.budget = new_budget || orig.budget;
      }

      const createResp = await fetch(`${TIKTOK_API}/campaign/create/`, {
        method: "POST",
        headers,
        body: JSON.stringify(createBody),
      });
      const createData = await createResp.json();
      console.log("TikTok duplicate campaign response:", JSON.stringify(createData).slice(0, 500));

      if (createData.code !== 0) {
        return new Response(JSON.stringify({ error: createData.message, code: createData.code }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save to local DB
      const newCampId = String(createData.data?.campaign_id);
      await supabase.from("campaigns").insert({
        campaign_external_id: newCampId,
        campaign_name: createBody.campaign_name,
        platform: "tiktok",
        client_id: bc.client_id,
      });

      return new Response(JSON.stringify({ success: true, new_campaign_id: newCampId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: bulk duplicate campaign to multiple accounts ──
    if (action === "bulk_duplicate") {
      const { source_advertiser_id, campaign_id, target_advertiser_ids, new_name, new_budget, copies = 1 } = body;
      if (!source_advertiser_id || !campaign_id || !target_advertiser_ids?.length) {
        return new Response(JSON.stringify({ error: "source_advertiser_id, campaign_id, target_advertiser_ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const numCopies = Math.min(Math.max(1, Number(copies) || 1), 50);

      // 1. Get original campaign details
      const origResp = await fetch(
        `${TIKTOK_API}/campaign/get/?advertiser_id=${source_advertiser_id}&page_size=1&filtering={"campaign_ids":["${campaign_id}"]}`,
        { headers }
      );
      const origData = await origResp.json();
      const orig = origData.data?.list?.[0];

      if (!orig) {
        return new Response(JSON.stringify({ error: "Campaign not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ advertiser_id: string; copy: number; success: boolean; campaign_id?: string; error?: string }> = [];

      for (const targetAdvId of target_advertiser_ids) {
        for (let copyNum = 1; copyNum <= numCopies; copyNum++) {
          try {
            const copyName = numCopies > 1
              ? `${new_name || orig.campaign_name} (${copyNum})`
              : (new_name || orig.campaign_name);

            const createBody: any = {
              advertiser_id: targetAdvId,
              campaign_name: copyName,
              objective_type: orig.objective_type || "WEB_CONVERSIONS",
              budget_mode: orig.budget_mode || "BUDGET_MODE_DYNAMIC",
            };
            if (orig.budget && orig.budget > 0) {
              createBody.budget = new_budget || orig.budget;
            }

            const createResp = await fetch(`${TIKTOK_API}/campaign/create/`, {
              method: "POST",
              headers,
              body: JSON.stringify(createBody),
            });
            const createData = await createResp.json();

            if (createData.code !== 0) {
              results.push({ advertiser_id: targetAdvId, copy: copyNum, success: false, error: createData.message });
            } else {
              const newId = String(createData.data?.campaign_id);
              await supabase.from("campaigns").insert({
                campaign_external_id: newId,
                campaign_name: copyName,
                platform: "tiktok",
                client_id: bc.client_id,
              });
              results.push({ advertiser_id: targetAdvId, copy: copyNum, success: true, campaign_id: newId });
            }
          } catch (e: any) {
            results.push({ advertiser_id: targetAdvId, copy: copyNum, success: false, error: e.message });
          }
        }
      }

      const succeeded = results.filter(r => r.success).length;
      const totalOps = target_advertiser_ids.length * numCopies;
      console.log(`Bulk duplicate: ${succeeded}/${totalOps} succeeded (${numCopies} copies × ${target_advertiser_ids.length} accounts)`);

      return new Response(JSON.stringify({ success: true, results, succeeded, total: totalOps, copies: numCopies }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
