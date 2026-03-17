const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_TRACKLY_WEBHOOK_URL =
  "https://tracklybrasil.tech/public/webhook.php?token=wh_73e5eecea7881d9dc7765fbb3d3fffd4593dd823f14b3353a92a87b0b58f49d5&source=vegacheckout";

const PAID_STATUSES = new Set([
  "paid",
  "approved",
  "approved_payment",
  "succeeded",
  "success",
]);

function restHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

function pickFirstString(...values: any[]): string | null {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function pickFirstNumber(...values: any[]): number {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizePhoneForHash(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

async function sha256Hex(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "";
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseRawPayload(rawBody: string): Record<string, any> {
  if (!rawBody?.trim()) return {};

  try {
    const parsed = JSON.parse(rawBody);
    return asObject(parsed);
  } catch {
    // fallback to form-encoded
  }

  try {
    const params = new URLSearchParams(rawBody);
    const formData: Record<string, any> = {};

    for (const [key, value] of params.entries()) {
      formData[key] = value;
    }

    if (typeof formData.payload === "string") {
      try {
        formData.payload = JSON.parse(formData.payload);
      } catch {
        // keep as string
      }
    }

    if (typeof formData.data === "string") {
      try {
        formData.data = JSON.parse(formData.data);
      } catch {
        // keep as string
      }
    }

    return formData;
  } catch {
    return {};
  }
}

function normalizeWebhook(payload: Record<string, any>) {
  const root = asObject(payload);
  const data = asObject(root.data);
  const tx = asObject(root.transaction);
  const payment = asObject(root.payment);
  const payloadField = asObject(root.payload);

  const statusRaw = pickFirstString(
    root.status,
    data.status,
    tx.status,
    payment.status,
    payloadField.status,
  );
  const status = statusRaw?.toLowerCase() ?? null;

  const transactionId = pickFirstString(
    root.id,
    data.id,
    tx.id,
    payment.id,
    payloadField.id,
    root.transaction_id,
    data.transaction_id,
    tx.transaction_id,
    root.order_id,
    data.order_id,
    root.external_id,
    data.external_id,
  );

  const amount = pickFirstNumber(
    root.amount,
    data.amount,
    tx.amount,
    payment.amount,
    payloadField.amount,
    root.total_amount,
    data.total_amount,
  );

  const customer = asObject(
    root.customer || data.customer || tx.customer || payment.customer || payloadField.customer,
  );

  const itemsCandidate =
    root.items || data.items || tx.items || payment.items || payloadField.items;
  const items = Array.isArray(itemsCandidate) ? itemsCandidate : [];

  return {
    root,
    data,
    status,
    transactionId,
    amount,
    customer,
    items,
  };
}

async function insertApiLog(
  supabaseUrl: string,
  serviceKey: string,
  method: string,
  requestPayload: Record<string, any>,
  responsePayload: Record<string, any>,
  statusCode: number,
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/api_logs`, {
      method: "POST",
      headers: restHeaders(serviceKey),
      body: JSON.stringify({
        endpoint: "hygros-webhook",
        method,
        request_payload: requestPayload,
        response_payload: responsePayload,
        status_code: statusCode,
      }),
    });
  } catch (err) {
    console.error("[hygros-webhook] Failed to persist api_logs:", err);
  }
}

async function sendTracklyWebhook(
  supabaseUrl: string,
  serviceKey: string,
  lead: any,
  normalized: ReturnType<typeof normalizeWebhook>,
) {
  const settingsRes = await fetch(
    `${supabaseUrl}/rest/v1/tracking_settings?select=webhook_url,webhook_enabled&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );

  const settingsArr = await settingsRes.json();
  const settings = Array.isArray(settingsArr) ? settingsArr[0] : null;

  if (settings?.webhook_enabled === false) {
    console.log("[Trackly] Webhook disabled in settings, skipping");
    return;
  }

  const webhookUrl = settings?.webhook_url || DEFAULT_TRACKLY_WEBHOOK_URL;

  const firstItem = normalized.items[0] || {};
  const productName = firstItem.title || "Mesa Portátil Dobrável";
  const productQty = Number.parseInt(String(firstItem.quantity ?? lead.quantity ?? 1), 10) || 1;
  const productPrice = Number.parseInt(
    String(firstItem.unitPrice ?? lead.total_amount ?? normalized.amount ?? 0),
    10,
  ) || 0;

  const payload = {
    status: "paid",
    orderId: lead.transaction_id || normalized.transactionId || "",
    customer: {
      name: lead.name || normalized.customer?.name || "",
      email: lead.email || normalized.customer?.email || "",
      phone: lead.phone || normalized.customer?.phone || "",
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
        quantity: productQty,
        priceInCents: productPrice,
      },
    ],
  };

  console.log("[Trackly] Sending webhook:", JSON.stringify(payload));

  const tracklyRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const tracklyText = await tracklyRes.text();
  console.log(`[Trackly] webhook response (${tracklyRes.status}):`, tracklyText);

  await fetch(`${supabaseUrl}/rest/v1/tracking_webhook_logs`, {
    method: "POST",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({
      order_id: lead.id,
      webhook_url: webhookUrl,
      status: tracklyRes.ok ? "success" : "error",
      http_status: tracklyRes.status,
      response: tracklyText.slice(0, 500),
      payload_sent: JSON.stringify(payload),
      client_id: lead.client_id || null,
    }),
  });

  await fetch(`${supabaseUrl}/rest/v1/checkout_leads?id=eq.${encodeURIComponent(lead.id)}`, {
    method: "PATCH",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({ tracking_sent: true }),
  });

  await fetch(`${supabaseUrl}/rest/v1/order_tracking`, {
    method: "POST",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({
      order_id: lead.id,
      customer_name: payload.customer.name,
      customer_email: payload.customer.email,
      product_name: productName,
      zipcode: lead.cep || "",
      status: "enviado",
      client_id: lead.client_id || null,
    }),
  });
}

async function dispatchTikTokPurchase(
  supabaseUrl: string,
  serviceKey: string,
  lead: any,
  normalized: ReturnType<typeof normalizeWebhook>,
  metadata: Record<string, any>,
  matchedTxId: string,
  requestMeta: { ip?: string; userAgent?: string },
) {
  try {
    const clientFilter = lead.client_id
      ? `&client_id=eq.${encodeURIComponent(String(lead.client_id))}`
      : "";

    const pixelsRes = await fetch(
      `${supabaseUrl}/rest/v1/tiktok_pixels?select=pixel_id,api_token&status=eq.active${clientFilter}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );

    const pixels = await pixelsRes.json();
    const activePixels = Array.isArray(pixels) ? pixels : [];

    if (activePixels.length === 0) {
      console.log("[TikTok] No active pixels found for approved purchase");
      return;
    }

    const emailRaw = pickFirstString(lead.email, normalized.customer?.email) || "";
    const phoneRaw = pickFirstString(lead.phone, normalized.customer?.phone) || "";
    const externalIdRaw =
      pickFirstString(
        metadata.visitor_id,
        asObject(metadata.tracking).visitor_id,
        lead.transaction_id,
        matchedTxId,
        lead.id,
      ) || "";

    const emailHash = emailRaw ? await sha256Hex(emailRaw) : "";
    const phoneHash = phoneRaw ? await sha256Hex(normalizePhoneForHash(phoneRaw)) : "";
    const externalIdHash = externalIdRaw ? await sha256Hex(externalIdRaw) : "";

    const ttclid = pickFirstString(
      metadata.ttclid,
      asObject(metadata.tracking).ttclid,
      normalized.data?.ttclid,
      normalized.root?.ttclid,
    );

    const pageUrl = pickFirstString(
      metadata.page_url,
      asObject(metadata.tracking).page_url,
      normalized.data?.checkoutUrl,
      normalized.root?.checkoutUrl,
    );

    const userAgent = pickFirstString(
      metadata.user_agent,
      asObject(metadata.tracking).user_agent,
      requestMeta.userAgent,
    );

    const ip = pickFirstString(
      normalized.data?.ip,
      normalized.root?.ip,
      requestMeta.ip,
    );

    const firstItem = normalized.items[0] || {};
    const quantity = Number.parseInt(String(firstItem.quantity ?? lead.quantity ?? 1), 10) || 1;
    const valueCents = pickFirstNumber(normalized.amount, lead.total_amount, firstItem.unitPrice, 0);
    const value = Number((valueCents / 100).toFixed(2));
    const eventId = `purchase_${matchedTxId || lead.transaction_id || lead.id || Date.now()}`;

    const requests = activePixels.map((pixel: any) => {
      const payload = {
        event: "CompletePayment",
        event_id: eventId,
        timestamp: new Date().toISOString(),
        pixel_code: pixel.pixel_id,
        api_token: pixel.api_token,
        user: {
          email: emailHash || undefined,
          phone_number: phoneHash || undefined,
          external_id: externalIdHash || undefined,
          ip: ip || undefined,
          user_agent: userAgent || undefined,
          ttclid: ttclid || undefined,
          page_url: pageUrl || undefined,
        },
        properties: {
          currency: "BRL",
          value,
          content_type: "product",
          contents: [
            {
              content_id: firstItem.externalRef || "mesa-dobravel",
              content_name: firstItem.title || metadata.productName || "Mesa Dobrável",
              content_type: "product",
              quantity,
              price: value,
            },
          ],
          num_items: quantity,
          method: lead.payment_method || normalized.data?.paymentMethod || "pix",
        },
      };

      return fetch(`${supabaseUrl}/functions/v1/tiktok-events-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          ...(ip ? { "x-forwarded-for": ip } : {}),
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          const text = await res.text();
          console.log(`[TikTok] Purchase dispatch (${pixel.pixel_id}) -> ${res.status}:`, text);
        })
        .catch((err) => {
          console.error(`[TikTok] Purchase dispatch failed (${pixel.pixel_id}):`, err);
        });
    });

    await Promise.allSettled(requests);
  } catch (err) {
    console.error("[TikTok] Error dispatching approved purchase:", err);
  }
}

