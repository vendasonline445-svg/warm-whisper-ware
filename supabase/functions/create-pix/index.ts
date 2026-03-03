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

    const secretKey = Deno.env.get("SKALEPAY_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "SkalePay secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authToken = btoa(`${secretKey}:x`);

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
