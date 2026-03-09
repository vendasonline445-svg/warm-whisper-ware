

## Plano: Sistema Completo de Tracking TikTok (Pixel + Events API)

### Visão Geral

Implementar tracking profissional TikTok com deduplicação Pixel↔Events API, hashing SHA256, captura de parâmetros UTM/ttclid, e envio server-side para maximizar EMQ.

### Componentes

#### 1. Substituir Pixel TikTok no `index.html`
- Remover o pixel antigo (UTMify TikTok) e instalar o pixel oficial TikTok com ID `D6JQATBC77UBUNE442EG`
- Snippet padrão `ttq.load()` + `ttq.page()` no HEAD

#### 2. Criar `src/lib/tiktok-tracking.ts` — Módulo central de tracking
- **Captura de UTM params**: Ler `ttclid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` da URL e salvar em `localStorage`
- **SHA256 hash**: Função async usando `crypto.subtle.digest` para gerar hashes de email, telefone e external_id
- **`identifyTikTokUser()`**: Chama `ttq.identify()` com dados hashados
- **`trackTikTokEvent()`**: Gera `event_id` único (UUID), dispara `ttq.track()` no browser e envia server-side via edge function, garantindo deduplicação
- **Logs de debug**: `console.log` com prefixo `[TikTok]` para cada evento disparado
- **`initTikTokTracking()`**: Chamado no App mount para capturar params da URL

#### 3. Criar Edge Function `supabase/functions/tiktok-events-api/index.ts`
- Recebe evento, dados do usuário (hashes), propriedades e `event_id`
- Envia POST para `https://business-api.tiktok.com/open_api/v1.3/event/track/`
- Headers: `Access-Token` do secret, `Content-Type: application/json`
- Payload segue formato oficial TikTok com `pixel_code`, `event`, `event_id`, `context.user`, `properties`
- Armazenar o access token como secret `TIKTOK_EVENTS_API_TOKEN`

#### 4. Atualizar `supabase/config.toml`
- Adicionar `[functions.tiktok-events-api]` com `verify_jwt = false`

#### 5. Integrar eventos no funil

| Página | Evento | Trigger |
|--------|--------|---------|
| `Index.tsx` | `ViewContent` | On mount |
| `Index.tsx` | `AddToCart` | Click "Comprar" / selecionar cor |
| `Checkout.tsx` | `InitiateCheckout` | On mount |
| `PixPayment.tsx` | `CompletePayment` / `Purchase` | Quando `data.paid === true` (substituir o `ttq.track` atual) |

- Em cada página, chamar `trackTikTokEvent()` passando dados relevantes (value, content_id, currency)
- No Checkout, ao submeter, chamar `identifyTikTokUser()` com email/phone/cpf hashados
- `PageView` disparado automaticamente pelo pixel (`ttq.page()`) + via `initTikTokTracking()` a cada navegação SPA

#### 6. Compatibilidade SPA
- No `App.tsx`, usar `useEffect` + `useLocation` para disparar `ttq.page()` a cada mudança de rota

### Segurança
- O `EVENTS_API_ACCESS_TOKEN` será armazenado como secret no backend (nunca exposto no frontend)
- Hashing SHA256 feito no client antes de enviar ao server

### Resultado Esperado
- Deduplicação perfeita via `event_id` compartilhado entre Pixel e Events API
- EMQ maximizado com email hash, phone hash, external_id hash, ttclid, IP e user_agent
- Debug logs no console para validação