async function handlePaidWebhook(
  supabaseUrl: string,
  serviceKey: string,
  normalized: ReturnType<typeof normalizeWebhook>,
  requestMeta: { ip?: string; userAgent?: string },
) {
  // Hygros sends root.id (e.g. "PW7NNJRMN04E") but checkout_leads stores data.id (UUID).
  // Try multiple candidate IDs to find the lead.
  const candidateIds = [
    normalized.transactionId,
    normalized.data?.id,
    normalized.root?.objectId,
  ].filter((v): v is string => !!v && typeof v === "string");

  let lead: any = null;
  let matchedTxId = "";

  for (const txId of candidateIds) {
    const findRes = await fetch(
      `${supabaseUrl}/rest/v1/checkout_leads?transaction_id=eq.${encodeURIComponent(txId)}&select=*`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      },
    );
    const leads = await findRes.json();
    lead = Array.isArray(leads) ? leads[0] : null;
    if (lead) {
      matchedTxId = txId;
      console.log(`[hygros-webhook] Lead found using transaction_id: ${txId}`);
      break;
    }
  }

  if (!lead) {
    console.log("[hygros-webhook] No lead found for any candidate IDs:", candidateIds);
    await fetch(`${supabaseUrl}/rest/v1/tracker_event_log`, {
      method: "POST",
      headers: restHeaders(serviceKey),
      body: JSON.stringify({
        site_id: "mesa-dobravel",
        event_name: "purchase",
        source: "webhook",
        success: false,
        error_message: `No matching lead for transaction_ids: ${candidateIds.join(", ")}`,
        payload: { transaction_ids: candidateIds, amount: normalized.amount || 0 },
      }),
    });
    return;
  }

  // --- DEDUP ATÔMICO: apenas a primeira requisição consegue aprovar ---
  const approveRes = await fetch(
    `${supabaseUrl}/rest/v1/checkout_leads?id=eq.${encodeURIComponent(lead.id)}&status=neq.approved&select=*`,
    {
      method: "PATCH",
      headers: {
        ...restHeaders(serviceKey),
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status: "approved" }),
    },
  );

  if (!approveRes.ok) {
    const approveError = await approveRes.text();
    console.error(`[hygros-webhook] Failed to atomically approve lead ${lead.id}:`, approveError);
    return;
  }

  const approvedRows = await approveRes.json();
  if (!Array.isArray(approvedRows) || approvedRows.length === 0) {
    console.log(`[hygros-webhook] DEDUP: Lead ${lead.id} already processed by another request, skipping duplicate webhook`);
    return;
  }

  lead = approvedRows[0];

  let metadata: Record<string, any> = {};
  try {
    metadata =
      typeof lead.metadata === "string"
        ? JSON.parse(lead.metadata)
        : asObject(lead.metadata);
  } catch {
    metadata = {};
  }

  const eventData = {
    visitor_id: metadata.visitor_id || "",
    session_id: metadata.session_id || "",
    click_id: metadata.click_id || "",
    device: metadata.device || "",
    referrer: metadata.referrer || "",
    utm_source: metadata.utm_source || "",
    utm_campaign: metadata.utm_campaign || "",
    utm_content: metadata.utm_content || "",
    transaction_id: matchedTxId,
    value: (normalized.amount || 0) / 100,
    method: "pix",
    source: "webhook",
  };

  await fetch(`${supabaseUrl}/rest/v1/user_events`, {
    method: "POST",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({ event_type: "payment_confirmed", event_data: eventData }),
  });

  await fetch(`${supabaseUrl}/rest/v1/events`, {
    method: "POST",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({
      visitor_id: metadata.visitor_id || "unknown",
      session_id: metadata.session_id || null,
      event_name: "purchase",
      value: normalized.amount || 0,
      source: "webhook",
      campaign: metadata.utm_campaign || null,
      event_data: { ...eventData, gateway: "hygros", payment_method: "pix" },
      client_id: lead.client_id || null,
      site_id: lead.site_id || null,
    }),
  });

  await fetch(`${supabaseUrl}/rest/v1/tracker_event_log`, {
    method: "POST",
    headers: restHeaders(serviceKey),
    body: JSON.stringify({
      site_id: lead.site_id || "mesa-dobravel",
      event_name: "purchase",
      source: "webhook",
      success: true,
      payload: { transaction_id: matchedTxId, amount: normalized.amount || 0 },
    }),
  });

  if (lead.id) {
    await fetch(`${supabaseUrl}/rest/v1/orders?lead_id=eq.${encodeURIComponent(lead.id)}`, {
      method: "PATCH",
      headers: restHeaders(serviceKey),
      body: JSON.stringify({ status: "paid" }),
    });
  }

  if (metadata.visitor_id) {
    await fetch(
      `${supabaseUrl}/rest/v1/funnel_state?visitor_id=eq.${encodeURIComponent(metadata.visitor_id)}`,
      {
        method: "PATCH",
        headers: restHeaders(serviceKey),
        body: JSON.stringify({ stage: "purchase", updated_at: new Date().toISOString() }),
      },
    );
  }

  await dispatchTikTokPurchase(
    supabaseUrl,
    serviceKey,
    lead,
    normalized,
    metadata,
    matchedTxId,
    requestMeta,
  );

  // Pushcut: venda aprovada
  try {
    const valorReais = lead.total_amount ? (lead.total_amount / 100).toFixed(2).replace(".", ",") : "?";
    await fetch("https://api.pushcut.io/SpzDS98J4ESuSNvFb2HbR/notifications/MinhaNotifica%C3%A7%C3%A3o1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "✅ Venda Aprovada!",
        text: `R$ ${valorReais}`,
      }),
    });
    console.log("[Pushcut] Approved notification sent via webhook");
  } catch (e) {
    console.error("[Pushcut] Error:", e);
  }

  // Pushcut: venda aprovada (op1)
  try {
    const valorReais2 = lead.total_amount ? (lead.total_amount / 100).toFixed(2).replace(".", ",") : "?";
    await fetch("https://api.pushcut.io/hP4zcE1aQp4T4j61a5rwa/notifications/Paga%20op1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "✅ Venda Aprovada!",
        text: `R$ ${valorReais2}`,
      }),
    });
    console.log("[Pushcut] Approved op1 notification sent");
  } catch (e) {
    console.error("[Pushcut] Error op1:", e);
  }

  // Pushcut: venda aprovada (novo endpoint)
  try {
    const valorReais3 = lead.total_amount ? (lead.total_amount / 100).toFixed(2).replace(".", ",") : "?";
    await fetch("https://api.pushcut.io/W0ax72ltE-yyzA7RKNGg-/notifications/MinhaNotifica%C3%A7%C3%A3o", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "✅ Venda Aprovada!",
        text: `R$ ${valorReais3}`,
      }),
    });
    console.log("[Pushcut] Approved new endpoint notification sent");
  } catch (e) {
    console.error("[Pushcut] Error new endpoint:", e);
  }

  if (lead.tracking_sent) {
    console.log("[Trackly] Already sent for this order, skipping");
    return;
  }

  await sendTracklyWebhook(supabaseUrl, serviceKey, lead, normalized);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (req.method === "GET") {
    const response = {
      ok: true,
      service: "hygros-webhook",
      message: "Webhook online",
      expected_statuses: [...PAID_STATUSES],
      timestamp: new Date().toISOString(),
    };

    await insertApiLog(supabaseUrl, serviceKey, req.method, {}, response, 200);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    const parsedPayload = parseRawPayload(rawBody);
    const normalized = normalizeWebhook(parsedPayload);

    const headersObj = Object.fromEntries(req.headers.entries());
    const requestMeta = {
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-real-ip") ||
        "",
      userAgent: req.headers.get("user-agent") || "",
    };

    console.log("[hygros-webhook] Received request", {
      method: req.method,
      url: req.url,
      headers: headersObj,
      parsedPayload,
      normalized: {
        status: normalized.status,
        transactionId: normalized.transactionId,
        amount: normalized.amount,
      },
    });

    if (!normalized.status || !PAID_STATUSES.has(normalized.status)) {
      const response = { message: `Status ignored: ${normalized.status || "unknown"}` };
      await insertApiLog(supabaseUrl, serviceKey, req.method, parsedPayload, response, 200);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!normalized.transactionId) {
      const response = { message: "Missing transaction id, ignored" };
      await insertApiLog(supabaseUrl, serviceKey, req.method, parsedPayload, response, 200);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await handlePaidWebhook(supabaseUrl, serviceKey, normalized, requestMeta);

    const response = { success: true, transaction_id: normalized.transactionId };
    await insertApiLog(supabaseUrl, serviceKey, req.method, parsedPayload, response, 200);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hygros-webhook] Error:", error);

    await insertApiLog(
      supabaseUrl,
      serviceKey,
      req.method,
      {},
      { error: message },
      500,
    );

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
