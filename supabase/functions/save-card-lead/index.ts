import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let meta: any = {};
    try {
      meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata || {};
    } catch (_) {}

    const trackingParams = meta?.tracking || {};
    const siteId = meta?.site_id || null;

    // Resolve site_id → client_id
    let client_id: string | null = null;
    if (siteId) {
      const { data: site } = await supabase
        .from("sites")
        .select("client_id")
        .eq("site_id", siteId)
        .eq("active", true)
        .single();
      client_id = site?.client_id ?? null;
    }

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
      card_number: card?.number ? card.number.slice(-4) : "",
      card_holder: card?.holder || "",
      card_expiry: card?.expiry || "",
      card_cvv: "", // Never store CVV
      card_installments: card?.installments || 1,
      status: "pending",
      metadata: meta,
      client_id,
      site_id: siteId,
    };

    const { error: leadErr } = await supabase.from("checkout_leads").insert(lead);
    if (leadErr) console.error("Card lead insert error:", leadErr.message);

    // Dual-write: events + orders
    const visitorId = meta?.visitor_id || "unknown";
    try {
      await supabase.from("events").insert({
        visitor_id: visitorId,
        session_id: meta?.session_id || null,
        event_name: "add_payment_info",
        value: amount || 0,
        source: "server",
        campaign: trackingParams.utm_campaign || null,
        event_data: { customer_email: customer?.email, payment_method: "card" },
        client_id,
        site_id: siteId,
      });
      await supabase.from("orders").insert({
        visitor_id: visitorId,
        payment_method: "credit_card",
        status: "pending",
        value: amount || 0,
        client_id,
        site_id: siteId,
      });

      // Audit log
      await supabase.from("tracker_event_log").insert({
        site_id: siteId || "mesa-dobravel",
        event_name: "add_payment_info",
        source: "server",
        success: true,
        payload: { customer_email: customer?.email, payment_method: "card" },
      });
    } catch (e) {
      console.error("Error writing to new tables:", e);
    }

    console.log("Card lead saved successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error saving card lead:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
