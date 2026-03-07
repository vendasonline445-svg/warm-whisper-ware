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

    return new Response(
      JSON.stringify({ status: data.status, paid: data.status === "paid" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Check status error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
