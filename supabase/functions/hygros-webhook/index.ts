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

    // --- UTMify DISABLED — FunnelIQ Tracking Hub is now the single source of events ---
    // UTMify event dispatch removed to prevent duplicate conversions
    console.log("UTMify event dispatch DISABLED — handled by FunnelIQ Tracking Hub");

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

      // Record payment_confirmed event in user_events for funnel tracking
      if (lead) {
        const metadata = typeof lead.metadata === "string" ? JSON.parse(lead.metadata) : (lead.metadata || {});
        const eventData = {
          visitor_id: metadata.visitor_id || "",
          session_id: metadata.session_id || "",
          click_id: metadata.click_id || "",
          device: metadata.device || "",
          referrer: metadata.referrer || "",
          utm_source: metadata.utm_source || "",
          utm_campaign: metadata.utm_campaign || "",
          utm_content: metadata.utm_content || "",
          transaction_id: transactionId,
          value: (data.amount || 0) / 100,
          method: "pix",
          source: "webhook",
        };
        await fetch(`${supabaseUrl}/rest/v1/user_events`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ event_type: "payment_confirmed", event_data: eventData }),
        });

        // Dual-write: new events table — purchase event (server-side, reliable)
        await fetch(`${supabaseUrl}/rest/v1/events`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            visitor_id: metadata.visitor_id || "unknown",
            session_id: metadata.session_id || null,
            event_name: "purchase",
            value: data.amount || 0,
            source: "webhook",
            campaign: metadata.utm_campaign || null,
            event_data: { ...eventData, gateway: "hygros", payment_method: "pix" },
            client_id: lead.client_id || null,
            site_id: lead.site_id || null,
          }),
        });

        // Audit log
        await fetch(`${supabaseUrl}/rest/v1/tracker_event_log`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            site_id: lead.site_id || "mesa-dobravel",
            event_name: "purchase",
            source: "webhook",
            success: true,
            payload: { transaction_id: transactionId, amount: data.amount || 0 },
          }),
        });

        // Update order status to paid
        if (lead.id) {
          await fetch(`${supabaseUrl}/rest/v1/orders?lead_id=eq.${lead.id}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ status: "paid" }),
          });
        }

        // Update funnel_state to purchase
        if (metadata.visitor_id) {
          await fetch(`${supabaseUrl}/rest/v1/funnel_state?visitor_id=eq.${metadata.visitor_id}`, {
            method: "PATCH",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ stage: "purchase", updated_at: new Date().toISOString() }),
          });
        }

        console.log("[Tracking] payment_confirmed event saved for visitor:", metadata.visitor_id);
      }

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
