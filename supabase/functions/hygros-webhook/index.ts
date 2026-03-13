const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendTracklyWebhook(supabaseUrl: string, supabaseKey: string, lead: any, data: any) {
  // Check if webhook is enabled
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/tracking_settings?select=webhook_url,webhook_enabled&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const settingsArr = await settingsRes.json();
  const settings = Array.isArray(settingsArr) ? settingsArr[0] : null;

  if (settings?.webhook_enabled === false) {
    console.log("[Trackly] Webhook disabled in settings, skipping");
    return;
  }

  const webhookUrl = settings?.webhook_url ||
    "https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout";

  const productName = (data.items && data.items[0]?.title) || "Mesa Portátil Dobrável";
  const productQty = (data.items && data.items[0]?.quantity) || lead.quantity || 1;
  const productPrice = (data.items && data.items[0]?.unitPrice) || lead.total_amount || 0;

  const payload = {
    status: "paid",
    orderId: lead.transaction_id || String(data.id),
    customer: {
      name: lead.name || data.customer?.name || "",
      email: lead.email || data.customer?.email || "",
      phone: lead.phone || data.customer?.phone || "",
    },
    address: {
      street: lead.endereco || "",
      number: lead.numero || "",
      complement: lead.complemento || "",
      neighborhood: lead.bairro || "",
      zipcode: lead.cep || "",
      city: lead.cidade || "",
      state: lead.uf || "",
    },
    products: [
      {
        name: productName,
        quantity: parseInt(productQty) || 1,
        priceInCents: parseInt(productPrice) || 0,
      },
    ],
  };

  console.log("[Trackly] payment detected");
  console.log("[Trackly] Sending webhook:", JSON.stringify(payload));

  const tracklyRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const tracklyText = await tracklyRes.text();
  console.log(`[Trackly] webhook response received (${tracklyRes.status}):`, tracklyText);
  console.log("[Trackly] webhook sent");

  // Log webhook call
  await fetch(`${supabaseUrl}/rest/v1/tracking_webhook_logs`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      order_id: lead.id,
      webhook_url: webhookUrl,
      status: tracklyRes.ok ? "success" : "error",
      http_status: tracklyRes.status,
      response: tracklyText.slice(0, 500),
      payload_sent: JSON.stringify(payload),
    }),
  });

  // Mark as sent
  await fetch(`${supabaseUrl}/rest/v1/checkout_leads?id=eq.${lead.id}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ tracking_sent: true, status: "approved" }),
  });

  // Save to order_tracking
  await fetch(`${supabaseUrl}/rest/v1/order_tracking`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      order_id: lead.id,
      customer_name: payload.customer.name,
      customer_email: payload.customer.email,
      product_name: productName,
      zipcode: lead.cep || "",
      status: "enviado",
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Hygros webhook received:", JSON.stringify(payload));

    const data = payload.data || payload;
    const status = data.status;

    if (status !== "paid") {
      console.log(`Status "${status}" ignored, not a paid event`);
      return new Response(JSON.stringify({ message: "Status ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- UTMify ---
    const utmifyToken = Deno.env.get("UTMIFY_API_TOKEN");
    if (!utmifyToken) {
      console.log("UTMIFY_API_TOKEN not configured");
    } else {
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
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString().replace("T", " ").slice(0, 19) : now,
        approvedDate: data.paidAt ? new Date(data.paidAt).toISOString().replace("T", " ").slice(0, 19) : now,
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
        headers: { "Content-Type": "application/json", "x-api-token": utmifyToken },
        body: JSON.stringify(utmifyData),
      });

      const resText = await res.text();
      console.log(`UTMify response (${res.status}):`, resText);
    }

    // --- Trackly Webhook ---
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const transactionId = String(data.id);
      const findRes = await fetch(
        `${supabaseUrl}/rest/v1/checkout_leads?transaction_id=eq.${transactionId}&select=*`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const leads = await findRes.json();
      const lead = Array.isArray(leads) ? leads[0] : null;

      if (lead && !lead.tracking_sent) {
        await sendTracklyWebhook(supabaseUrl, supabaseKey, lead, data);
      } else if (lead?.tracking_sent) {
        console.log("[Trackly] Already sent for this order, skipping");
      } else {
        console.log("[Trackly] No matching lead found for transaction:", transactionId);
      }
    } catch (tracklyErr) {
      console.error("[Trackly] Error sending webhook:", tracklyErr);
    }

    return new Response(JSON.stringify({ success: true }), {
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
