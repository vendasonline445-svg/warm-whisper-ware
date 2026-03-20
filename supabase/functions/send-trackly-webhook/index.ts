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
    const {
      webhook_url,
      order_id,
      nome,
      email,
      telefone,
      rua,
      numero,
      complemento,
      bairro,
      cep,
      cidade,
      estado,
      produto,
      quantidade,
      preco_centavos,
    } = body;

    const targetUrl = webhook_url || "https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout";

    // Formato exato esperado pela Trackly
    const payload = {
      status: "paid",
      orderId: order_id || "",
      customer: {
        name: nome || "",
        email: email || "",
        phone: telefone || "",
      },
      address: {
        street: rua || "",
        number: numero || "",
        complement: complemento || "",
        neighborhood: bairro || "",
        zipcode: cep || "",
        city: cidade || "",
        state: estado || "",
      },
      products: [
        {
          name: produto || "",
          quantity: parseInt(quantidade) || 1,
          priceInCents: parseInt(preco_centavos) || 0,
        },
      ],
    };

    console.log("[Trackly] Sending webhook to:", targetUrl);
    console.log("[Trackly] Payload:", JSON.stringify(payload));

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log(`[Trackly] Response (${res.status}):`, text);

    return new Response(
      JSON.stringify({
        status_http: res.status,
        response_text: text,
        payload_enviado: JSON.stringify(payload, null, 2),
        webhook_url: targetUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[Trackly] Error:", error);
    return new Response(
      JSON.stringify({ status_http: 0, response_text: (error as Error).message, payload_enviado: "", webhook_url: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
