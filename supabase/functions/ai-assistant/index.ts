const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { messages, context, mode } = await req.json();

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada' }),
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
