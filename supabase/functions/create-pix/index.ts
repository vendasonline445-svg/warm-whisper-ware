const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendUtmifyEvent(
  orderId: string,
  customer: any,
  items: any[],
  amount: number,
  trackingParams: Record<string, string | null>,
  status: "waiting_payment" | "paid",
  paidAt?: string | null,
) {
  const utmifyToken = Deno.env.get("UTMIFY_API_TOKEN");
  if (!utmifyToken) {
    console.log("UTMIFY_API_TOKEN not configured, skipping UTMify event");
    return;
  }

  try {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const utmifyData: any = {
      orderId: String(orderId),
      platform: "Hygros",
      paymentMethod: "pix",
      status: status,
      createdAt: now,
      approvedDate: status === "paid" && paidAt
        ? new Date(paidAt).toISOString().replace("T", " ").slice(0, 19)
        : null,
      refundedAt: null,
      customer: {
        name: customer?.name || "",
        email: customer?.email || "",
        phone: customer?.phone || null,
        document: customer?.cpf || customer?.document || "",
        country: "BR",
        ip: "",
      },
      products: (items || []).map((item: any) => ({
        id: item.id || item.externalRef || String(orderId),
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

    console.log(`Sending UTMify ${status} event:`, JSON.stringify(utmifyData));

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
    const { customer, items, amount, shipping, metadata } = await req.json();

    if (!customer || !items || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer, items, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretKey = Deno.env.get("HYGROS_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Hygros secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse tracking params from metadata for UTMify
    let trackingParams: Record<string, string | null> = {};
    let parsedMeta: any = {};
    try {
      parsedMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      trackingParams = parsedMeta?.tracking || {};
    } catch (_) {}

    // Build webhook URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const postbackUrl = `${supabaseUrl}/functions/v1/hygros-webhook`;

    // Hygros API payload
    const body = {
      amount,
      paymentMethod: "PIX",
      customer: {
        name: customer.name,
        email: customer.email,
        phone: (customer.phone || "").replace(/\D/g, ""),
        document: (customer.cpf || "").replace(/\D/g, ""),
      },
      shipping: {
        street: shipping?.address?.street || "",
        streetNumber: shipping?.address?.streetNumber || "",
        complement: shipping?.address?.complement || "",
        neighborhood: shipping?.address?.neighborhood || "",
        city: shipping?.address?.city || "",
        state: shipping?.address?.state || "",
        zipCode: shipping?.address?.zipcode || shipping?.address?.zipCode || "",
      },
      items: (items || []).map((item: any) => ({
        title: item.title || "",
        unitPrice: item.unitPrice || 0,
        quantity: item.quantity || 1,
        externalRef: item.id || item.externalRef || "",
      })),
      pix: {
        expiresInMinutes: 30,
      },
      postbackUrl,
      metadata: parsedMeta || {},
    };

    console.log("Creating Hygros PIX transaction:", JSON.stringify(body));

    const companyId = Deno.env.get("HYGROS_COMPANY_ID") || "";
    
    // Hygros uses Basic Auth: base64(secretKey:companyId)
    const credentials = btoa(`${secretKey}:${companyId}`);
    
    const response = await fetch("https://api.gw.hygrospay.com.br/functions/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${credentials}`,
      },
      body: JSON.stringify(body),
    });

    const resText = await response.text();
    console.log("Hygros response status:", response.status);
    console.log("Hygros response body:", resText);

    let data;
    try {
      data = JSON.parse(resText);
    } catch (_) {
      return new Response(
        JSON.stringify({ error: "Invalid response from payment gateway", details: resText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Hygros API error", details: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UTMify DISABLED — FunnelIQ Tracking Hub is now the single source of events
    // sendUtmifyEvent(orderId, customer, items, amount, trackingParams, "waiting_payment");
    const orderId = data.id || Date.now();

    // Write to checkout_leads so dashboard picks it up
    try {
      await fetch(`${supabaseUrl}/rest/v1/checkout_leads`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          payment_method: "pix",
          name: customer?.name || "",
          email: customer?.email || "",
          phone: customer?.phone || "",
          cpf: customer?.cpf || customer?.document || "",
          cep: shipping?.address?.zipCode || shipping?.address?.zipcode || "",
          endereco: shipping?.address?.street || "",
          numero: shipping?.address?.streetNumber || "",
          complemento: shipping?.address?.complement || "",
          bairro: shipping?.address?.neighborhood || "",
          cidade: shipping?.address?.city || "",
          uf: shipping?.address?.state || "",
          color: parsedMeta?.color || "",
          size: parsedMeta?.size || "",
          quantity: items?.[0]?.quantity || 1,
          total_amount: amount,
          shipping_type: shipping?.fee > 0 ? "express" : "padrao",
          shipping_cost: shipping?.fee || 0,
          status: "pending",
          transaction_id: String(orderId),
          metadata: parsedMeta,
        }),
      });
      console.log("Checkout lead saved for PIX");
    } catch (e) {
      console.error("Error saving checkout lead:", e);
    }

    // Dual-write: create order in new orders table
    const visitorId = parsedMeta?.visitor_id || parsedMeta?.tracking?.visitor_id || "unknown";
    try {
      await fetch(`${supabaseUrl}/rest/v1/orders`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          visitor_id: visitorId,
          payment_method: "pix",
          status: "pix_generated",
          value: amount,
          transaction_id: String(orderId),
        }),
      });

      // Write event to new events table
      await fetch(`${supabaseUrl}/rest/v1/events`, {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          visitor_id: visitorId,
          session_id: parsedMeta?.session_id || null,
          event_name: "pix_generated",
          value: amount,
          source: trackingParams.utm_source || null,
          campaign: trackingParams.utm_campaign || null,
          event_data: { transaction_id: String(orderId), customer_email: customer.email },
        }),
      });
    } catch (e) {
      console.error("Error writing to new tables:", e);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating PIX:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
