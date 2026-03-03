const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Hygros webhook received:", JSON.stringify(payload));

    // Hygros webhook structure: { id, type, objectId, data: { ... } }
    const data = payload.data || payload;
    const status = data.status;

    // Only process paid events
    if (status !== "paid") {
      console.log(`Status "${status}" ignored, not a paid event`);
      return new Response(JSON.stringify({ message: "Status ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const utmifyToken = Deno.env.get("UTMIFY_API_TOKEN");
    if (!utmifyToken) {
      console.log("UTMIFY_API_TOKEN not configured");
      return new Response(JSON.stringify({ message: "No UTMify token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse tracking from metadata
    let tracking: Record<string, string | null> = {};
    try {
      const meta = typeof data.metadata === "string" ? JSON.parse(data.metadata) : data.metadata;
      tracking = meta?.tracking || {};
    } catch (_) {}

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    const utmifyData = {
      orderId: String(data.id),
      platform: "Hygros",
      paymentMethod: data.paymentMethod?.toLowerCase() || "pix",
      status: "paid",
      createdAt: data.createdAt
        ? new Date(data.createdAt).toISOString().replace("T", " ").slice(0, 19)
        : now,
      approvedDate: data.paidAt
        ? new Date(data.paidAt).toISOString().replace("T", " ").slice(0, 19)
        : now,
      refundedAt: null,
      customer: {
        name: data.customer?.name || "",
        email: data.customer?.email || "",
        phone: data.customer?.phone || null,
        document: data.customer?.document || "",
        country: "BR",
        ip: "",
      },
      products: (data.items || []).map((item: any) => ({
        id: item.externalRef || String(data.id),
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
        totalPriceInCents: data.amount || 0,
        gatewayFeeInCents: data.fee?.estimatedFee || 0,
        userCommissionInCents: data.fee?.netAmount || data.amount || 0,
      },
      isTest: false,
    };

    console.log("Sending UTMify paid event:", JSON.stringify(utmifyData));

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

    return new Response(JSON.stringify({ success: true, utmifyStatus: res.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
