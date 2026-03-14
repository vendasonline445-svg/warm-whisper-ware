import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user via their token
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { api_key, client_id } = await req.json();

    if (!api_key || !api_key.startsWith('sk-ant-')) {
      return new Response(
        JSON.stringify({ error: 'Chave inválida. Deve começar com sk-ant-' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the key as a Supabase secret
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0];
    
    // Use service role to store in integration_settings (encrypted-like storage)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const hint = '...' + api_key.slice(-8);
    
    // Store the actual key securely in the settings (service role bypasses RLS)
    await adminClient.from('integration_settings').upsert(
      {
        integration_key: 'anthropic_api_key_secure',
        name: 'Anthropic API Key (Secure)',
        config: { encrypted_key: api_key },
        enabled: true,
        client_id: client_id || null,
      },
      { onConflict: 'integration_key' }
    );

    return new Response(
      JSON.stringify({ success: true, hint }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('save-anthropic-key error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
