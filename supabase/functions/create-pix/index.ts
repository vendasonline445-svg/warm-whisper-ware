const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendUtmifyEvent(skalePayData: any, trackingParams: any, status: "waiting_payment" | "paid") {
  const utmifyToken = Deno.env.get("UTMIFY_API_TOKEN");
  if (!utmifyToken) {
    console.log("UTMIFY_API_TOKEN not configured, skipping UTMify event");
    return;
  }

  try {
    const metadata = typeof skalePayData.metadata === "string" 
      ? JSON.parse(skalePayData.metadata) 
      : skalePayData.metadata || {};
    
    const tracking = metadata?.tracking || trackingParams || {};

    const utmifyData: any = {
      orderId: String(skalePayData.id),
      platform: "SkalePay",
      paymentMethod: "pix",
      status: status,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      approvedDate: status === "paid" && skalePayData.paidAt 
        ? new Date(skalePayData.paidAt).toISOString().replace("T", " ").slice(0, 19) 
        : null,
      refundedAt: null,
      customer: {
        name: skalePayData.customer?.name || "",
        email: skalePayData.customer?.email || "",
        phone: skalePayData.customer?.phone || null,
        document: skalePayData.customer?.document?.number || "",
        country: "BR",
        ip: null,
      },
      products: (skalePayData.items || []).map((item: any) => ({
        id: item.externalRef || item.id || String(skalePayData.id),
        name: item.title || "",
        planId: null,
        planName: null,
        quantity: item.quantity || 1,
        priceInCents: item.unitPrice || 0,
      })),
      trackingParameters: {
        src: tracking.src || null,
        sck: tracking.sck || null,
        utm_source: tracking.utm_source || null,
        utm_campaign: tracking.utm_campaign || null,
        utm_medium: tracking.utm_medium || null,
        utm_content: tracking.utm_content || null,
        utm_term: tracking.utm_term || null,
        xcod: tracking.xcod || null,
        fbclid: tracking.fbclid || null,
        gclid: tracking.gclid || null,
        ttclid: tracking.ttclid || null,
      },
      commission: {
        totalPriceInCents: skalePayData.amount || 0,
        gatewayFeeInCents: skalePayData.fee?.fixedAmount || 0,
        userCommissionInCents: skalePayData.fee?.netAmount || skalePayData.amount || 0,
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
    let trackingParams = {};
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

    // Fire UTMify waiting_payment event (non-blocking)
    sendUtmifyEvent(data, trackingParams, "waiting_payment");

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
