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
    const { customer, items, amount, shipping, metadata } = await req.json();

    if (!customer || !items || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: customer, items, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let parsedMeta: any = {};
    let trackingParams: Record<string, string | null> = {};
    try {
      parsedMeta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      trackingParams = parsedMeta?.tracking || {};
    } catch (_) {}

    const siteId = parsedMeta?.site_id || null;

    // Resolve site_id → client_id + gateway config
    let client_id: string | null = null;
    let gatewayConfig: any = null;

    if (siteId) {
      const { data: site } = await supabase
        .from("sites")
        .select("client_id")
        .eq("site_id", siteId)
        .eq("active", true)
        .single();
      client_id = site?.client_id ?? null;

      if (client_id) {
        const { data: gateway } = await supabase
          .from("payment_gateways")
          .select("*")
          .eq("client_id", client_id)
          .eq("active", true)
          .single();
        gatewayConfig = gateway;
      }
    }

    // Use client gateway or fallback to env defaults
    const secretKey = gatewayConfig?.api_key ?? Deno.env.get("HYGROS_SECRET_KEY");
    const companyId = gatewayConfig?.company_id ?? Deno.env.get("HYGROS_COMPANY_ID");

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build webhook URL (normalize trailing slash for safety)
    const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, "");
    const postbackUrl = `${normalizedSupabaseUrl}/functions/v1/hygros-webhook`;
    console.log("[create-pix] postbackUrl:", postbackUrl);

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
      pix: { expiresInMinutes: 30 },
      postbackUrl,
      metadata: parsedMeta || {},
    };

    console.log("Creating PIX transaction");

    const credentials = btoa(`${secretKey}:${companyId || ""}`);
    
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
    console.log("Gateway response status:", response.status);

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
        JSON.stringify({ error: "Payment gateway error", details: data }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = data.id || Date.now();

    // Write to checkout_leads
    try {
      await supabase.from("checkout_leads").insert({
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
        client_id,
        site_id: siteId,
      });
    } catch (e) {
      console.error("Error saving checkout lead:", e);
    }

    // Write order + event
    const visitorId = parsedMeta?.visitor_id || parsedMeta?.tracking?.visitor_id || "unknown";
    try {
      await supabase.from("orders").insert({
        visitor_id: visitorId,
        payment_method: "pix",
        status: "pix_generated",
        value: amount,
        transaction_id: String(orderId),
        client_id,
        site_id: siteId,
      });

      await supabase.from("events").insert({
        visitor_id: visitorId,
        session_id: parsedMeta?.session_id || null,
        event_name: "pix_generated",
        value: amount,
        source: "server",
        campaign: trackingParams.utm_campaign || null,
        event_data: { transaction_id: String(orderId), customer_email: customer.email, gateway: "hygros" },
        client_id,
        site_id: siteId,
      });

      // Audit log
      await supabase.from("tracker_event_log").insert({
        site_id: siteId || "mesa-dobravel",
        event_name: "pix_generated",
        source: "server",
        success: true,
        payload: { transaction_id: String(orderId), amount },
      });
    } catch (e) {
      console.error("Error writing to tables:", e);
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
