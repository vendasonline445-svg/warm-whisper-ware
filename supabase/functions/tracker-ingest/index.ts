import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      site_id,
      event_name,
      visitor_id,
      session_id,
      page_url,
      referrer,
      device,
      user_agent,
      properties,
      is_health_check,
    } = body;

    if (!event_name || !visitor_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ensure visitor exists
    await supabase.from("visitors").upsert(
      { visitor_id, device: device || "Desktop", first_seen: new Date().toISOString() },
      { onConflict: "visitor_id", ignoreDuplicates: true }
    );

    // Ensure session exists
    if (session_id) {
      await supabase.from("sessions").upsert(
        {
          session_id,
          visitor_id,
          device: device || "Desktop",
          referrer: referrer || "direct",
          utm_source: properties?.utm_source || null,
          utm_campaign: properties?.utm_campaign || null,
          utm_medium: properties?.utm_medium || null,
          utm_content: properties?.utm_content || null,
          utm_term: properties?.utm_term || null,
        },
        { onConflict: "session_id", ignoreDuplicates: true }
      );
    }

    // Insert event
    const eventData = {
      ...(properties || {}),
      page_url,
      referrer,
      user_agent,
      site_id,
      is_health_check: is_health_check || false,
    };

    await supabase.from("events").insert({
      visitor_id,
      session_id: session_id || null,
      event_name,
      event_data: eventData,
      source: properties?.utm_source || null,
      campaign: properties?.utm_campaign || null,
    });

    // If health check, also store in a way the tester can query
    if (is_health_check && site_id) {
      await supabase.from("user_events").insert({
        event_type: "health_check_event",
        event_data: {
          site_id,
          event_name,
          visitor_id,
          session_id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
