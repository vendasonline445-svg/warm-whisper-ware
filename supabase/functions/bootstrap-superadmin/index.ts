import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { email, password } = await req.json();

    // Check if any superadmin exists
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("role", "superadmin")
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Superadmin already exists" }), { status: 400, headers: corsHeaders });
    }

    // Create user
    const { data: user, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders });
    }

    // Set as superadmin
    await adminClient
      .from("profiles")
      .update({ role: "superadmin", full_name: "Admin" })
      .eq("id", user.user.id);

    return new Response(JSON.stringify({ success: true, user_id: user.user.id }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
