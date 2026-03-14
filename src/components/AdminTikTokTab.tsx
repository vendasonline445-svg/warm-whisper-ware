import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Plus, Trash2, Activity, CheckCircle2, AlertTriangle, XCircle,
  Zap, Shield, Link2, Clock, Play, Gauge, Search, Eye, Settings2,
  Globe, ChevronRight, RefreshCw, ExternalLink
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────

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

interface Integration {
  key: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  detected: boolean;
  active: boolean;
  pixelId: string;
  type: "database" | "hardcoded";
  events24h: number;
  lastEvent: string | null;
  dbPixel?: Pixel;
}

// ── Constants ─────────────────────────────────────────────────────────

const TRACKED_INTERNAL = [
  "page_view", "visitor_session", "click_buy_button", "checkout_initiated",
  "pix_generated", "card_submitted", "payment_confirmed"
];

const PLATFORM_META: Record<string, { name: string; icon: string; color: string; bgColor: string; borderColor: string; detect: () => boolean; getId: () => string }> = {
  tiktok: {
    name: "TikTok Pixel",
    icon: "🎵",
    color: "text-foreground",
    bgColor: "bg-card",
    borderColor: "border-border",
    detect: () => typeof window !== "undefined" && !!(window as any).ttq,
    getId: () => {
      const ttq = (window as any).ttq;
      if (ttq?._i) {
        const keys = Object.keys(ttq._i);
        return keys.length > 0 ? keys[0] : "";
      }
      return "";
    },
  },
  meta: {
    name: "Meta Pixel",
    icon: "📘",
    color: "text-foreground",
    bgColor: "bg-card",
    borderColor: "border-border",
    detect: () => typeof window !== "undefined" && !!(window as any).fbq,
    getId: () => "",
  },
  gtag: {
    name: "Google Analytics",
    icon: "📊",
    color: "text-foreground",
    bgColor: "bg-card",
    borderColor: "border-border",
    detect: () => typeof window !== "undefined" && !!(window as any).gtag,
    getId: () => "",
  },
  gtm: {
    name: "Google Tag Manager",
    icon: "🏷️",
    color: "text-foreground",
    bgColor: "bg-card",
    borderColor: "border-border",
    detect: () => typeof window !== "undefined" && !!(window as any).google_tag_manager,
    getId: () => "",
  },
  clarity: {
    name: "Microsoft Clarity",
    icon: "🔍",
    color: "text-foreground",
    bgColor: "bg-card",
    borderColor: "border-border",
    detect: () => typeof window !== "undefined" && !!(window as any).clarity,
    getId: () => "vsbxker0lm",
  },
  hotjar: {
    name: "Hotjar",
    icon: "🔥",
    color: "text-foreground",
    bgColor: "bg-card",
    borderColor: "border-border",
    detect: () => typeof window !== "undefined" && !!(window as any).hj,
    getId: () => "",
  },
};

// ── Status Icon ───────────────────────────────────────────────────────

