import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * TikTok Events API 2.0 — /v1.3/event/track/
 * Migrated from legacy /pixel/track/ to the recommended Events API 2.0 format.
 * 
 * Key differences from legacy:
 * - Uses event_source + event_source_id instead of pixel_code at top level
 * - data[] array wraps events
 * - event_time is Unix timestamp (seconds), not ISO string
 * - user object is flat (not nested under context)
 * - ttclid goes in user.ttclid (not context.ad.callback)
 * - phone field is "phone" (not "phone_number")
 * - external_id must be SHA-256 hashed
 * - page and ad are separate top-level objects in data item
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { event, event_id, timestamp, pixel_code, api_token, user, properties } = body;

    // Use per-pixel token from payload, fallback to env
    const accessToken = api_token || Deno.env.get("TIKTOK_EVENTS_API_TOKEN");
    if (!accessToken) {
      console.error("No TikTok API token provided");
      return new Response(
        JSON.stringify({ error: "TikTok token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pixel_code) {
      return new Response(
        JSON.stringify({ error: "pixel_code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Deduplication check ───────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const resolvedEventId = event_id || `${event}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    if (event_id) {
      const { data: existing } = await supabase
        .from("tiktok_event_dedup")
        .select("event_id")
        .eq("event_id", event_id)
        .eq("pixel_id", pixel_code)
        .maybeSingle();

      if (existing) {
        console.log(`[TikTok Dedup] Skipping duplicate: ${event_id} for pixel ${pixel_code}`);
        return new Response(
          JSON.stringify({ success: true, deduplicated: true, message: "Evento duplicado ignorado" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record as sent (fire-and-forget)
      supabase
        .from("tiktok_event_dedup")
        .insert({ event_id, pixel_id: pixel_code })
        .then(() => {});
    }

    // ── Capture real client IP ────────────────────────────────────────
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    // ── Convert timestamp to Unix seconds ─────────────────────────────
    let eventTimeSeconds: number;
    if (timestamp) {
      const ms = new Date(timestamp).getTime();
      eventTimeSeconds = Math.floor(ms / 1000);
    } else {
      eventTimeSeconds = Math.floor(Date.now() / 1000);
    }

    // ── Build Events API 2.0 payload ──────────────────────────────────
    // Per docs: https://business-api.tiktok.com/portal/docs?id=1771100865818625
    const eventData: Record<string, any> = {
      event,
      event_id: resolvedEventId,
      event_time: eventTimeSeconds,
      user: {
        // ttclid at user level (not context.ad.callback)
        ...(user?.ttclid ? { ttclid: user.ttclid } : {}),
        // email — already SHA-256 hashed by client
        ...(user?.email ? { email: user.email } : {}),
        // phone — field name is "phone" in API 2.0 (not "phone_number")
        ...(user?.phone_number ? { phone: user.phone_number } : {}),
        ...(user?.phone ? { phone: user.phone } : {}),
        // external_id — must be SHA-256 hashed
        ...(user?.external_id ? { external_id: user.external_id } : {}),
        // _ttp cookie
        ...(user?.ttp ? { ttp: user.ttp } : {}),
        // IP and User Agent (non-hashed)
        ...(clientIp || user?.ip ? { ip: clientIp || user.ip } : {}),
        ...(user?.user_agent ? { user_agent: user.user_agent } : {}),
        // Locale for better matching
        ...(user?.locale ? { locale: user.locale } : {}),
      },
      properties: {
        ...(properties || {}),
        currency: properties?.currency || "BRL",
        // Ensure value is always a clean number (no currency symbols, commas etc.)
        value: (() => {
          const raw = properties?.value;
          if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
          if (typeof raw === "string") {
            const cleaned = raw.replace(/[^\d.\-]/g, "").replace(",", ".");
            const n = parseFloat(cleaned);
            return Number.isFinite(n) ? n : 0;
          }
          return 0;
        })(),
      },
      page: {
        ...(user?.page_url ? { url: user.page_url } : {}),
        ...(user?.referrer ? { referrer: user.referrer } : {}),
      },
    };

    // Add ad object if ttclid present
    if (user?.ttclid) {
      eventData.ad = { callback: user.ttclid };
    }

    // Top-level Events API 2.0 payload
    const tiktokPayload = {
      event_source: "web",
      event_source_id: pixel_code,
      data: [eventData],
    };

    console.log(`[TikTok CAPI 2.0] Sending to /event/track/ (${pixel_code}):`, JSON.stringify(tiktokPayload));

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(tiktokPayload),
      }
    );

    const resText = await response.text();
    console.log(`[TikTok CAPI 2.0] Response (${pixel_code}, ${response.status}):`, resText);

    let resData;
    try {
      resData = JSON.parse(resText);
    } catch {
      resData = { raw: resText };
    }

    // ── Cleanup old dedup entries (older than 48h) ────────────────────
    supabase
      .from("tiktok_event_dedup")
      .delete()
      .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .then(() => {});

    return new Response(
      JSON.stringify({ success: response.ok, tiktok_response: resData }),
      {
        status: response.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[TikTok CAPI 2.0] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
