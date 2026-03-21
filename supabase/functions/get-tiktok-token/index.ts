import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://hawklaunch.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("HAWKLAUNCH_API_KEY");

    if (expectedKey && apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ code: 401, message: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get latest token
    const { data: token, error } = await supabase
      .from("tiktok_tokens")
      .select("access_token, advertiser_id, client_id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !token) {
      return new Response(
        JSON.stringify({ code: 404, message: "No token found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Get all ad accounts for advertiser_ids
    const { data: adAccounts } = await supabase
      .from("tiktok_ad_accounts")
      .select("advertiser_id")
      .eq("client_id", token.client_id);

    // Get all business centers for bc_ids
    const { data: bcs } = await supabase
      .from("business_centers")
      .select("bc_external_id")
      .eq("client_id", token.client_id);

    const advertiser_ids = adAccounts?.map((a) => a.advertiser_id) || 
      (token.advertiser_id ? [token.advertiser_id] : []);
    const bc_ids = bcs?.map((b) => b.bc_external_id).filter(Boolean) || [];

    return new Response(
      JSON.stringify({
        code: 0,
        data: {
          access_token: token.access_token,
          advertiser_ids,
          bc_ids,
        },
      }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ code: 500, message: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
