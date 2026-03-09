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
    const accessToken = Deno.env.get("TIKTOK_EVENTS_API_TOKEN");
    if (!accessToken) {
      console.error("TIKTOK_EVENTS_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "TikTok token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { event, event_id, timestamp, pixel_code, user, properties } = body;

    // Get client IP from headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    const tiktokPayload = {
      pixel_code: pixel_code || "D6JQATBC77UBUNE442EG",
      event,
      event_id,
      timestamp: timestamp || new Date().toISOString(),
      context: {
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
      },
      properties: properties || {},
    };

    // Clean undefined values from user context
    const cleanUser = Object.fromEntries(
      Object.entries(tiktokPayload.context.user).filter(([_, v]) => v)
    );
    tiktokPayload.context.user = cleanUser as any;

    console.log("Sending to TikTok Events API:", JSON.stringify(tiktokPayload));

    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify({
          data: [tiktokPayload],
        }),
      }
    );

    const resText = await response.text();
    console.log(`TikTok Events API response (${response.status}):`, resText);

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
