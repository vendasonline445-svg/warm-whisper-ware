import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um especialista em conversão e e-commerce brasileiro. Analise os dados do funil de vendas e retorne uma análise completa.

IMPORTANTE: Responda APENAS com JSON válido, sem markdown, sem backticks, sem texto antes ou depois.

O JSON deve ter esta estrutura exata:
{
  "score": <número de 0 a 100>,
  "scoreLabel": "<Crítico|Atenção|Saudável|Excelente>",
  "bottlenecks": [
    {"stage": "<etapa>", "severity": "<critical|warning|info>", "description": "<descrição curta>"}
  ],
  "insights": [
    {"title": "<título curto>", "description": "<explicação>", "type": "<problem|opportunity|success>"}
  ],
  "recommendations": [
    {"action": "<ação prática>", "impact": "<high|medium|low>", "category": "<oferta|criativo|checkout|tráfego|preço>"}
  ],
  "summary": "<resumo de 2-3 frases sobre o estado geral do funil>"
}

Regras para o score:
- 0-30: Crítico (conversão muito baixa, gargalos graves)
- 31-60: Atenção (há problemas mas o funil funciona parcialmente)
- 61-80: Saudável (boas taxas, melhorias pontuais)
- 81-100: Excelente (funil otimizado)

Analise especialmente:
1. Taxa de clique em comprar vs visitantes (benchmark: >8%)
2. Taxa checkout vs cliques (benchmark: >30%)
3. Taxa pagamento vs checkout (benchmark: >40%)
4. Taxa aprovação vs pagamento (benchmark: >50%)
5. Scroll médio (benchmark: >60%)
6. Tráfego suspeito (muitos visitantes, poucos cliques)
7. Abandono de checkout
8. Proporção cartão vs pix`;

    const userPrompt = `Dados do funil:
- Visitantes: ${metrics.visitors}
- Cliques em Comprar: ${metrics.buyClicks}
- Cliques em Imagens: ${metrics.imageClicks}
- Scroll Médio: ${metrics.avgScroll}%
- Checkouts Iniciados: ${metrics.checkouts}
- Checkouts Abandonados: ${metrics.abandoned}
- Pix Gerados: ${metrics.pixGenerated}
- Pix Pagos: ${metrics.pixPaid}
- Cartões Coletados: ${metrics.cardsCollected}
- Pagamentos Aprovados: ${metrics.paid}
- Pix Pendentes: ${metrics.pending}
- Receita Total: R$ ${(metrics.totalRevenue / 100).toFixed(2)}
- Ativos (1h): ${metrics.activeNow}
- Total de Leads: ${metrics.totalLeads}

Taxas calculadas:
- Clique/Visitante: ${metrics.visitors > 0 ? ((metrics.buyClicks / metrics.visitors) * 100).toFixed(1) : 0}%
- Checkout/Clique: ${metrics.buyClicks > 0 ? ((metrics.checkouts / metrics.buyClicks) * 100).toFixed(1) : 0}%
- Pagamento/Checkout: ${metrics.checkouts > 0 ? ((metrics.pixGenerated / metrics.checkouts) * 100).toFixed(1) : 0}%
- Aprovação/Pagamento: ${metrics.pixGenerated > 0 ? ((metrics.paid / metrics.pixGenerated) * 100).toFixed(1) : 0}%
- Conversão Geral: ${metrics.visitors > 0 ? ((metrics.paid / metrics.visitors) * 100).toFixed(1) : 0}%`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    
    // Parse the JSON from the AI response
    let analysis;
    try {
      // Try to extract JSON from possible markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      analysis = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Falha ao processar resposta da IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("conversion-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
