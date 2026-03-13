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
    const { nome, email, cep, endereco, produto, webhook_url } = body;

    const targetUrl = webhook_url || "https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout";

    const params = new URLSearchParams({
      status: "approved",
      nome: nome || "",
      email: email || "",
      cep: cep || "",
      endereco: endereco || "",
      produto: produto || "",
      source: "vegacheckout",
    });

    console.log("[Trackly] Sending webhook to:", targetUrl);
    console.log("[Trackly] Payload:", params.toString());

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const text = await res.text();
    console.log(`[Trackly] Response (${res.status}):`, text);

    return new Response(
      JSON.stringify({
        status_http: res.status,
        response_text: text,
        payload_enviado: params.toString(),
        webhook_url: targetUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Trackly] Error:", error);
    return new Response(
      JSON.stringify({ status_http: 0, response_text: error.message, payload_enviado: "", webhook_url: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
