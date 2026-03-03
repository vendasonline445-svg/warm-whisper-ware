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
      platform: "SkalePay",
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
        document: customer?.cpf || customer?.document?.number || "",
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

    const secretKey = Deno.env.get("SKALEPAY_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "SkalePay secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authToken = btoa(`${secretKey}:x`);

    // Parse tracking params from metadata for UTMify
    let trackingParams: Record<string, string | null> = {};
    try {
      const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      trackingParams = meta?.tracking || {};
    } catch (_) {}

    const body: Record<string, unknown> = {
      amount,
      paymentMethod: "pix",
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: {
          type: "cpf",
          number: customer.cpf,
        },
        address: {
          street: shipping?.address?.street || "",
          streetNumber: shipping?.address?.streetNumber || "",
          neighborhood: shipping?.address?.neighborhood || "",
          city: shipping?.address?.city || "",
          state: shipping?.address?.state || "",
          zipCode: shipping?.address?.zipcode || shipping?.address?.zipCode || "",
          country: "br",
        },
      },
      items,
      pix: {
        expiresInDays: 1,
      },
      metadata: metadata || "",
    };

    if (shipping) {
      body.shipping = {
        name: shipping.name,
        fee: shipping.fee,
        address: {
          street: shipping.address?.street || "",
          streetNumber: shipping.address?.streetNumber || "",
          neighborhood: shipping.address?.neighborhood || "",
          city: shipping.address?.city || "",
          state: shipping.address?.state || "",
          zipCode: shipping.address?.zipcode || shipping.address?.zipCode || "",
          country: "br",
        },
      };
    }

    console.log("Creating SkalePay PIX transaction:", JSON.stringify(body));

    const response = await fetch("https://api.conta.skalepay.com.br/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("SkalePay response status:", response.status);
    console.log("SkalePay response:", JSON.stringify(data));

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "SkalePay API error", details: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fire UTMify waiting_payment event using the SkalePay order ID + original checkout data
    const orderId = data.id || data.tid || Date.now();
    sendUtmifyEvent(orderId, customer, items, amount, trackingParams, "waiting_payment");

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
