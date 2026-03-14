import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const authCode = url.searchParams.get("auth_code");
    const state = url.searchParams.get("state");

    if (!authCode || !state) {
      return new Response(
        `<html><body><h2>Erro: Parâmetros ausentes</h2><p>auth_code ou state não encontrados.</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 400 }
      );
    }

    // Decode state (contains client_id and bc_id)
    let stateData: { client_id: string; bc_id: string };
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(
        `<html><body><h2>Erro: State inválido</h2></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 400 }
      );
    }

    const appId = Deno.env.get("TIKTOK_APP_ID");
    const appSecret = Deno.env.get("TIKTOK_APP_SECRET");

    if (!appId || !appSecret) {
      return new Response(
        `<html><body><h2>Erro: Credenciais do TikTok não configuradas</h2></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 500 }
      );
    }

    // Exchange auth_code for access_token
    const tokenResponse = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        auth_code: authCode,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("TikTok token response:", JSON.stringify(tokenData));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log the API call
    await supabase.from("api_logs").insert({
      client_id: stateData.client_id,
      endpoint: "/oauth2/access_token",
      method: "POST",
      status_code: tokenData.code || 0,
      request_payload: { auth_code: "***redacted***" },
      response_payload: { ...tokenData, data: { ...tokenData.data, access_token: "***redacted***" } },
    });

    if (tokenData.code !== 0 || !tokenData.data?.access_token) {
      return new Response(
        `<html><body><h2>Erro na autenticação TikTok</h2><p>${tokenData.message || "Falha ao obter token"}</p></body></html>`,
        { headers: { ...corsHeaders, "Content-Type": "text/html" }, status: 400 }
      );
    }

    const { access_token, advertiser_ids } = tokenData.data;

    // Update business_centers with token info
    await supabase.from("business_centers").update({
      access_token: access_token,
      token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // TikTok tokens ~24h
      updated_at: new Date().toISOString(),
    }).eq("id", stateData.bc_id);

    // Redirect back to admin with success
    const adminUrl = Deno.env.get("SITE_URL") || "https://mesa-dobravel-shop.lovable.app";
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: `${adminUrl}/admin?oauth=success&bc_id=${stateData.bc_id}`,
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
