const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    const eventData = {
      event,
      event_id,
      event_time: Math.floor(new Date(timestamp || new Date().toISOString()).getTime() / 1000),
      user: {
        email: user?.email || undefined,
        phone_number: user?.phone_number || undefined,
        external_id: user?.external_id || undefined,
        ip: clientIp || undefined,
        user_agent: user?.user_agent || undefined,
        ttclid: user?.ttclid || undefined,
      },
      page: {
        url: user?.page_url || undefined,
      },
      properties: properties || {},
    };

    eventData.user = Object.fromEntries(
      Object.entries(eventData.user).filter(([_, v]) => v)
    ) as any;

    const tiktokPayload = {
      event_source: "web",
      event_source_id: pixel_code,
      data: [eventData],
    };

    console.log(`Sending to TikTok (${pixel_code}):`, JSON.stringify(tiktokPayload));

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
    console.log(`TikTok response (${pixel_code}, ${response.status}):`, resText);

    let resData;
    try {
      resData = JSON.parse(resText);
    } catch {
      resData = { raw: resText };
    }

    return new Response(
      JSON.stringify({ success: response.ok, tiktok_response: resData }),
      {
        status: response.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("TikTok Events API error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
