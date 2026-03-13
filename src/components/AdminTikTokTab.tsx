import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ToggleLeft, ToggleRight, Activity, CheckCircle2, AlertTriangle,
  XCircle, Zap, Shield, Link2, Clock, Play, Gauge, Search
} from "lucide-react";

interface Pixel {
  id: string;
  name: string;
  pixel_id: string;
  api_token: string;
  status: string;
  created_at: string;
}

interface UserEvent {
  id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

type DiagStatus = "ok" | "warn" | "error" | "loading";

function StatusIcon({ status }: { status: DiagStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground animate-spin" />;
}

const TIKTOK_EVENT_TYPES = ["ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "Purchase", "CompletePayment"];
const TRACKED_INTERNAL = ["page_view", "visitor_session", "click_buy_button", "checkout_initiated", "pix_generated", "card_submitted", "payment_confirmed"];

export default function AdminTikTokTab() {
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", pixel_id: "", api_token: "" });
  const [adding, setAdding] = useState(false);
  const [showDiag, setShowDiag] = useState(true);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ event: string; status: DiagStatus; msg: string }[]>([]);
  const [testing, setTesting] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResults, setSimResults] = useState<string[]>([]);

  useEffect(() => {
    fetchPixels();
    fetchRecentEvents();
  }, []);

  const fetchPixels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tiktok_pixels")
      .select("*")
      .order("created_at", { ascending: false });
    setPixels((data as Pixel[]) || []);
    setLoading(false);
  };

