import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map funnel events to funnel_state stages
const STAGE_MAP: Record<string, string> = {
  page_view: "visit",
  view_content: "view_content",
  click_buy: "add_to_cart",
  add_to_cart: "add_to_cart",
  checkout_start: "checkout",
  add_payment_info: "checkout",
  pix_generated: "pix_generated",
  purchase: "purchase",
};

const STAGE_PRIORITY: Record<string, number> = {
  visit: 1, view_content: 2, add_to_cart: 3, checkout: 4,
  pix_generated: 5, card_submitted: 5, purchase: 6,
};

// Dispatch events to client's active TikTok pixels (server-side)
async function dispatchToPixels(supabase: any, client_id: string, event_name: string, event_data: any) {
  if (!client_id) return;
  try {
    const { data: tiktokPixels } = await supabase
      .from("tiktok_pixels")
      .select("pixel_id, api_token")
      .eq("client_id", client_id)
      .eq("status", "active");

    for (const pixel of tiktokPixels ?? []) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${supabaseUrl}/functions/v1/tiktok-events-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          pixel_id: pixel.pixel_id,
          api_token: pixel.api_token,
          event_name,
          event_data,
        }),
      }).catch(console.error);
    }
  } catch (e) {
    console.error("[tracker-ingest] dispatchToPixels error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      event_name,
      visitor_id,
      session_id,
      click_id,
      page_url,
      referrer,
      device,
      user_agent,
      properties,
      is_health_check,
      timestamp,
    } = body;
    const site_id = body.site_id ?? "mesa-dobravel";

    if (!event_name || !visitor_id) {
      return new Response(JSON.stringify({ error: "Missing event_name or visitor_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Resolve site_id → client_id ──
    let client_id: string | null = null;
    if (site_id) {
      const { data: site } = await supabase
        .from("sites")
        .select("client_id")
        .eq("site_id", site_id)
        .eq("active", true)
        .single();
      client_id = site?.client_id ?? null;
    }

    // 1. Ensure visitor exists
    await supabase.from("visitors").upsert(
      { visitor_id, device: device || "Desktop", first_seen: timestamp || new Date().toISOString(), client_id, site_id: site_id || null },
      { onConflict: "visitor_id", ignoreDuplicates: true }
    );

    // 2. Ensure session exists
    if (session_id) {
      const utmSource = properties?.utm_source || null;
      const utmCampaign = properties?.utm_campaign || null;
      const utmMedium = properties?.utm_medium || null;
      const utmContent = properties?.utm_content || null;
      const utmTerm = properties?.utm_term || null;
      const ttclid = properties?.ttclid || null;

      await supabase.from("sessions").upsert(
        {
          session_id,
          visitor_id,
          device: device || "Desktop",
          referrer: referrer || "direct",
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          utm_medium: utmMedium,
          utm_content: utmContent,
          utm_term: utmTerm,
          ttclid,
          client_id,
          site_id: site_id || null,
        },
        { onConflict: "session_id", ignoreDuplicates: true }
      );
    }

    // 3. Build event_data
    const eventData: Record<string, unknown> = {
      ...(properties || {}),
      page_url,
      referrer,
      user_agent: (user_agent || "").slice(0, 200),
      site_id,
      click_id,
      is_health_check: is_health_check || false,
      source: "tracker.js",
    };

    // 4. Insert into events table
    const { error: evtErr } = await supabase.from("events").insert({
      visitor_id,
      session_id: session_id || null,
      event_name,
      event_data: eventData,
      source: properties?.utm_source || null,
      campaign: properties?.utm_campaign || null,
      value: properties?.value || 0,
      client_id,
      site_id: site_id || null,
    });

    if (evtErr) {
      console.error("[tracker-ingest] events insert error:", evtErr.message);
    }

    // 5. Update funnel_state (monotonic — only advance, never go back)
    const stage = STAGE_MAP[event_name];
    if (stage) {
      const priority = STAGE_PRIORITY[stage] || 0;
      try {
        const { data: current } = await supabase
          .from("funnel_state")
          .select("stage")
          .eq("visitor_id", visitor_id)
          .maybeSingle();

        const currentPriority = current ? (STAGE_PRIORITY[current.stage] || 0) : 0;
        if (priority > currentPriority) {
          await supabase.from("funnel_state").upsert(
            { visitor_id, stage, updated_at: new Date().toISOString(), client_id },
            { onConflict: "visitor_id" }
          );
        }
      } catch (e) {
        console.error("[tracker-ingest] funnel_state error:", e);
      }
    }

    // 6. Also write to user_events for backward compat & health check monitoring
    await supabase.from("user_events").insert({
      event_type: is_health_check ? "health_check_event" : event_name,
      client_id,
      event_data: {
        ...eventData,
        visitor_id,
        session_id,
        event_name,
        timestamp: timestamp || new Date().toISOString(),
      },
    });

    // 7. Dispatch to client's server-side pixels (async, non-blocking)
    if (client_id) {
      dispatchToPixels(supabase, client_id, event_name, eventData);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[tracker-ingest] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