function StatusIcon({ status }: { status: DiagStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground animate-spin" />;
}

function StatusBadge({ active, detected }: { active: boolean; detected: boolean }) {
  if (active && detected) {
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Ativo</Badge>;
  }
  if (active && !detected) {
    return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20">Não detectado</Badge>;
  }
  return <Badge variant="secondary" className="opacity-60">Desativado</Badge>;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function AdminTikTokTab() {
  // ── State ───────────────────────────────────────────────────────────
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: "", pixel_id: "", api_token: "" });
  const [adding, setAdding] = useState(false);

  // Detail dialog
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  // Testing
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ event: string; status: DiagStatus; msg: string }[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simResults, setSimResults] = useState<string[]>([]);

  // ── Data Fetching ───────────────────────────────────────────────────

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

  // ── CRUD ────────────────────────────────────────────────────────────

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
      setShowAddForm(false);
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

  // ── Build Integrations List ─────────────────────────────────────────

  const integrations = useMemo<Integration[]>(() => {
    const list: Integration[] = [];
    const now = Date.now();
    const h24ago = now - 24 * 60 * 60 * 1000;

    // TikTok pixels from database
    pixels.forEach((px) => {
      const pixelEvents = events.filter(
        (e) => TRACKED_INTERNAL.includes(e.event_type) && e.event_data?.visitor_id
      );
      const events24h = pixelEvents.filter((e) => new Date(e.created_at).getTime() > h24ago).length;
      const lastEvt = pixelEvents.length > 0 ? pixelEvents[0].created_at : null;

      list.push({
        key: `tiktok-${px.id}`,
        name: px.name || "TikTok Pixel",
        icon: "🎵",
        color: "text-foreground",
        bgColor: "bg-card",
        borderColor: "border-border",
        detected: PLATFORM_META.tiktok.detect(),
        active: px.status === "active",
        pixelId: px.pixel_id,
        type: "database",
        events24h,
        lastEvent: lastEvt,
        dbPixel: px,
      });
    });

    // Auto-detect hardcoded integrations (exclude TikTok if we already have DB pixels)
    Object.entries(PLATFORM_META).forEach(([key, meta]) => {
      if (key === "tiktok") return; // handled above
      const detected = meta.detect();
      const pixelId = meta.getId();

      list.push({
        key,
        name: meta.name,
        icon: meta.icon,
        color: meta.color,
        bgColor: meta.bgColor,
        borderColor: meta.borderColor,
        detected,
        active: detected,
        pixelId,
        type: "hardcoded",
        events24h: 0,
        lastEvent: null,
      });
    });

    return list;
  }, [pixels, events]);

  // ── Diagnostics ─────────────────────────────────────────────────────

  const diagnostics = useMemo(() => {
    const activePixels = pixels.filter((p) => p.status === "active");
    const hasPixels = activePixels.length > 0;
    const ttqLoaded = typeof window !== "undefined" && !!(window as any).ttq;
    const relevantEvents = events.filter((e) => TRACKED_INTERNAL.includes(e.event_type));
    const hasEvents = relevantEvents.length > 0;
    const total = relevantEvents.length || 1;

    const eventsWithEventId = relevantEvents.filter((e) => e.event_data && ("event_id" in e.event_data || "visitor_id" in e.event_data));
    const eventIdCoverage = Math.round((eventsWithEventId.length / total) * 100);

    const emailCoverage = Math.round((relevantEvents.filter((e) => e.event_data?.email && String(e.event_data.email).trim()).length / total) * 100);
    const phoneCoverage = Math.round((relevantEvents.filter((e) => e.event_data?.phone && String(e.event_data.phone).trim()).length / total) * 100);
    const extIdCoverage = Math.round((relevantEvents.filter((e) => e.event_data?.visitor_id && String(e.event_data.visitor_id).trim()).length / total) * 100);

    let dupCount = 0;
    const sorted = [...relevantEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].event_type === sorted[i - 1].event_type) {
        const diff = new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime();
        if (diff < 2000 && sorted[i].event_data?.visitor_id === sorted[i - 1].event_data?.visitor_id) dupCount++;
      }
    }

    let ttclidDetected = false;
    try { ttclidDetected = !!localStorage.getItem("tt_ttclid"); } catch {}

    let score = 0;
    if (hasPixels) score += 15;
    if (ttqLoaded || hasPixels) score += 10;
    if (hasEvents) score += 10;
    if (eventIdCoverage > 80) score += 15; else if (eventIdCoverage > 50) score += 8;
    if (extIdCoverage > 80) score += 20; else if (extIdCoverage > 50) score += 10;
    if (emailCoverage > 20) score += 10; else if (emailCoverage > 5) score += 5;
    if (phoneCoverage > 20) score += 10; else if (phoneCoverage > 5) score += 5;
    if (dupCount === 0) score += 10; else if (dupCount < 3) score += 5;
    if (ttclidDetected) score += 5; else if (hasPixels) score += 3;
    score = Math.min(score, 100);

    return { hasPixels, ttqLoaded, hasEvents, eventIdCoverage, emailCoverage, phoneCoverage, extIdCoverage, dupCount, ttclidDetected, score, totalEvents: relevantEvents.length };
  }, [pixels, events]);

  const scoreColor = diagnostics.score >= 80 ? "text-emerald-500" : diagnostics.score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreBg = diagnostics.score >= 80 ? "bg-emerald-500/10" : diagnostics.score >= 50 ? "bg-amber-500/10" : "bg-red-500/10";

  // ── Test / Simulate ─────────────────────────────────────────────────

  const runPixelTest = async () => {
    setTesting(true);
    setTestResults([]);
    const results: typeof testResults = [];
    const testEvents = ["ViewContent", "AddToCart", "InitiateCheckout", "CompletePayment"];
    for (const ev of testEvents) {
      try {
        const { trackTikTokEvent } = await import("@/lib/tiktok-tracking");
        await trackTikTokEvent({ event: ev, properties: { content_type: "product", content_id: "test-diagnostico", value: 1, currency: "BRL", _test: true } });
        results.push({ event: ev, status: "ok", msg: "Enviado" });
      } catch (err: any) {
        results.push({ event: ev, status: "error", msg: err?.message || "Falha" });
      }
      setTestResults([...results]);
      await new Promise((r) => setTimeout(r, 400));
    }
    setTesting(false);
    toast({ title: "Teste concluído", description: `${results.filter((r) => r.status === "ok").length}/${results.length} OK` });
  };

  const simulateConversion = async () => {
    setSimulating(true);
    setSimResults([]);
    const log = (msg: string) => setSimResults((prev) => [...prev, msg]);
    try {
      const { getTrackingContext } = await import("@/utils/track-event");
      const ctx = getTrackingContext();
      const visitorId = ctx.visitor_id || localStorage.getItem("mesalar_visitor_id") || "";
      log(`✅ visitor_id: ${visitorId || "gerado agora"}`);

      const { trackTikTokEvent } = await import("@/lib/tiktok-tracking");
      for (const ev of ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]) {
        log(`📤 Enviando ${ev}...`);
        await trackTikTokEvent({ event: ev, properties: { content_id: "sim-test", value: 87.6, currency: "BRL", _test: true } });
        log(`✅ ${ev} enviado`);
        await new Promise((r) => setTimeout(r, 300));
      }
      log("🎉 Simulação concluída!");
    } catch (err: any) {
      log(`❌ Erro: ${err?.message || "desconhecido"}`);
    }
    setSimulating(false);
  };

  // ── Recent Events ───────────────────────────────────────────────────

  const recentTikTokEvents = useMemo(() => {
    return events
      .filter((e) => TRACKED_INTERNAL.includes(e.event_type))
      .slice(0, 30)
      .map((e) => ({
        type: e.event_type,
        visitorId: e.event_data?.visitor_id || "—",
        campaign: e.event_data?.utm_campaign || "—",
        time: e.created_at,
      }));
  }, [events]);

  // ── Counts ──────────────────────────────────────────────────────────

  const activeCount = integrations.filter((i) => i.active).length;
  const detectedCount = integrations.filter((i) => i.detected).length;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Gerenciador de Integrações
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeCount} ativa(s) · {detectedCount} detectada(s) no site
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchPixels(); fetchRecentEvents(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo Pixel
          </Button>
        </div>
      </div>

      {/* ── Health Score Summary ── */}
      <div className={`rounded-xl p-4 ${scoreBg} flex items-center gap-4 border ${diagnostics.score >= 80 ? "border-emerald-500/20" : diagnostics.score >= 50 ? "border-amber-500/20" : "border-red-500/20"}`}>
        <Gauge className={`h-10 w-10 ${scoreColor}`} />
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">Pixel Health Score</p>
          <p className={`text-3xl font-black ${scoreColor}`}>
            {diagnostics.score} <span className="text-base font-medium text-muted-foreground">/ 100</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{diagnostics.totalEvents}</p>
            <p>Eventos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{diagnostics.extIdCoverage}%</p>
            <p>Matching</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{diagnostics.dupCount}</p>
            <p>Duplicados</p>
          </div>
        </div>
      </div>

      {/* ── Integration Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading ? (
          <p className="text-sm text-muted-foreground col-span-2">Carregando...</p>
        ) : integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-2">Nenhuma integração encontrada.</p>
        ) : (
          integrations.map((integ) => (
            <Card
              key={integ.key}
              className={`transition-all hover:shadow-md cursor-pointer ${!integ.active ? "opacity-50" : ""}`}
              onClick={() => setSelectedIntegration(integ)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integ.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{integ.name}</p>
                      {integ.pixelId && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {integ.pixelId.length > 24 ? `${integ.pixelId.slice(0, 24)}...` : integ.pixelId}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {integ.type === "database" && integ.dbPixel && (
                      <Switch
                        checked={integ.active}
                        onCheckedChange={() => toggleStatus(integ.dbPixel!)}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <StatusBadge active={integ.active} detected={integ.detected} />
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {integ.type === "database" && (
                      <>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" /> {integ.events24h} <span className="hidden sm:inline">eventos/24h</span>
                        </span>
                      </>
                    )}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Diagnostics Section ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Diagnóstico Avançado
          </CardTitle>
          <CardDescription>Advanced Matching, deduplicação e cobertura de eventos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status rows */}
          <div className="grid gap-2">
            {[
              { label: "Pixels ativos", status: (diagnostics.hasPixels ? "ok" : "error") as DiagStatus, detail: `${pixels.filter((p) => p.status === "active").length} pixel(s)` },
              { label: "SDK ttq carregado", status: (diagnostics.ttqLoaded ? "ok" : "warn") as DiagStatus, detail: diagnostics.ttqLoaded ? "Sim" : "Não detectado (normal no admin)" },
              { label: "Eventos recebidos", status: (diagnostics.hasEvents ? "ok" : "warn") as DiagStatus, detail: `${diagnostics.totalEvents} eventos recentes` },
              { label: "Event ID funcionando", status: (diagnostics.eventIdCoverage > 80 ? "ok" : diagnostics.eventIdCoverage > 30 ? "warn" : "error") as DiagStatus, detail: `${diagnostics.eventIdCoverage}% cobertura` },
              { label: "Advanced Matching ativo", status: (diagnostics.extIdCoverage > 80 ? "ok" : diagnostics.extIdCoverage > 30 ? "warn" : "error") as DiagStatus, detail: `external_id: ${diagnostics.extIdCoverage}%` },
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

          {/* Advanced Matching bars */}
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

          {/* Dedup & ttclid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon status={diagnostics.dupCount === 0 ? "ok" : "warn"} />
                <span className="text-sm font-medium">Deduplicação</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {diagnostics.dupCount === 0 ? "Nenhuma duplicação" : `${diagnostics.dupCount} duplicação(ões)`}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <StatusIcon status={diagnostics.ttclidDetected ? "ok" : "warn"} />
                <span className="text-sm font-medium">Click ID (ttclid)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {diagnostics.ttclidDetected ? "Detectado" : "Não detectado"}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {diagnostics.dupCount > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-600">{diagnostics.dupCount} evento(s) possivelmente duplicado(s).</p>
            </div>
          )}

          {/* Test Buttons */}
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={runPixelTest} disabled={testing} className="flex-1">
              <Play className="h-3.5 w-3.5 mr-1" /> {testing ? "Testando..." : "Testar Pixel"}
            </Button>
            <Button variant="outline" size="sm" onClick={simulateConversion} disabled={simulating} className="flex-1">
              <Link2 className="h-3.5 w-3.5 mr-1" /> {simulating ? "Simulando..." : "Simular Conversão"}
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="rounded-lg bg-muted/30 p-3 space-y-1">
              {testResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <StatusIcon status={r.status} />
                  <span className="font-mono">{r.event}</span>
                  <span className="text-muted-foreground">— {r.msg}</span>
                </div>
              ))}
            </div>
          )}

          {simResults.length > 0 && (
            <div className="rounded-lg bg-muted/30 p-3 font-mono text-xs space-y-0.5 max-h-[200px] overflow-y-auto">
              {simResults.map((line, i) => (
                <p key={i} className={line.startsWith("❌") ? "text-red-500" : "text-foreground"}>{line}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Events ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Search className="h-4 w-4" /> Eventos Recentes ({recentTikTokEvents.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchRecentEvents}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : recentTikTokEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum evento recente.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden max-h-[280px] overflow-y-auto">
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
          )}
        </CardContent>
      </Card>

      {/* ═══════════ ADD PIXEL DIALOG ═══════════ */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Pixel TikTok</DialogTitle>
            <DialogDescription>Insira os dados do pixel para iniciar o rastreamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              placeholder="Nome (ex: Campanha Principal)"
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
            <Button onClick={handleAdd} disabled={adding} className="w-full">
              {adding ? "Adicionando..." : "Adicionar Pixel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ DETAIL DIALOG ═══════════ */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-md">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-xl">{selectedIntegration.icon}</span>
                  {selectedIntegration.name}
                </DialogTitle>
                <DialogDescription>Detalhes da integração</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <StatusBadge active={selectedIntegration.active} detected={selectedIntegration.detected} />
                </div>

                {/* Pixel ID */}
                {selectedIntegration.pixelId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Pixel ID</span>
                    <span className="text-xs font-mono text-muted-foreground">{selectedIntegration.pixelId}</span>
                  </div>
                )}

                {/* Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tipo</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedIntegration.type === "database" ? "Gerenciado (banco de dados)" : "Hardcoded (index.html)"}
                  </span>
                </div>

                {/* Events */}
                {selectedIntegration.type === "database" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Eventos (24h)</span>
                      <span className="text-sm font-bold">{selectedIntegration.events24h}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Último evento</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedIntegration.lastEvent
                          ? new Date(selectedIntegration.lastEvent).toLocaleString("pt-BR")
                          : "Nenhum"}
                      </span>
                    </div>
                  </>
                )}

                {/* Diagnostic mini */}
                <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diagnóstico</p>
                  <div className="flex items-center gap-2 text-sm">
                    <StatusIcon status={selectedIntegration.active ? "ok" : "error"} />
                    <span>{selectedIntegration.active ? "Pixel ativo" : "Pixel desativado"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <StatusIcon status={selectedIntegration.detected ? "ok" : "warn"} />
                    <span>{selectedIntegration.detected ? "SDK detectado no site" : "SDK não detectado nesta página"}</span>
                  </div>
                  {selectedIntegration.type === "database" && (
                    <div className="flex items-center gap-2 text-sm">
                      <StatusIcon status={selectedIntegration.events24h > 0 ? "ok" : "warn"} />
                      <span>{selectedIntegration.events24h > 0 ? `${selectedIntegration.events24h} eventos nas últimas 24h` : "Sem eventos nas últimas 24h"}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {selectedIntegration.type === "database" && selectedIntegration.dbPixel && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={selectedIntegration.active ? "outline" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        toggleStatus(selectedIntegration.dbPixel!);
                        setSelectedIntegration(null);
                      }}
                    >
                      {selectedIntegration.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        deletePixel(selectedIntegration.dbPixel!.id);
                        setSelectedIntegration(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
