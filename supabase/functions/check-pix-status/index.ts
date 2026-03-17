const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendTracklyForPaidOrder(transactionId: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Find the lead
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

  if (!lead || lead.tracking_sent) {
    console.log("[Trackly]", lead ? "Already sent, skipping" : "No lead found");
    return;
  }

  // Check webhook settings
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/tracking_settings?select=webhook_url,webhook_enabled&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );
  const settingsArr = await settingsRes.json();
  const settings = Array.isArray(settingsArr) ? settingsArr[0] : null;

  if (settings?.webhook_enabled === false) {
    console.log("[Trackly] Webhook disabled");
    return;
  }

  const webhookUrl = settings?.webhook_url ||
    "https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout";

  const payload = {
    status: "paid",
    orderId: lead.transaction_id || lead.id,
    customer: {
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
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
        name: "Mesa Portátil Dobrável",
        quantity: lead.quantity || 1,
        priceInCents: lead.total_amount || 0,
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

  // Log
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
      product_name: "Mesa Portátil Dobrável",
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
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secretKey = Deno.env.get("HYGROS_SECRET_KEY");
    const companyId = Deno.env.get("HYGROS_COMPANY_ID") || "";

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Hygros secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(`${secretKey}:${companyId}`);

    const response = await fetch(
      `https://api.gw.hygrospay.com.br/functions/v1/transactions/${transactionId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const data = await response.json();
    console.log(`Transaction ${transactionId} status:`, data.status);

    const PAID_STATUSES = new Set(["paid", "approved", "approved_payment", "succeeded", "success"]);
    const paid = PAID_STATUSES.has(data.status);

    // When paid, trigger Trackly webhook automatically
    if (paid) {
      try {
        await sendTracklyForPaidOrder(transactionId);
      } catch (err) {
        console.error("[Trackly] Error:", err);
      }
    }

    return new Response(
      JSON.stringify({ status: data.status, paid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Check status error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