  const fetchRecentEvents = async () => {
    setEventsLoading(true);
    const { data } = await supabase
      .from("user_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEvents((data as UserEvent[]) || []);
    setEventsLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name || !form.pixel_id || !form.api_token) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("tiktok_pixels").insert({
      name: form.name,
      pixel_id: form.pixel_id,
      api_token: form.api_token,
      status: "active",
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pixel adicionado!" });
      setForm({ name: "", pixel_id: "", api_token: "" });
      fetchPixels();
    }
    setAdding(false);
  };

  const toggleStatus = async (pixel: Pixel) => {
    const newStatus = pixel.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("tiktok_pixels").update({ status: newStatus }).eq("id", pixel.id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      fetchPixels();
    }
  };

  const deletePixel = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este pixel?")) return;
    const { error } = await supabase.from("tiktok_pixels").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      fetchPixels();
    }
  };

  // ── Diagnostics Analysis ──
  const diagnostics = useMemo(() => {
    const activePixels = pixels.filter(p => p.status === "active");
    const hasPixels = activePixels.length > 0;
    const ttqLoaded = typeof window !== "undefined" && !!(window as any).ttq;

    // Event analysis
    const relevantEvents = events.filter(e =>
      TRACKED_INTERNAL.includes(e.event_type) || e.event_type === "visitor_session"
    );
    const hasEvents = relevantEvents.length > 0;

    // Event ID check
    const eventsWithEventId = relevantEvents.filter(e => {
      const d = e.event_data;
      return d && typeof d === "object" && ("event_id" in d || "visitor_id" in d);
    });
    const eventIdCoverage = relevantEvents.length > 0
      ? Math.round((eventsWithEventId.length / relevantEvents.length) * 100)
      : 0;

    // Advanced Matching coverage
    const eventsWithEmail = relevantEvents.filter(e => e.event_data?.email && String(e.event_data.email).trim()).length;
    const eventsWithPhone = relevantEvents.filter(e => e.event_data?.phone && String(e.event_data.phone).trim()).length;
    const eventsWithExtId = relevantEvents.filter(e => e.event_data?.visitor_id && String(e.event_data.visitor_id).trim()).length;
    const total = relevantEvents.length || 1;
    const emailCoverage = Math.round((eventsWithEmail / total) * 100);
    const phoneCoverage = Math.round((eventsWithPhone / total) * 100);
    const extIdCoverage = Math.round((eventsWithExtId / total) * 100);

    // Dedup detection — look for events with same type within 2 seconds
    let dupCount = 0;
    const sorted = [...relevantEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].event_type === sorted[i - 1].event_type) {
        const diff = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime();
        if (diff < 2000 && sorted[i].event_data?.visitor_id === sorted[i - 1].event_data?.visitor_id) {
          dupCount++;
        }
      }
    }

    // ttclid check
    let ttclidDetected = false;
    try {
      ttclidDetected = !!localStorage.getItem("tt_ttclid");
    } catch {}
    const eventsWithTtclid = relevantEvents.filter(e => {
      const t = e.event_data?.ttclid || e.event_data?.click_id;
      return t && String(t) !== "organic" && String(t).length > 5;
    }).length;

    // Health score (max 100)
    let score = 0;
    if (hasPixels) score += 15;                                                   // Pixels ativos
    // ttq SDK won't be loaded on admin page — check if pixels exist as proxy
    if (ttqLoaded || hasPixels) score += 10;                                      // SDK / config OK
    if (hasEvents) score += 10;                                                   // Eventos sendo recebidos
    if (eventIdCoverage > 80) score += 15; else if (eventIdCoverage > 50) score += 8; // Event ID
    if (extIdCoverage > 80) score += 20; else if (extIdCoverage > 50) score += 10;   // External ID (mais peso)
    if (emailCoverage > 20) score += 10; else if (emailCoverage > 5) score += 5;  // Email
    if (phoneCoverage > 20) score += 10; else if (phoneCoverage > 5) score += 5;  // Phone
    if (dupCount === 0) score += 10; else if (dupCount < 3) score += 5;           // Sem duplicação
    // ttclid — give partial credit if system is configured to capture it
    if (ttclidDetected || eventsWithTtclid > 0) score += 5;
    else if (hasPixels) score += 3; // System is ready to capture ttclid even if no ad clicks yet
    // Cap at 100
    score = Math.min(score, 100);

    return {
      hasPixels,
      ttqLoaded,
      hasEvents,
      eventIdCoverage,
      emailCoverage,
      phoneCoverage,
      extIdCoverage,
      dupCount,
      ttclidDetected,
      eventsWithTtclid,
      score,
      totalEvents: relevantEvents.length,
    };
  }, [pixels, events]);

  // ── Test Pixel ──
  const runPixelTest = async () => {
    setTesting(true);
    setTestResults([]);
    const results: typeof testResults = [];

    const testEvents = ["ViewContent", "AddToCart", "InitiateCheckout", "CompletePayment"];
    for (const ev of testEvents) {
      try {
        const { trackTikTokEvent } = await import("@/lib/tiktok-tracking");
        await trackTikTokEvent({
          event: ev,
          properties: {
            content_type: "product",
            content_id: "test-diagnostico",
            content_name: "Mesa Dobrável Retrátil",
            value: 1,
            currency: "BRL",
            _test: true,
          },
        });
        results.push({ event: ev, status: "ok", msg: "Enviado com sucesso" });
      } catch (err: any) {
        results.push({ event: ev, status: "error", msg: err?.message || "Falha no envio" });
      }
      setTestResults([...results]);
      await new Promise(r => setTimeout(r, 500));
    }
    setTesting(false);
    toast({ title: "Teste concluído", description: `${results.filter(r => r.status === "ok").length}/${results.length} eventos enviados.` });
  };

  // ── Simulate Conversion ──
  const simulateConversion = async () => {
    setSimulating(true);
    setSimResults([]);
    const log = (msg: string) => setSimResults(prev => [...prev, msg]);

    try {
      // Ensure tracking IDs exist before simulation by importing the tracking module
      // which auto-initializes visitor_id and click_id
      const { getTrackingContext } = await import("@/utils/track-event");
      const ctx = getTrackingContext();

      const visitorId = ctx.visitor_id || localStorage.getItem("mesalar_visitor_id") || "";
      const clickId = ctx.click_id || sessionStorage.getItem("mesalar_click_id") || "";
      const utmCampaign = sessionStorage.getItem("mesalar_utm");
      let campaign = "—";
      try { campaign = utmCampaign ? JSON.parse(utmCampaign)?.utm_campaign || "—" : "—"; } catch {}

      log(`✅ visitor_id: ${visitorId || "gerado agora"}`);
      log(`✅ click_id: ${clickId === "organic" ? "organic (sem anúncio)" : clickId || "gerado agora"}`);
      log(`${campaign !== "—" ? "✅" : "ℹ️"} utm_campaign: ${campaign !== "—" ? campaign : "nenhuma (acesso direto)"}`);

      const { trackTikTokEvent } = await import("@/lib/tiktok-tracking");

      log("📤 Enviando ViewContent...");
      await trackTikTokEvent({ event: "ViewContent", properties: { content_id: "sim-test", content_name: "Mesa Dobrável Retrátil", value: 87.6, currency: "BRL", _test: true } });
      log("✅ ViewContent enviado");

      await new Promise(r => setTimeout(r, 300));
      log("📤 Enviando AddToCart...");
      await trackTikTokEvent({ event: "AddToCart", properties: { content_id: "sim-test", content_name: "Mesa Dobrável Retrátil", value: 87.6, currency: "BRL", _test: true } });
      log("✅ AddToCart enviado");

      await new Promise(r => setTimeout(r, 300));
      log("📤 Enviando InitiateCheckout...");
      await trackTikTokEvent({ event: "InitiateCheckout", properties: { content_id: "sim-test", content_name: "Mesa Dobrável Retrátil", value: 87.6, currency: "BRL", _test: true } });
      log("✅ InitiateCheckout enviado");

      await new Promise(r => setTimeout(r, 300));
      log("📤 Enviando Purchase...");
      await trackTikTokEvent({ event: "Purchase", properties: { content_id: "sim-test", content_name: "Mesa Dobrável Retrátil", value: 87.6, currency: "BRL", order_id: `sim-${Date.now()}`, _test: true } });
      log("✅ Purchase enviado");

      // Verify persistence
      log("");
      log("🔗 Verificação de persistência:");
      const vAfter = localStorage.getItem("mesalar_visitor_id") || "";
      const cAfter = sessionStorage.getItem("mesalar_click_id") || "";
      log(`   visitor_id: ${vAfter ? "✅ mantido" : "❌ PERDIDO"}`);
      log(`   click_id: ${cAfter ? "✅ mantido" : "❌ PERDIDO"}`);
      log(`   campaign: ${campaign !== "—" ? "✅ associado" : "ℹ️ sem campanha (normal sem UTM)"}`);
      log("");
      log("🎉 Simulação concluída!");
    } catch (err: any) {
      log(`❌ Erro: ${err?.message || "desconhecido"}`);
    }
    setSimulating(false);
  };

  // ── Recent TikTok-related events for log ──
  const recentTikTokEvents = useMemo(() => {
    return events
      .filter(e => TRACKED_INTERNAL.includes(e.event_type))
      .slice(0, 30)
      .map(e => ({
        type: e.event_type,
        eventId: e.event_data?.event_id || e.event_data?.visitor_id || "—",
        visitorId: e.event_data?.visitor_id || "—",
        campaign: e.event_data?.utm_campaign || "—",
        time: e.created_at,
      }));
  }, [events]);

  // ── Score color ──
  const scoreColor = diagnostics.score >= 80 ? "text-emerald-500" : diagnostics.score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = diagnostics.score >= 80 ? "bg-emerald-500/10" : diagnostics.score >= 50 ? "bg-amber-500/10" : "bg-red-500/10";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Add Pixel Form */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Adicionar Pixel
        </h2>
        <input
          placeholder="Nome do Pixel (ex: Campanha Principal)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-background"
        />
        <input
          placeholder="Pixel ID (ex: D6GM4RBC77UAAN00B800)"
          value={form.pixel_id}
          onChange={(e) => setForm({ ...form, pixel_id: e.target.value })}
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-background"
        />
        <input
          placeholder="Events API Access Token"
          value={form.api_token}
          onChange={(e) => setForm({ ...form, api_token: e.target.value })}
          type="password"
          className="w-full border rounded-lg px-4 py-2.5 text-sm bg-background"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
        >
          {adding ? "Adicionando..." : "Adicionar Pixel"}
        </button>
      </div>

      {/* Pixel List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Pixels cadastrados ({pixels.length})</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : pixels.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pixel cadastrado.</p>
        ) : (
          pixels.map((px) => (
            <div
              key={px.id}
              className={`rounded-xl border p-4 space-y-2 ${px.status === "active" ? "bg-card" : "bg-muted/30 opacity-60"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{px.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{px.pixel_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleStatus(px)} title="Alternar status">
                    {px.status === "active" ? (
                      <ToggleRight className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <button onClick={() => deletePixel(px.id)} title="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${px.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {px.status === "active" ? "Ativo" : "Inativo"}
                </span>
                <span className="text-muted-foreground">Token: {px.api_token.slice(0, 8)}...</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ═══════════ DIAGNÓSTICO DO PIXEL ═══════════ */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button
          onClick={() => setShowDiag(!showDiag)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Diagnóstico do Pixel
          </h2>
          <span className="text-xs text-muted-foreground">{showDiag ? "▲" : "▼"}</span>
        </button>

        {showDiag && (
          <div className="px-4 pb-4 space-y-5">

            {/* ── Health Score ── */}
            <div className={`rounded-xl p-4 ${scoreBg} flex items-center gap-4`}>
              <Gauge className={`h-10 w-10 ${scoreColor}`} />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pixel Health Score</p>
                <p className={`text-3xl font-black ${scoreColor}`}>{diagnostics.score} <span className="text-base font-medium text-muted-foreground">/ 100</span></p>
              </div>
            </div>

            {/* ── Status do Pixel ── */}
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Status do Pixel</h3>
              <div className="grid gap-2">
                {[
                  { label: "Pixels ativos", status: diagnostics.hasPixels ? "ok" : "error" as DiagStatus, detail: `${pixels.filter(p => p.status === "active").length} pixel(s)` },
                  { label: "SDK ttq carregado", status: diagnostics.ttqLoaded ? "ok" : "warn" as DiagStatus, detail: diagnostics.ttqLoaded ? "Sim" : "Não detectado (normal no admin)" },
                  { label: "Eventos recebidos", status: diagnostics.hasEvents ? "ok" : "warn" as DiagStatus, detail: `${diagnostics.totalEvents} eventos recentes` },
                  { label: "Event ID funcionando", status: diagnostics.eventIdCoverage > 80 ? "ok" : diagnostics.eventIdCoverage > 30 ? "warn" : "error" as DiagStatus, detail: `${diagnostics.eventIdCoverage}% cobertura` },
                  { label: "Advanced Matching ativo", status: diagnostics.extIdCoverage > 80 ? "ok" : diagnostics.extIdCoverage > 30 ? "warn" : "error" as DiagStatus, detail: `external_id: ${diagnostics.extIdCoverage}%` },
                  { label: "EMQ estimado", status: diagnostics.score >= 70 ? "ok" : diagnostics.score >= 40 ? "warn" : "error" as DiagStatus, detail: diagnostics.score >= 70 ? "Bom (70+)" : diagnostics.score >= 40 ? "Médio" : "Baixo" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={item.status} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Advanced Matching Coverage ── */}
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Shield className="h-3 w-3" /> Advanced Matching Coverage
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Email", value: diagnostics.emailCoverage },
                  { label: "Telefone", value: diagnostics.phoneCoverage },
                  { label: "External ID", value: diagnostics.extIdCoverage },
                ].map((item, i) => (
                  <div key={i} className="rounded-lg bg-muted/30 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`text-xl font-bold ${item.value >= 70 ? "text-emerald-500" : item.value >= 30 ? "text-amber-500" : "text-red-500"}`}>
                      {item.value}%
                    </p>
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1">
                      <div
                        className={`h-1.5 rounded-full transition-all ${item.value >= 70 ? "bg-emerald-500" : item.value >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Dedup & Click ID ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon status={diagnostics.dupCount === 0 ? "ok" : "warn"} />
                  <span className="text-sm font-medium">Deduplicação</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {diagnostics.dupCount === 0
                    ? "Nenhuma duplicação detectada"
                    : `${diagnostics.dupCount} possível(is) duplicação(ões) entre Pixel e Server API`}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon status={diagnostics.ttclidDetected || diagnostics.eventsWithTtclid > 0 ? "ok" : "warn"} />
                  <span className="text-sm font-medium">Click ID (ttclid)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {diagnostics.ttclidDetected
                    ? `Detectado: ${localStorage.getItem("tt_ttclid")?.slice(0, 20)}...`
                    : diagnostics.eventsWithTtclid > 0
                      ? `${diagnostics.eventsWithTtclid} eventos com click_id`
                      : "Não detectado (visitante sem ad click)"}
                </p>
              </div>
            </div>

            {/* ── Alertas ── */}
            {diagnostics.eventIdCoverage < 80 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Event ID com cobertura baixa</p>
                  <p className="text-xs text-amber-600/80">Isso pode causar duplicação de eventos. Verifique se o event_id está sendo gerado em todos os eventos.</p>
                </div>
              </div>
            )}
            {diagnostics.dupCount > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Possível duplicação de eventos</p>
                  <p className="text-xs text-amber-600/80">Detectamos {diagnostics.dupCount} evento(s) do mesmo tipo enviados em menos de 2s para o mesmo visitante.</p>
                </div>
              </div>
            )}

            {/* ── Teste de Eventos ── */}
            <div className="space-y-2">
              <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3" /> Teste de Eventos
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={runPixelTest}
                  disabled={testing}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> {testing ? "Testando..." : "Testar Pixel"}
                </button>
                <button
                  onClick={simulateConversion}
                  disabled={simulating}
                  className="flex-1 flex items-center justify-center gap-2 bg-muted text-foreground py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 border"
                >
                  <Link2 className="h-4 w-4" /> {simulating ? "Simulando..." : "Simular Conversão"}
                </button>
              </div>

              {testResults.length > 0 && (
                <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Resultado do Teste:</p>
                  {testResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <StatusIcon status={r.status} />
                      <span className="font-mono text-xs">{r.event}</span>
                      <span className="text-xs text-muted-foreground">— {r.msg}</span>
                    </div>
                  ))}
                </div>
              )}

              {simResults.length > 0 && (
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Simulação de Conversão:</p>
                  <div className="font-mono text-xs space-y-0.5 max-h-[200px] overflow-y-auto">
                    {simResults.map((line, i) => (
                      <p key={i} className={line.startsWith("❌") ? "text-red-500" : line.startsWith("⚠") ? "text-amber-500" : "text-foreground"}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Log de Eventos Recentes ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Search className="h-3 w-3" /> Eventos Recentes ({recentTikTokEvents.length})
                </h3>
                <button onClick={fetchRecentEvents} className="text-xs text-primary hover:underline">
                  Atualizar
                </button>
              </div>
              {eventsLoading ? (
                <p className="text-xs text-muted-foreground">Carregando...</p>
              ) : recentTikTokEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum evento recente encontrado.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Evento</th>
                          <th className="text-left px-3 py-2 font-medium">Visitor ID</th>
                          <th className="text-left px-3 py-2 font-medium">Campanha</th>
                          <th className="text-left px-3 py-2 font-medium">Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTikTokEvents.map((ev, i) => (
                          <tr key={i} className="border-t border-border/30 hover:bg-muted/20">
                            <td className="px-3 py-1.5 font-mono">{ev.type}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{String(ev.visitorId).slice(0, 18)}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{String(ev.campaign).slice(0, 25)}</td>
                            <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">
                              {new Date(ev.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
