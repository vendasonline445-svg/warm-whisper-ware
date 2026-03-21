import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const TIKTOK_API = "https://business-api.tiktok.com/open_api/v1.3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const authCode = url.searchParams.get("auth_code") || url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!authCode) {
      return new Response(
        `<html><body><h2>Erro: auth_code não recebido</h2></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 400 }
      );
    }

    // Decode state if present
    let stateData: { client_id?: string; bc_id?: string } = {};
    if (state) {
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        // state might not be base64 encoded
      }
    }

    const appId = Deno.env.get("TIKTOK_APP_ID") || "7617705058569814033";
    const appSecret = Deno.env.get("TIKTOK_APP_SECRET");

    if (!appSecret) {
      return new Response(
        `<html><body><h2>Erro: TIKTOK_APP_SECRET não configurado</h2></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 500 }
      );
    }

    // Exchange auth_code for access_token
    const tokenRes = await fetch(`${TIKTOK_API}/oauth2/access_token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        auth_code: authCode,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("TikTok token response:", JSON.stringify(tokenData));

    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      return new Response(
        `<html><body><h2>Erro TikTok: ${tokenData.message || "Falha ao obter token"}</h2></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 400 }
      );
    }

    const { access_token, advertiser_ids } = tokenData.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const firstAdvertiserId = advertiser_ids?.[0] || null;
    const clientId = stateData.client_id || null;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Use INSERT when client_id is null, UPSERT when it has a value
    if (clientId) {
      await supabase.from("tiktok_tokens").upsert({
        client_id: clientId,
        access_token,
        advertiser_id: firstAdvertiserId,
        expires_at: expiresAt,
        updated_at: now,
      }, { onConflict: "client_id" });
    } else {
      // Simple INSERT — always saves the token
      await supabase.from("tiktok_tokens").insert({
        client_id: null,
        access_token,
        advertiser_id: firstAdvertiserId,
        expires_at: expiresAt,
        updated_at: now,
      });
    }

    // Also update business_centers if bc_id present
    if (stateData.bc_id) {
      await supabase.from("business_centers").update({
        access_token,
        token_expires_at: expiresAt,
        updated_at: now,
      }).eq("id", stateData.bc_id);
    }

    // Log the API call
    await supabase.from("api_logs").insert({
      client_id: clientId,
      endpoint: "/oauth2/access_token",
      method: "POST",
      status_code: tokenData.code || 0,
      request_payload: { auth_code: "***redacted***" },
      response_payload: { code: tokenData.code, message: tokenData.message, advertiser_ids },
    });

    // Redirect to HawkLaunch
    const redirectUrl = Deno.env.get("HAWKLAUNCH_URL") || "https://hawklaunch.vercel.app";
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${redirectUrl}/?oauth=success`,
      },
    });
  } catch (error: unknown) {
    console.error("OAuth callback error:", error);
    return new Response(
      `<html><body><h2>Erro interno</h2><p>${(error as Error).message}</p></body></html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 500 }
    );
  }
});
