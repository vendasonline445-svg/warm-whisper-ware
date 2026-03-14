import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { messages, context, mode, client_id } = await req.json();

  // Try to get client-specific key from integration_settings first
  let ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const query = adminClient
      .from('integration_settings')
      .select('config')
      .eq('integration_key', 'anthropic_api_key_secure')
      .eq('enabled', true);

    if (client_id) query.eq('client_id', client_id);

    const { data } = await query.maybeSingle();
    const config = data?.config as Record<string, any> | null;
    if (config?.encrypted_key) {
      ANTHROPIC_API_KEY = config.encrypted_key;
    }
  } catch {
    // Fall back to env secret
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada. Configure em Settings → Integrações.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = `Você é um especialista em marketing digital, funis de venda e e-commerce brasileiro.
Você tem acesso aos dados do FunnelIQ — uma plataforma de tracking first-party para e-commerces.

Contexto atual do funil:
${context ? JSON.stringify(context, null, 2) : 'Nenhum contexto fornecido'}

Seu papel varia conforme o modo:
- diagnóstico: Analise os dados e identifique gargalos, problemas de conversão e oportunidades
- insights: Sugira ações práticas para melhorar ROAS, reduzir abandono e aumentar conversão
- assistente: Responda perguntas gerais sobre o funil, campanhas e estratégias de marketing

Modo atual: ${mode || 'assistente'}

Seja direto, prático e use dados concretos quando disponíveis.
Responda sempre em português brasileiro.
Formate respostas com markdown quando apropriado.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: data.error?.message || 'Erro na API da Anthropic' }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      content: data.content[0].text,
      usage: data.usage,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
