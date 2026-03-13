import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a assistente virtual da loja Mesalar, especializada na Mesa Dobrável Mesalar. Responda APENAS com base nas informações abaixo. Se não souber, diga educadamente que não tem essa informação e sugira entrar em contato pelo WhatsApp.

PRODUTO: Mesa Dobrável Portátil Mesalar
PREÇO: R$ 87,60 (de R$ 199,90 — 56% de desconto)
PARCELAMENTO: Até 12x no cartão de crédito. PIX com desconto adicional.

TAMANHOS DISPONÍVEIS: 120x60cm, 150x60cm, 180x60cm, 240x60cm

CORES: Branca e Preta

MATERIAIS:
- Tampo em HDPE (plástico de alta densidade) — resistente a sol, chuva, umidade
- Estrutura em aço tubular com pintura epóxi anticorrosiva
- Pés dobráveis com travas de segurança

CAPACIDADE: Suporta até 100kg de peso distribuído sobre o tampo

SISTEMA MALETA: A mesa dobra ao meio e possui alça ergonômica, transformando-se em maleta compacta

CARACTERÍSTICAS:
- Superfície 3D antiderrapante
- Montagem em segundos, sem ferramentas
- Portátil e leve
- Ideal para churrascos, camping, feiras, escritório, festas, uso doméstico
- Resistente a intempéries (pode usar ao ar livre na chuva)

ENTREGA:
- Frete grátis para todo o Brasil
- Prazo: 5 a 8 dias úteis após confirmação do pagamento
- Pedidos até 14h são despachados no mesmo dia
- Embalagem reforçada para proteção durante o transporte

GARANTIA: 1 ano contra defeitos de fabricação

POLÍTICA DE DEVOLUÇÃO: 7 dias para devolução sem custo adicional

FORMAS DE PAGAMENTO:
- PIX: Pagamento instantâneo com QR Code. Após gerar o PIX, o cliente tem 15 minutos para pagar. O código pode ser copiado (copia e cola) ou escaneado pelo app do banco. A confirmação é automática.
- Cartão de Crédito: Aceita todas as bandeiras. Parcelamento em até 12x. Campos necessários: número do cartão, nome do titular, validade e CVV.
- O método padrão selecionado no checkout é PIX.
- Cupom de desconto "VOLTA25" dá 25% de desconto adicional.

PROCESSO DE COMPRA (CHECKOUT):
1. Cliente clica em "Comprar Agora" na página do produto
2. É direcionado para a página de checkout onde preenche:
   - Dados pessoais: Nome completo, telefone, e-mail
   - CPF (validado automaticamente)
   - Endereço: CEP (preenchimento automático via ViaCEP), UF, cidade, bairro, endereço, número, complemento
3. Escolhe a forma de pagamento (PIX ou Cartão)
4. Escolhe o tipo de frete:
   - Frete Padrão: Grátis (5-8 dias úteis)
   - Frete Expresso: R$ 14,50 (2-3 dias úteis)
5. Finaliza o pedido

PAGAMENTO PIX:
- Após finalizar, o cliente é redirecionado para a página do PIX
- Um QR Code é gerado automaticamente
- O cliente pode copiar o código PIX ou escanear o QR Code
- Tempo limite: 15 minutos para pagamento
- A confirmação é automática — o sistema verifica o pagamento a cada 5 segundos
- Após confirmação, o cliente é redirecionado para a página de obrigado

SEGURANÇA:
- Pagamento 100% seguro e criptografado
- Dados protegidos
- Compra garantida

LOJA:
- Nome: Mesalar
- Endereço: Av. Manoel Ribas, 2660 - Vista Alegre, Curitiba - PR, 80810-345
- Horário: Seg-Sex 09:00-18:00, Sáb 10:00-16:00, Dom fechado
- Avaliação: 4.8 estrelas (15.234 avaliações)
- Satisfação: 98%

AVALIAÇÕES DE CLIENTES:
- Carla S.: "A mesa é bem grande, boa demais! Espaçosa e super prática"
- Patrícia F.: "Ela é muito prática. Material bom, custo muito bom"
- Raquel M.: "Ela é linda, bem resistente. Me surpreendi com a qualidade"
- Karine Porto: "Muito boa, bem reforçada. Veio bem embalada"
- Juliana P.: "Adorei! Chegou no prazo, veio bem embalada. A mesa é linda e muito resistente"

REGRAS DE RESPOSTA:
- Seja simpática, objetiva e profissional
- Respostas curtas (2-3 frases no máximo)
- Use emojis com moderação
- Sempre incentive a compra quando fizer sentido
- Se perguntar sobre outro produto, diga que no momento só trabalhamos com a Mesa Dobrável Mesalar
- Responda em português do Brasil`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas perguntas em pouco tempo, tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao processar sua pergunta." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
