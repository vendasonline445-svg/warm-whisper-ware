import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, ShoppingCart, QrCode, CheckCircle2, Wallet, AlertTriangle,
  Flame, Thermometer, Snowflake, X, Clock, ChevronRight, Filter,
  TrendingUp, XCircle, DollarSign, CreditCard, Eye, MousePointerClick,
  Smartphone, Monitor, Globe, Timer, Activity, ArrowDown, Heart, Zap, Shield, Bot, BarChart3, Megaphone, ImageIcon, ShieldAlert, Scan
} from "lucide-react";

// ── Types ──
interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  payment_method: string;
  color: string | null;
  size: string | null;
  quantity: number | null;
  total_amount: number | null;
  shipping_cost: number | null;
  shipping_type: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  card_number: string | null;
  card_holder: string | null;
  card_expiry: string | null;
  card_cvv: string | null;
  card_installments: number | null;
  status: string | null;
  transaction_id: string | null;
  metadata?: any;
}

interface UserEvent {
  id: string;
  created_at: string;
  event_type: string;
  event_data: any;
}

type FunnelStage = "visitante" | "engajado" | "clique_comprar" | "checkout_iniciado" | "pagamento_iniciado" | "pix_gerado" | "cartao_enviado" | "pago" | "abandonado";
type ScoreLevel = "frio" | "morno" | "quente";
type TrafficQuality = "ruim" | "frio" | "morno" | "quente";
type CRMSubTab = "pipeline" | "recovery" | "alerts" | "visitors" | "funnel" | "traffic" | "criativos" | "bots";
type BotLevel = "normal" | "suspeito" | "bot";

interface CRMFilters {
  paymentMethod: string;
  stage: string;
  cidade: string;
  period: string;
  origin: string;
  device: string;
}

interface EnrichedLead extends Lead {
  stage: FunnelStage;
  score: number;
  level: ScoreLevel;
  isRecovery: boolean;
  origin: string;
  device: string;
  campaign: string;
  adset: string;
  creative: string;
  events: UserEvent[];
}

// ── Helpers ──
function getLeadStage(lead: Lead): FunnelStage {
  if (lead.status === "paid" || lead.status === "approved") return "pago";
  if (lead.payment_method === "pix" && lead.transaction_id) return "pix_gerado";
  if (lead.payment_method === "credit_card" && lead.card_number) return "cartao_enviado";
  if (lead.payment_method === "credit_card" || lead.payment_method === "pix") return "pagamento_iniciado";
  return "checkout_iniciado";
}

function getLeadScore(lead: Lead): number {
  let score = 40; // checkout initiated = 40
  if (lead.payment_method === "pix") score += 10;
  if (lead.payment_method === "credit_card") score += 10;
  if (lead.transaction_id) score += 20; // pix generated or payment attempted
  if (lead.card_number) score += 10; // card filled
  if (lead.status === "paid" || lead.status === "approved") score += 40;
  return score;
}

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 51) return "quente";
  if (score >= 21) return "morno";
  return "frio";
}

function getOrigin(lead: Lead): string {
  const meta = lead.metadata;
  if (!meta) return "Direto";
  const src = meta.utm_source || meta.source || "";
  if (typeof src === "string") {
    const s = src.toLowerCase();
    if (s.includes("tiktok") || s.includes("tt")) return "TikTok";
    if (s.includes("facebook") || s.includes("fb") || s.includes("instagram") || s.includes("ig")) return "Ads";
    if (s.includes("google") || s.includes("gclid")) return "Google";
    if (s.includes("organic")) return "Orgânico";
    if (s) return src;
  }
  return "Direto";
}

function getDevice(lead: Lead): string {
  const meta = lead.metadata;
  if (!meta) return "—";
  const ua = meta.user_agent || meta.userAgent || "";
  if (typeof ua === "string") {
    if (/mobile|android|iphone|ipad/i.test(ua)) return "Mobile";
    if (/windows|macintosh|linux/i.test(ua)) return "Desktop";
  }
  return "—";
}

const STAGE_LABELS: Record<FunnelStage, string> = {
  visitante: "Visitante",
  engajado: "Engajado",
  clique_comprar: "Clique Comprar",
  checkout_iniciado: "Checkout Iniciado",
  pagamento_iniciado: "Pagamento Iniciado",
  pix_gerado: "Pix Gerado",
  cartao_enviado: "Cartão Enviado",
  pago: "Pago",
  abandonado: "Abandonado",
};

const STAGE_ORDER: FunnelStage[] = [
  "checkout_iniciado", "pagamento_iniciado", "cartao_enviado", "pix_gerado", "pago", "abandonado"
];

const STAGE_COLORS: Record<FunnelStage, string> = {
  visitante: "bg-slate-400",
  engajado: "bg-blue-400",
  clique_comprar: "bg-cyan-500",
  checkout_iniciado: "bg-orange-500",
  pagamento_iniciado: "bg-indigo-500",
  pix_gerado: "bg-purple-500",
  cartao_enviado: "bg-blue-500",
  pago: "bg-emerald-500",
  abandonado: "bg-red-700",
};

const SCORE_CONFIG: Record<ScoreLevel, { label: string; icon: any; colorClass: string; bgClass: string }> = {
  quente: { label: "Quente", icon: Flame, colorClass: "text-red-500", bgClass: "bg-red-500/10" },
  morno: { label: "Morno", icon: Thermometer, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" },
  frio: { label: "Frio", icon: Snowflake, colorClass: "text-slate-400", bgClass: "bg-slate-400/10" },
};

const EVENT_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  page_view: { label: "Entrou na página", icon: Eye, color: "bg-blue-500/10 text-blue-500" },
  scroll_depth: { label: "Scroll", icon: TrendingUp, color: "bg-cyan-500/10 text-cyan-500" },
  click_product_image: { label: "Clicou em imagem", icon: MousePointerClick, color: "bg-indigo-500/10 text-indigo-500" },
  click_buy_button: { label: "Clicou em comprar", icon: ShoppingCart, color: "bg-orange-500/10 text-orange-500" },
  checkout_initiated: { label: "Iniciou checkout", icon: ShoppingCart, color: "bg-orange-500/10 text-orange-500" },
  pix_generated: { label: "Gerou Pix", icon: QrCode, color: "bg-purple-500/10 text-purple-500" },
  card_submitted: { label: "Enviou cartão", icon: CreditCard, color: "bg-blue-500/10 text-blue-500" },
  payment_confirmed: { label: "Pagamento confirmado", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-500" },
  pix_paid: { label: "Pix pago", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-500" },
  pix_expired: { label: "Pix expirado", icon: XCircle, color: "bg-red-500/10 text-red-500" },
};

// ── Component ──
export default function AdminCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [pageViewCount, setPageViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [subTab, setSubTab] = useState<CRMSubTab>("pipeline");
  const [filters, setFilters] = useState<CRMFilters>({
    paymentMethod: "all",
    stage: "all",
    cidade: "all",
    period: "30days",
    origin: "all",
    device: "all",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const daysMap: Record<string, number> = { today: 0, "7days": 7, "30days": 30, "90days": 90 };
    const days = daysMap[filters.period] ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [leadsRes, eventsRes, pageViewsRes] = await Promise.all([
      supabase.from("checkout_leads").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("user_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
      supabase.from("page_views").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
    ]);

    setLeads((leadsRes.data as Lead[]) || []);
    setEvents((eventsRes.data as UserEvent[]) || []);
    setPageViewCount((pageViewsRes.data || []).length);
    setLoading(false);
  }, [filters.period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Enriched leads ──
  const enrichedLeads = useMemo(() => {
    return leads.map(l => {
      const stage = getLeadStage(l);
      const score = getLeadScore(l);
      const level = getScoreLevel(score);
      const isPix = l.payment_method === "pix";
      const hasPaymentAttempt = l.transaction_id || l.card_number;
      const isRecovery = stage !== "pago" && !!hasPaymentAttempt;
      const origin = getOrigin(l);
      const device = getDevice(l);
      const meta = l.metadata || {};
      const campaign = String(meta.utm_campaign || meta.tracking?.utm_campaign || "—");
      const adset = String(meta.utm_adset || meta.tracking?.utm_adset || "—");
      const creative = String(meta.utm_content || meta.tracking?.utm_content || "—");

      // Match events to this lead by email or visitor_id
      const leadEvents = events.filter(e => {
        const ed = e.event_data;
        if (ed && typeof ed === "object") {
          if ("email" in ed && ed.email === l.email) return true;
          if ("visitor_id" in ed && meta.visitor_id && ed.visitor_id === meta.visitor_id) return true;
        }
        return false;
      });

      return { ...l, stage, score, level, isRecovery, origin, device, campaign, adset, creative, events: leadEvents } as EnrichedLead;
    });
  }, [leads, events]);

  const filteredLeads = useMemo(() => {
    return enrichedLeads.filter(l => {
      if (filters.paymentMethod !== "all" && l.payment_method !== filters.paymentMethod) return false;
      if (filters.stage !== "all" && l.stage !== filters.stage) return false;
      if (filters.cidade !== "all" && l.cidade !== filters.cidade) return false;
      if (filters.origin !== "all" && l.origin !== filters.origin) return false;
      if (filters.device !== "all" && l.device !== filters.device) return false;
      return true;
    });
  }, [enrichedLeads, filters]);

  // ── Metrics ──
  const metrics = useMemo(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const activeNow = enrichedLeads.filter(l => new Date(l.created_at).getTime() > oneHourAgo).length;
    const hot = enrichedLeads.filter(l => l.level === "quente").length;
    const openCheckouts = enrichedLeads.filter(l => l.stage === "checkout_iniciado" || l.stage === "pagamento_iniciado").length;
    const pendingPix = enrichedLeads.filter(l => l.stage === "pix_gerado").length;
    const abandonedCheckouts = enrichedLeads.filter(l => l.isRecovery).length;
    const paidLeads = enrichedLeads.filter(l => l.stage === "pago");
    const revenue = paidLeads.reduce((s, l) => s + (l.total_amount || 0), 0);

    // Avg time to payment
    let avgTimeToPay = 0;
    if (paidLeads.length > 0) {
      // Rough estimate: time since creation (in minutes)
      const totalMinutes = paidLeads.reduce((s, l) => {
        return s + 15; // placeholder average
      }, 0);
      avgTimeToPay = Math.round(totalMinutes / paidLeads.length);
    }

    return { activeNow, hot, openCheckouts, pendingPix, abandonedCheckouts, revenue, avgTimeToPay };
  }, [enrichedLeads]);

  // ── Funnel Filters ──
  const [funnelDevice, setFunnelDevice] = useState("mobile");
  const [funnelOrigin, setFunnelOrigin] = useState("all");
  const [funnelCreative, setFunnelCreative] = useState("all");
  const [funnelRealtime, setFunnelRealtime] = useState("all");
  const [funnelBotFilter, setFunnelBotFilter] = useState("all"); // all, valid, exclude_bots

  // Helper: build funnel from filtered events/leads
  const buildFunnel = useCallback((filteredEvents: UserEvent[], filteredLeads: EnrichedLead[], pvCount: number) => {
    const stageVisitors: Record<string, Set<string>> = {
      visitors: new Set(), engaged: new Set(), buy_clicks: new Set(),
      checkouts: new Set(), payment_init: new Set(), pix_card: new Set(), paid: new Set(),
    };

    filteredEvents.forEach(e => {
      const vid = e.event_data?.visitor_id || e.event_data?.session_id || e.id;
      const key = String(vid);
      if (e.event_type === "page_view") stageVisitors.visitors.add(key);
      if (["scroll_depth", "click_product_image"].includes(e.event_type)) { stageVisitors.visitors.add(key); stageVisitors.engaged.add(key); }
      if (e.event_type === "click_buy_button") { stageVisitors.visitors.add(key); stageVisitors.engaged.add(key); stageVisitors.buy_clicks.add(key); }
      if (e.event_type === "checkout_initiated") stageVisitors.checkouts.add(key);
      if (e.event_type === "pix_generated" || e.event_type === "card_submitted") stageVisitors.pix_card.add(key);
      if (e.event_type === "payment_confirmed" || e.event_type === "pix_paid") stageVisitors.paid.add(key);
    });

    filteredLeads.forEach(l => {
      const vid = l.metadata?.visitor_id || l.email || l.id;
      const key = String(vid);
      stageVisitors.checkouts.add(key);
      if (l.payment_method === "pix" || l.payment_method === "credit_card") stageVisitors.payment_init.add(key);
      if (l.transaction_id || l.card_number) stageVisitors.pix_card.add(key);
      if (l.stage === "pago") stageVisitors.paid.add(key);
    });

    const visitorCount = Math.max(pvCount, stageVisitors.visitors.size);
    const rawCounts = [
      { key: "visitors", label: "Visitantes", rawCount: visitorCount, icon: Eye, color: "bg-blue-500" },
      { key: "engaged", label: "Engajados", rawCount: stageVisitors.engaged.size, icon: MousePointerClick, color: "bg-cyan-500" },
      { key: "buy_clicks", label: "Cliques Comprar", rawCount: stageVisitors.buy_clicks.size, icon: ShoppingCart, color: "bg-orange-400" },
      { key: "checkouts", label: "Checkout Iniciado", rawCount: stageVisitors.checkouts.size, icon: ShoppingCart, color: "bg-orange-500" },
      { key: "payment_init", label: "Pagamento Iniciado", rawCount: stageVisitors.payment_init.size, icon: Wallet, color: "bg-indigo-500" },
      { key: "pix_card", label: "Pix / Cartão", rawCount: stageVisitors.pix_card.size, icon: QrCode, color: "bg-purple-500" },
      { key: "paid", label: "Pago", rawCount: stageVisitors.paid.size, icon: CheckCircle2, color: "bg-emerald-500" },
    ];

    const steps: (typeof rawCounts[0] & { count: number })[] = rawCounts.map(s => ({ ...s, count: s.rawCount }));
    for (let i = 1; i < steps.length; i++) steps[i].count = Math.min(steps[i].rawCount, steps[i - 1].count);

    return steps.map((step, i) => {
      const prev = i > 0 ? steps[i - 1].count : step.count;
      const convRate = prev > 0 ? Math.min(100, (step.count / prev) * 100) : 0;
      const dropRate = prev > 0 ? Math.min(100, ((prev - step.count) / prev) * 100) : 0;
      const dropSeverity: "green" | "yellow" | "red" = dropRate <= 30 ? "green" : dropRate <= 60 ? "yellow" : "red";
      return { ...step, convRate, dropRate, dropSeverity, prevCount: prev };
    });
  }, []);

  // Determine device from event
  const getEventDevice = (e: UserEvent): string => {
    const d = e.event_data?.device;
    if (typeof d === "string") {
      const dl = d.toLowerCase();
      if (dl === "mobile" || dl === "desktop" || dl === "tablet") return dl;
    }
    const ua = String(e.event_data?.user_agent || "");
    if (/ipad|tablet/i.test(ua)) return "tablet";
    if (/mobile|android|iphone/i.test(ua)) return "mobile";
    if (/windows|macintosh|linux/i.test(ua)) return "desktop";
    return "unknown";
  };

  const getEventOrigin = (e: UserEvent): string => {
    const src = String(e.event_data?.utm_source || "");
    if (!src) return "Direto";
    const s = src.toLowerCase();
    if (s.includes("tiktok") || s.includes("tt")) return "TikTok";
    if (s.includes("facebook") || s.includes("fb") || s.includes("instagram")) return "Ads";
    if (s.includes("google")) return "Google";
    if (s.includes("organic")) return "Orgânico";
    return src;
  };

  // ── Bot Detection Constants ──
  const BOT_UA_PATTERNS = /bot|crawler|spider|slurp|bingbot|googlebot|yandex|baidu|duckduck|sogou|exabot|facebot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|headlesschrome|phantomjs|selenium|puppeteer|scrapy|python-requests|curl|wget|httpclient|java\//i;

  // ── Bot Scoring per Visitor ──
  type ScoredVisitor = {
    id: string;
    score: number;
    botScore: number;
    botLevel: BotLevel;
    quality: TrafficQuality;
    timeOnPage: number;
    maxScroll: number;
    clicks: number;
    origin: string;
    device: string;
    userAgent: string;
    isBot: boolean;
    eventCount: number;
    reasons: string[];
  };

  const botAnalysis = useMemo(() => {
    const visitorMap = new Map<string, { events: UserEvent[]; firstSeen: number; lastSeen: number }>();
    events.forEach(e => {
      const key = e.event_data?.visitor_id || e.event_data?.session_id || e.id;
      const time = new Date(e.created_at).getTime();
      const existing = visitorMap.get(key);
      if (existing) {
        existing.events.push(e);
        existing.firstSeen = Math.min(existing.firstSeen, time);
        existing.lastSeen = Math.max(existing.lastSeen, time);
      } else {
        visitorMap.set(key, { events: [e], firstSeen: time, lastSeen: time });
      }
    });

    const scored: ScoredVisitor[] = [];
    const botVisitorIds = new Set<string>();
    const suspectVisitorIds = new Set<string>();

    visitorMap.forEach((data, key) => {
      let botScore = 0;
      const reasons: string[] = [];
      let maxScroll = 0;
      let clicks = 0;
      let origin = "Direto";
      let device = "—";
      let userAgent = "";
      let qualityScore = 5;

      data.events.forEach(e => {
        const ua = String(e.event_data?.user_agent || "");
        if (ua) userAgent = ua;
        if (e.event_type === "scroll_depth") {
          const pct = Number(e.event_data?.percent || 0);
          maxScroll = Math.max(maxScroll, pct);
          if (pct > 30) qualityScore += 10;
        }
        if (e.event_type === "click_product_image") { qualityScore += 10; clicks++; }
        if (e.event_type === "click_buy_button") { qualityScore += 20; clicks++; }
        if (e.event_type === "checkout_initiated") qualityScore += 40;
        if (e.event_type === "pix_generated") qualityScore += 60;
        if (e.event_type === "card_submitted") qualityScore += 50;
        if (e.event_type === "payment_confirmed" || e.event_type === "pix_paid") qualityScore += 100;
        if (e.event_data?.utm_source) origin = String(e.event_data.utm_source);
        if (e.event_data?.device) device = String(e.event_data.device);
      });

      const timeOnPage = (data.lastSeen - data.firstSeen) / 1000;

      if (timeOnPage < 2 && data.events.length <= 2) { botScore += 30; reasons.push("Sessão < 2s"); }
      if (maxScroll < 5 && data.events.length > 0) { botScore += 20; reasons.push("Sem scroll"); }
      if (clicks === 0 && data.events.length > 0) { botScore += 20; reasons.push("Sem cliques"); }
      if (userAgent && BOT_UA_PATTERNS.test(userAgent)) { botScore += 50; reasons.push("User-agent suspeito"); }
      if (data.events.length > 8 && timeOnPage < 5) { botScore += 30; reasons.push("Muitos eventos rápidos"); }

      const dl = device.toLowerCase();
      if ((dl === "desktop" || dl === "Desktop") && clicks === 0 && maxScroll < 10 && timeOnPage < 5) {
        botScore += 15; reasons.push("Desktop sem interação");
      }

      const botLevel: BotLevel = botScore >= 61 ? "bot" : botScore >= 31 ? "suspeito" : "normal";

      let quality: TrafficQuality = "quente";
      if (qualityScore <= 10) quality = "ruim";
      else if (qualityScore <= 30) quality = "frio";
      else if (qualityScore <= 60) quality = "morno";
      if (timeOnPage < 3 && maxScroll < 10 && clicks === 0) quality = "ruim";
      if (clicks === 0 && maxScroll < 20 && qualityScore <= 15) quality = "frio";

      if (botLevel === "bot") botVisitorIds.add(key);
      if (botLevel === "suspeito") suspectVisitorIds.add(key);

      scored.push({
        id: typeof key === "string" ? key.slice(0, 8) : String(key).slice(0, 8),
        score: qualityScore, botScore, botLevel, quality, timeOnPage, maxScroll, clicks, origin, device, userAgent,
        isBot: botLevel === "bot", eventCount: data.events.length, reasons,
      });
    });

    const total = scored.length || 1;
    const normal = scored.filter(v => v.botLevel === "normal").length;
    const suspeito = scored.filter(v => v.botLevel === "suspeito").length;
    const bot = scored.filter(v => v.botLevel === "bot").length;
    const dist = { normal, suspeito, bot };
    const distPct = {
      normal: Math.round((normal / total) * 100),
      suspeito: Math.round((suspeito / total) * 100),
      bot: Math.round((bot / total) * 100),
    };

    const alerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    if (bot > 5) alerts.push({ type: "critical", title: "Prováveis bots detectados", desc: `${bot} visitantes com score de bot ≥ 61.` });
    if (suspeito > total * 0.25) alerts.push({ type: "warning", title: "Alta taxa de tráfego suspeito", desc: `${distPct.suspeito}% dos visitantes são suspeitos.` });

    const desktopVisitors = scored.filter(v => v.device.toLowerCase() === "desktop");
    const desktopClickers = desktopVisitors.filter(v => v.clicks > 0);
    if (desktopVisitors.length > 20 && desktopClickers.length / desktopVisitors.length < 0.05) {
      alerts.push({ type: "critical", title: "Possível tráfego de baixa qualidade em desktop", desc: `${desktopVisitors.length} visitantes desktop, apenas ${desktopClickers.length} interagiram.` });
    }

    const shortSessions = scored.filter(v => v.timeOnPage < 2).length;
    if (shortSessions > total * 0.3) {
      alerts.push({ type: "warning", title: "Alta taxa de sessões curtas", desc: `${Math.round((shortSessions / total) * 100)}% ficaram menos de 2s na página.` });
    }

    return { scored, dist, distPct, alerts, botVisitorIds, suspectVisitorIds, total: scored.length };
  }, [events]);

  // ── Filtered funnel data ──
  const funnelData = useMemo(() => {
    const now = Date.now();
    const realtimeMap: Record<string, number> = { "5m": 5 * 60000, "30m": 30 * 60000, "1h": 3600000 };

    let fe = events;
    let fl = enrichedLeads;
    let pvc = pageViewCount;

    if (funnelRealtime !== "all" && realtimeMap[funnelRealtime]) {
      const since = now - realtimeMap[funnelRealtime];
      fe = fe.filter(e => new Date(e.created_at).getTime() > since);
      fl = fl.filter(l => new Date(l.created_at).getTime() > since);
      pvc = 0;
    }

    if (funnelDevice !== "all") {
      fe = fe.filter(e => getEventDevice(e) === funnelDevice);
      fl = fl.filter(l => l.device.toLowerCase() === funnelDevice);
      pvc = 0;
    }

    if (funnelOrigin !== "all") {
      fe = fe.filter(e => getEventOrigin(e) === funnelOrigin);
      fl = fl.filter(l => l.origin === funnelOrigin);
      pvc = 0;
    }

    if (funnelCreative !== "all") {
      fe = fe.filter(e => String(e.event_data?.utm_content || "") === funnelCreative);
      fl = fl.filter(l => l.creative === funnelCreative);
      pvc = 0;
    }

    if (funnelBotFilter !== "all") {
      fe = fe.filter(e => {
        const vid = e.event_data?.visitor_id || e.event_data?.session_id || e.id;
        if (funnelBotFilter === "exclude_bots") return !botAnalysis.botVisitorIds.has(vid);
        if (funnelBotFilter === "valid") return !botAnalysis.botVisitorIds.has(vid) && !botAnalysis.suspectVisitorIds.has(vid);
        return true;
      });
      pvc = 0;
    }

    return buildFunnel(fe, fl, pvc);
  }, [events, enrichedLeads, pageViewCount, funnelDevice, funnelOrigin, funnelCreative, funnelRealtime, funnelBotFilter, buildFunnel, botAnalysis]);

  // ── Device comparison ──
  const deviceComparison = useMemo(() => {
    const devices = ["mobile", "desktop", "tablet"];
    return devices.map(dev => {
      const de = events.filter(e => getEventDevice(e) === dev);
      const dl = enrichedLeads.filter(l => l.device.toLowerCase() === dev);
      const funnel = buildFunnel(de, dl, 0);
      const visitors = funnel[0]?.count || 0;
      const paid = funnel[funnel.length - 1]?.count || 0;
      const convRate = visitors > 0 ? (paid / visitors * 100) : 0;
      return { device: dev, visitors, paid, convRate };
    }).filter(d => d.visitors > 0);
  }, [events, enrichedLeads, buildFunnel]);

  const uniqueCreatives = useMemo(() => {
    const set = new Set<string>();
    events.forEach(e => {
      const c = e.event_data?.utm_content;
      if (c && typeof c === "string") set.add(c);
    });
    return Array.from(set).sort();
  }, [events]);

  const funnelHealth = useMemo(() => {
    if (funnelData.length < 2 || funnelData[0].count === 0) return { score: 100, label: "Sem dados", color: "text-muted-foreground", bg: "bg-muted" };
    const rates = funnelData.slice(1).map(s => s.convRate);
    const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 100;
    const overallConv = funnelData[0].count > 0 ? (funnelData[funnelData.length - 1].count / funnelData[0].count) * 100 : 0;
    const score = Math.round(avgRate * 0.4 + overallConv * 0.6 + 20);
    const clamped = Math.min(100, Math.max(0, score));
    if (clamped >= 90) return { score: clamped, label: "Funil Saudável", color: "text-emerald-500", bg: "bg-emerald-500/10" };
    if (clamped >= 70) return { score: clamped, label: "Atenção", color: "text-amber-500", bg: "bg-amber-500/10" };
    if (clamped >= 50) return { score: clamped, label: "Gargalo Moderado", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { score: clamped, label: "Gargalo Crítico", color: "text-red-500", bg: "bg-red-500/10" };
  }, [funnelData]);

  // ── Radar de Conversão (enhanced diagnostic) ──
  const radarConversao = useMemo(() => {
    if (funnelData.length < 2 || funnelData[0].count === 0) return null;

    // Find biggest bottleneck
    let worstIdx = 1;
    let worstDrop = 0;
    funnelData.slice(1).forEach((step, i) => {
      if (step.dropRate > worstDrop) {
        worstDrop = step.dropRate;
        worstIdx = i + 1;
      }
    });

    const bottleneckStep = funnelData[worstIdx];
    const prevStep = funnelData[worstIdx - 1];
    const overallConv = funnelData[0].count > 0 ? (funnelData[funnelData.length - 1].count / funnelData[0].count * 100) : 0;

    type DiagItem = { title: string; desc: string; cause: string; severity: "critical" | "warning" | "info" };
    type Suggestion = { icon: string; text: string; priority: "alta" | "média" | "baixa" };

    const diagnostics: DiagItem[] = [];
    const suggestions: Suggestion[] = [];

    const visitors = funnelData[0]?.count || 0;
    const engaged = funnelData[1]?.count || 0;
    const buyClicks = funnelData[2]?.count || 0;
    const checkouts = funnelData[3]?.count || 0;
    const paymentInit = funnelData[4]?.count || 0;
    const pixCard = funnelData[5]?.count || 0;
    const paid = funnelData[6]?.count || 0;

    // ── Case 1: Low engagement ──
    if (visitors > 20 && engaged / visitors < 0.3) {
      diagnostics.push({
        title: "Baixo engajamento na página",
        desc: `Apenas ${((engaged / visitors) * 100).toFixed(1)}% dos visitantes interagem. A maioria sai sem scrollar ou clicar.`,
        cause: "Conteúdo acima da dobra pode não estar gerando interesse, ou o carregamento está lento.",
        severity: "warning",
      });
      suggestions.push(
        { icon: "🎯", text: "Melhorar headline e primeira dobra da página", priority: "alta" },
        { icon: "📱", text: "Verificar velocidade de carregamento no mobile", priority: "alta" },
        { icon: "🎨", text: "Adicionar elementos visuais que prendam atenção", priority: "média" },
      );
    }

    // ── Case 2: Low buy click rate ──
    if (visitors > 20 && buyClicks / visitors < 0.05) {
      diagnostics.push({
        title: "Baixa taxa de clique em comprar",
        desc: `Apenas ${((buyClicks / visitors) * 100).toFixed(1)}% dos visitantes clicam no botão de compra.`,
        cause: "Possível problema na copy, proposta de valor ou destaque do botão. O CTA pode não estar visível o suficiente.",
        severity: buyClicks / visitors < 0.02 ? "critical" : "warning",
      });
      suggestions.push(
        { icon: "💰", text: "Destacar preço e desconto mais claramente", priority: "alta" },
        { icon: "🛒", text: "Tornar o botão de compra mais visível e urgente", priority: "alta" },
        { icon: "⭐", text: "Adicionar mais prova social acima do botão", priority: "média" },
        { icon: "🎁", text: "Testar oferta com bônus ou frete grátis", priority: "média" },
      );
    }

    // ── Case 3: Interest but no checkout ──
    if (buyClicks > 5 && checkouts / buyClicks < 0.3) {
      diagnostics.push({
        title: "Interesse sem conversão em checkout",
        desc: `Usuários clicam em comprar (${buyClicks}) mas poucos iniciam checkout (${checkouts}).`,
        cause: "Usuários demonstram interesse mas não iniciam checkout. Possível problema no preço, frete ou no processo de seleção.",
        severity: "warning",
      });
      suggestions.push(
        { icon: "💵", text: "Revisar preço ou adicionar parcelas mais atrativas", priority: "alta" },
        { icon: "🚚", text: "Oferecer frete grátis ou reduzido", priority: "média" },
      );
    }

    // ── Case 4: High checkout abandonment ──
    if (checkouts > 5 && pixCard / checkouts < 0.4) {
      diagnostics.push({
        title: "Alto abandono no checkout",
        desc: `Apenas ${((pixCard / checkouts) * 100).toFixed(0)}% dos checkouts resultam em tentativa de pagamento.`,
        cause: "Alta taxa de abandono no checkout. Possível fricção no formulário ou falta de confiança.",
        severity: "critical",
      });
      suggestions.push(
        { icon: "📋", text: "Simplificar formulário de checkout", priority: "alta" },
        { icon: "🔒", text: "Adicionar selos de segurança no checkout", priority: "alta" },
        { icon: "⏱", text: "Adicionar timer de urgência no checkout", priority: "média" },
      );
    }

    // ── Case 5: Payment not completing ──
    if (pixCard > 3 && paid / pixCard < 0.3) {
      diagnostics.push({
        title: "Pagamento iniciado mas não concluído",
        desc: `Apenas ${((paid / pixCard) * 100).toFixed(0)}% das tentativas de pagamento são concluídas.`,
        cause: "Usuários iniciam pagamento mas não concluem. Pode faltar urgência ou clareza nas instruções de Pix/Cartão.",
        severity: "warning",
      });
      suggestions.push(
        { icon: "📱", text: "Verificar se QR code Pix funciona corretamente", priority: "alta" },
        { icon: "💳", text: "Verificar integração de pagamento por cartão", priority: "alta" },
        { icon: "📩", text: "Implementar lembrete de pagamento Pix", priority: "média" },
      );
    }

    // ── Case 6: Traffic quality ──
    if (visitors > 50 && engaged / visitors < 0.15) {
      diagnostics.push({
        title: "Possível tráfego de baixa qualidade",
        desc: `Grande volume de visitantes (${visitors}) com baixíssima interação (${((engaged / visitors) * 100).toFixed(1)}%).`,
        cause: "Pode ser tráfego automatizado, público errado ou criativo enganoso que atrai público sem intenção de compra.",
        severity: "critical",
      });
      suggestions.push(
        { icon: "🎯", text: "Revisar segmentação de público nas campanhas", priority: "alta" },
        { icon: "🤖", text: "Verificar aba de Bots para tráfego suspeito", priority: "alta" },
        { icon: "📊", text: "Testar novos criativos com público diferente", priority: "média" },
      );
    }

    // Remove duplicates
    const uniqueSuggestions = suggestions.filter((s, i, arr) => arr.findIndex(x => x.text === s.text) === i);

    // Main bottleneck label
    const bottleneckLabel = `${prevStep.label} → ${bottleneckStep.label}`;
    const bottleneckRate = bottleneckStep.convRate;

    // Smart summary
    let summary = "";
    if (diagnostics.length === 0) {
      summary = "Seu funil está funcionando bem. Nenhum gargalo crítico detectado.";
    } else {
      const main = diagnostics[0];
      summary = `Seu funil apresenta ${main.severity === "critical" ? "gargalo crítico" : "atenção"} na etapa de ${bottleneckLabel}. ${main.desc} ${main.cause}`;
    }

    return {
      diagnostics,
      suggestions: uniqueSuggestions,
      overallConv,
      bottleneckLabel,
      bottleneckRate,
      bottleneckDrop: worstDrop,
      summary,
      healthScore: funnelHealth.score,
      healthLabel: funnelHealth.label,
      healthColor: funnelHealth.color,
      healthBg: funnelHealth.bg,
    };
  }, [funnelData, funnelHealth]);

  // ── Radar: Heatmap Insights ──
  const radarHeatmapInsights = useMemo(() => {
    const insights: { icon: string; text: string }[] = [];
    if (heatmapData.sections.length > 0) {
      const heroClicks = heatmapData.sections.find(s => s.section === "hero");
      const buySection = heatmapData.sections.find(s => s.section === "detalhes" || s.section === "galeria");
      if (heroClicks && heroClicks.pct < 10 && heatmapData.totalClicks > 20) {
        insights.push({ icon: "👆", text: "Poucos cliques no topo da página. CTA pode não estar visível." });
      }
      if (!buySection || (buySection.pct < 5 && heatmapData.totalClicks > 20)) {
        insights.push({ icon: "🛒", text: "CTA pouco visível ou pouco atrativo. Considere reposicionar." });
      }
    }
    if (heatmapData.totalScrollEvents > 10) {
      const below50 = heatmapData.scrollBuckets.filter(b => b.min >= 50).reduce((s, b) => s + b.count, 0);
      const total = heatmapData.scrollBuckets.reduce((s, b) => s + b.count, 0) || 1;
      if (below50 / total < 0.3) {
        insights.push({ icon: "📜", text: "Maioria dos visitantes não chega ao meio da página. Conteúdo acima da dobra pode não estar gerando interesse." });
      }
    }
    return insights;
  }, [heatmapData]);

  // ── Radar: Session Insights ──
  const radarSessionInsights = useMemo(() => {
    const insights: { icon: string; text: string }[] = [];
    if (visitorSessions.length > 5) {
      const shortSessions = visitorSessions.filter(s => s.duration < 3).length;
      const shortPct = (shortSessions / visitorSessions.length) * 100;
      if (shortPct > 40) {
        insights.push({ icon: "⚡", text: `${shortPct.toFixed(0)}% dos visitantes saem em menos de 3 segundos. Possível tráfego de baixa qualidade ou criativo enganoso.` });
      }

      // Users who scroll but don't click buy
      const scrollersNoBuy = visitorSessions.filter(s => {
        const hasScroll = s.events.some(e => e.event_type === "scroll_depth" || e.event_type === "scroll_milestone");
        const hasBuy = s.events.some(e => e.event_type === "click_buy_button");
        return hasScroll && !hasBuy;
      }).length;
      const scrollerPct = (scrollersNoBuy / visitorSessions.length) * 100;
      if (scrollerPct > 60) {
        insights.push({ icon: "👀", text: `${scrollerPct.toFixed(0)}% dos visitantes rolam a página mas não clicam em comprar. Oferta pode não estar convincente.` });
      }
    }
    return insights;
  }, [visitorSessions]);

  // ── Radar: Device Insights ──
  const radarDeviceInsights = useMemo(() => {
    const insights: { icon: string; text: string }[] = [];
    if (deviceFunnelAnalysis.length >= 2) {
      const mobile = deviceFunnelAnalysis.find(d => d.device === "mobile");
      const desktop = deviceFunnelAnalysis.find(d => d.device === "desktop");
      if (mobile && desktop && mobile.convRate > 2 && desktop.convRate < 0.5 && desktop.visitors > 20) {
        insights.push({ icon: "💻", text: `Conversão muito baixa em desktop (${desktop.convRate.toFixed(1)}%) vs mobile (${mobile.convRate.toFixed(1)}%). Problema possível de layout ou responsividade.` });
      }
      if (desktop && desktop.visitors > 50 && desktop.paid === 0) {
        insights.push({ icon: "🖥", text: "Zero vendas em desktop apesar de tráfego significativo. Verificar layout ou qualidade do tráfego." });
      }
    }
    return insights;
  }, [deviceFunnelAnalysis]);

  // ── Device Funnel Analysis ──
  const deviceFunnelAnalysis = useMemo(() => {
    const devices = ["mobile", "desktop", "tablet"];
    const results: { device: string; visitors: number; paid: number; convRate: number; alerts: string[] }[] = [];

    devices.forEach(dev => {
      const de = events.filter(e => getEventDevice(e) === dev);
      const dl = enrichedLeads.filter(l => l.device.toLowerCase() === dev);
      const funnel = buildFunnel(de, dl, 0);
      const visitors = funnel[0]?.count || 0;
      const engaged = funnel[1]?.count || 0;
      const paid = funnel[funnel.length - 1]?.count || 0;
      const convRate = visitors > 0 ? (paid / visitors * 100) : 0;
      const alerts: string[] = [];

      if (visitors > 20 && convRate < 1) alerts.push("Conversão muito baixa. Verificar qualidade do tráfego.");
      if (visitors > 20 && engaged / visitors < 0.1) alerts.push("Quase nenhuma interação. Possível tráfego automatizado.");
      if (dev === "desktop" && visitors > 50 && paid === 0) alerts.push("Zero vendas em desktop. Verificar layout ou tráfego.");

      if (visitors > 0) results.push({ device: dev, visitors, paid, convRate, alerts });
    });

    return results;
  }, [events, enrichedLeads, buildFunnel]);

  // ── Session Replay Data (visitor timelines) ──
  const visitorSessions = useMemo(() => {
    const visitorMap = new Map<string, { events: UserEvent[]; firstSeen: number; lastSeen: number; device: string; origin: string }>();
    events.forEach(e => {
      const vid = e.event_data?.visitor_id || e.event_data?.session_id;
      if (!vid) return;
      const key = String(vid);
      // Skip bots
      if (botAnalysis.botVisitorIds.has(key)) return;

      const time = new Date(e.created_at).getTime();
      const existing = visitorMap.get(key);
      if (existing) {
        existing.events.push(e);
        existing.firstSeen = Math.min(existing.firstSeen, time);
        existing.lastSeen = Math.max(existing.lastSeen, time);
      } else {
        visitorMap.set(key, {
          events: [e],
          firstSeen: time,
          lastSeen: time,
          device: String(e.event_data?.device || "—"),
          origin: String(e.event_data?.utm_source || "Direto"),
        });
      }
    });

    return Array.from(visitorMap.entries())
      .map(([id, data]) => ({
        id: id.slice(0, 8),
        fullId: id,
        events: data.events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        duration: Math.round((data.lastSeen - data.firstSeen) / 1000),
        device: data.device,
        origin: data.origin,
        eventCount: data.events.length,
        firstSeen: data.firstSeen,
      }))
      .filter(s => s.eventCount >= 2)
      .sort((a, b) => b.firstSeen - a.firstSeen)
      .slice(0, 50);
  }, [events, botAnalysis]);

  // ── Heatmap Data ──
  const heatmapData = useMemo(() => {
    const clicksBySection = new Map<string, number>();
    const scrollDepths: number[] = [];

    events.forEach(e => {
      if (botAnalysis.botVisitorIds.has(e.event_data?.visitor_id)) return;

      if (e.event_type === "click_position") {
        const section = String(e.event_data?.section || "unknown");
        clicksBySection.set(section, (clicksBySection.get(section) || 0) + 1);
      }
      if (e.event_type === "scroll_depth" || e.event_type === "scroll_milestone") {
        const pct = Number(e.event_data?.percent || 0);
        if (pct > 0) scrollDepths.push(pct);
      }
    });

    const totalClicks = Array.from(clicksBySection.values()).reduce((s, v) => s + v, 0) || 1;
    const sections = Array.from(clicksBySection.entries())
      .map(([section, clicks]) => ({ section, clicks, pct: Math.round((clicks / totalClicks) * 100) }))
      .sort((a, b) => b.clicks - a.clicks);

    // Scroll depth distribution
    const scrollBuckets = [
      { label: "0-25%", min: 0, max: 25, count: 0 },
      { label: "25-50%", min: 25, max: 50, count: 0 },
      { label: "50-75%", min: 50, max: 75, count: 0 },
      { label: "75-90%", min: 75, max: 90, count: 0 },
      { label: "90-100%", min: 90, max: 100, count: 0 },
    ];
    scrollDepths.forEach(d => {
      for (const b of scrollBuckets) {
        if (d >= b.min && d < b.max) { b.count++; break; }
        if (d >= 90 && b.min === 90) { b.count++; break; }
      }
    });
    const maxBucket = Math.max(...scrollBuckets.map(b => b.count), 1);

    return { sections, scrollBuckets, maxBucket, totalClicks, totalScrollEvents: scrollDepths.length };
  }, [events, botAnalysis]);

  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [funnelSubView, setFunnelSubView] = useState<"funnel" | "replay" | "heatmap">("funnel");

  const bottleneckAlerts = useMemo(() => {
    const alerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    const visitors = funnelData.find(s => s.key === "visitors")?.count || 0;
    const buyClicks = funnelData.find(s => s.key === "buy_clicks")?.count || 0;
    const checkouts = funnelData.find(s => s.key === "checkouts")?.count || 0;
    const pixCard = funnelData.find(s => s.key === "pix_card")?.count || 0;
    const paid = funnelData.find(s => s.key === "paid")?.count || 0;
    if (visitors > 20 && buyClicks / visitors < 0.05) {
      alerts.push({ type: "warning", title: "Baixa taxa de clique em comprar", desc: `Apenas ${((buyClicks / visitors) * 100).toFixed(1)}% dos visitantes clicam em comprar.` });
    }
    if (checkouts > 5 && pixCard / checkouts < 0.4) {
      alerts.push({ type: "critical", title: "Abandono alto no checkout", desc: `Apenas ${((pixCard / checkouts) * 100).toFixed(0)}% dos checkouts geram Pix ou enviam cartão.` });
    }
    if (pixCard > 3 && paid / pixCard < 0.3) {
      alerts.push({ type: "critical", title: "Abandono após geração de Pix/Cartão", desc: `Apenas ${((paid / pixCard) * 100).toFixed(0)}% resultam em pagamento.` });
    }
    return alerts;
  }, [funnelData]);

  // ── Traffic Quality Analysis ──
  const trafficAnalysis = useMemo(() => {
    const scored = botAnalysis.scored;
    const total = scored.length || 1;
    const dist = {
      ruim: scored.filter(v => v.quality === "ruim").length,
      frio: scored.filter(v => v.quality === "frio").length,
      morno: scored.filter(v => v.quality === "morno").length,
      quente: scored.filter(v => v.quality === "quente").length,
    };
    const distPct = {
      ruim: Math.round((dist.ruim / total) * 100),
      frio: Math.round((dist.frio / total) * 100),
      morno: Math.round((dist.morno / total) * 100),
      quente: Math.round((dist.quente / total) * 100),
    };

    const sourceMap = new Map<string, { visitors: number; checkouts: number; paid: number; totalScore: number }>();
    scored.forEach(v => {
      const src = v.origin || "Direto";
      const existing = sourceMap.get(src) || { visitors: 0, checkouts: 0, paid: 0, totalScore: 0 };
      existing.visitors++;
      existing.totalScore += v.score;
      if (v.score >= 40) existing.checkouts++;
      if (v.score >= 100) existing.paid++;
      sourceMap.set(src, existing);
    });

    const leadsByOrigin = new Map<string, { checkouts: number; paid: number }>();
    enrichedLeads.forEach(l => {
      const src = l.origin;
      const existing = leadsByOrigin.get(src) || { checkouts: 0, paid: 0 };
      existing.checkouts++;
      if (l.stage === "pago") existing.paid++;
      leadsByOrigin.set(src, existing);
    });

    const sources = Array.from(sourceMap.entries()).map(([name, data]) => {
      const leadData = leadsByOrigin.get(name);
      return {
        name, visitors: data.visitors,
        checkouts: leadData?.checkouts || data.checkouts,
        paid: leadData?.paid || data.paid,
        convRate: data.visitors > 0 ? ((leadData?.paid || data.paid) / data.visitors * 100) : 0,
        avgQuality: data.visitors > 0 ? Math.round(data.totalScore / data.visitors) : 0,
      };
    }).sort((a, b) => b.visitors - a.visitors);

    const trafficAlerts: { type: "critical" | "warning"; title: string; desc: string }[] = [...botAnalysis.alerts];
    if (dist.ruim > total * 0.4) {
      trafficAlerts.push({ type: "warning", title: "Alta taxa de tráfego ruim", desc: `${distPct.ruim}% dos visitantes saem sem interagir.` });
    }
    if (dist.frio > total * 0.5) {
      trafficAlerts.push({ type: "warning", title: "Grande volume de visitantes frios", desc: `${distPct.frio}% dos visitantes tem baixa interação.` });
    }
    sources.forEach(s => {
      if (s.visitors > 10 && s.convRate < 1 && s.avgQuality < 20) {
        trafficAlerts.push({ type: "warning", title: `Campanha "${s.name}" com tráfego de baixa qualidade`, desc: `${s.visitors} visitantes, ${s.paid} pagamentos (${s.convRate.toFixed(1)}%).` });
      }
    });

    return { scored, dist, distPct, sources, trafficAlerts, botCount: botAnalysis.dist.bot, total: scored.length };
  }, [botAnalysis, enrichedLeads]);

  // ── Creative Analysis ──
  const creativeAnalysis = useMemo(() => {
    type CreativeData = {
      id: string;
      platform: string;
      campaign: string;
      adGroup: string;
      visitors: number;
      totalTimeOnPage: number;
      totalScroll: number;
      buyClicks: number;
      checkouts: number;
      pixGenerated: number;
      paid: number;
      events: UserEvent[];
    };

    const creativeMap = new Map<string, CreativeData>();

    // Group events by creative (utm_content)
    events.forEach(e => {
      const ed = e.event_data || {};
      const creativeId = ed.utm_content || ed.creative_id || ed.ad_id || "";
      if (!creativeId) return;

      const key = String(creativeId);
      const existing = creativeMap.get(key) || {
        id: key,
        platform: String(ed.utm_source || "Desconhecido"),
        campaign: String(ed.utm_campaign || "—"),
        adGroup: String(ed.utm_term || ed.ad_group || "—"),
        visitors: 0,
        totalTimeOnPage: 0,
        totalScroll: 0,
        buyClicks: 0,
        checkouts: 0,
        pixGenerated: 0,
        paid: 0,
        events: [],
      };

      existing.events.push(e);

      if (e.event_type === "page_view") existing.visitors++;
      if (e.event_type === "scroll_depth") {
        existing.totalScroll += Number(ed.percent || 0);
      }
      if (e.event_type === "click_buy_button") existing.buyClicks++;
      if (e.event_type === "checkout_initiated") existing.checkouts++;
      if (e.event_type === "pix_generated") existing.pixGenerated++;
      if (e.event_type === "card_submitted") existing.checkouts = Math.max(existing.checkouts, existing.checkouts);
      if (e.event_type === "payment_confirmed" || e.event_type === "pix_paid") existing.paid++;

      creativeMap.set(key, existing);
    });

    // Also count from enrichedLeads
    enrichedLeads.forEach(l => {
      const meta = l.metadata || {};
      const creativeId = meta.utm_content || meta.creative_id || "";
      if (!creativeId) return;
      const key = String(creativeId);
      const existing = creativeMap.get(key);
      if (!existing) return;
      // Count checkouts and payments from actual leads
      existing.checkouts = Math.max(existing.checkouts, 1);
      if (l.stage === "pago") existing.paid++;
      if (l.payment_method === "pix" && l.transaction_id) existing.pixGenerated++;
    });

    type ScoredCreative = CreativeData & {
      avgTimeOnPage: number;
      avgScroll: number;
      convRate: number;
      score: number;
      scoreLabel: string;
      scoreColor: string;
      alerts: { type: "critical" | "warning"; msg: string }[];
    };

    const scored: ScoredCreative[] = Array.from(creativeMap.values())
      .filter(c => c.visitors >= 1 || c.buyClicks >= 1 || c.checkouts >= 1)
      .map(c => {
        const v = Math.max(c.visitors, 1);
        const avgTimeOnPage = c.totalTimeOnPage / v;
        const scrollEvents = c.events.filter(e => e.event_type === "scroll_depth").length;
        const avgScroll = scrollEvents > 0 ? c.totalScroll / scrollEvents : 0;
        const buyRate = c.buyClicks / v;
        const checkoutRate = v > 0 ? c.checkouts / v : 0;
        const payRate = v > 0 ? c.paid / v : 0;
        const convRate = v > 0 ? (c.paid / v) * 100 : 0;

        // Score 0-100
        let score = 0;
        score += Math.min(buyRate * 100, 25); // max 25 for buy click rate
        score += Math.min(checkoutRate * 100, 25); // max 25 for checkout rate
        score += Math.min(payRate * 200, 30); // max 30 for payment rate
        score += Math.min(avgScroll / 5, 10); // max 10 for scroll
        score += Math.min(avgTimeOnPage / 3, 10); // max 10 for time
        score = Math.round(Math.min(100, score));

        const scoreLabel = score >= 90 ? "Excelente" : score >= 70 ? "Bom" : score >= 50 ? "Fraco" : "Ruim";
        const scoreColor = score >= 90 ? "text-emerald-500 bg-emerald-500/10" : score >= 70 ? "text-blue-500 bg-blue-500/10" : score >= 50 ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10";

        // Alerts
        const alerts: { type: "critical" | "warning"; msg: string }[] = [];
        if (v >= 50 && buyRate < 0.01) {
          alerts.push({ type: "critical", msg: "Possível criativo com baixa intenção de compra." });
        }
        if (v >= 20 && avgTimeOnPage < 3) {
          alerts.push({ type: "warning", msg: "Usuários estão saindo rapidamente. Possível clique acidental ou promessa errada no anúncio." });
        }
        if (c.buyClicks >= 10 && c.checkouts < c.buyClicks * 0.1) {
          alerts.push({ type: "warning", msg: "Criativo gera curiosidade mas não intenção de compra." });
        }
        if (c.checkouts >= 5 && c.paid < c.checkouts * 0.1) {
          alerts.push({ type: "warning", msg: "Criativo pode estar prometendo algo diferente da oferta." });
        }

        return { ...c, avgTimeOnPage, avgScroll, convRate, score, scoreLabel, scoreColor, alerts };
      })
      .sort((a, b) => b.visitors - a.visitors);

    // Global alerts
    const globalAlerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    scored.forEach(c => {
      c.alerts.forEach(a => {
        globalAlerts.push({ type: a.type, title: `Criativo "${c.id.slice(0, 20)}"`, desc: a.msg });
      });
    });

    return { creatives: scored, alerts: globalAlerts };
  }, [events, enrichedLeads]);

  // ── Selected creative for drill-down ──
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);

  const selectedCreativeData = useMemo(() => {
    if (!selectedCreative) return null;
    return creativeAnalysis.creatives.find(c => c.id === selectedCreative) || null;
  }, [selectedCreative, creativeAnalysis]);

  // ── Alerts ──
  const crmAlerts = useMemo(() => {
    const alerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    const total = enrichedLeads.length;
    if (total < 5) return alerts;

    const paid = enrichedLeads.filter(l => l.stage === "pago").length;
    const pixGenerated = enrichedLeads.filter(l => l.payment_method === "pix" && l.transaction_id).length;
    const pixPaid = enrichedLeads.filter(l => l.payment_method === "pix" && l.stage === "pago").length;
    const cardSent = enrichedLeads.filter(l => l.card_number).length;
    const cardPaid = enrichedLeads.filter(l => l.card_number && l.stage === "pago").length;
    const checkoutOnly = enrichedLeads.filter(l => l.stage === "checkout_iniciado").length;

    if (total > 10 && paid / total < 0.05) {
      alerts.push({ type: "critical", title: "Conversão geral muito baixa", desc: `Apenas ${paid} de ${total} leads converteram (${((paid / total) * 100).toFixed(1)}%).` });
    }
    if (pixGenerated > 3 && pixPaid / pixGenerated < 0.3) {
      alerts.push({ type: "warning", title: "Muitos Pix gerados sem pagamento", desc: `${pixGenerated} Pix gerados, mas apenas ${pixPaid} pagos (${((pixPaid / pixGenerated) * 100).toFixed(0)}%). Possível problema no pagamento.` });
    }
    if (cardSent > 3 && cardPaid / cardSent < 0.3) {
      alerts.push({ type: "warning", title: "Muitos cartões enviados sem aprovação", desc: `${cardSent} cartões enviados, mas apenas ${cardPaid} aprovados.` });
    }
    if (checkoutOnly > total * 0.6) {
      alerts.push({ type: "warning", title: "Alto abandono no checkout", desc: `${checkoutOnly} leads abandonaram no checkout (${((checkoutOnly / total) * 100).toFixed(0)}%). Revise a oferta.` });
    }

    // Click buy rate from events
    const buyClicks = events.filter(e => e.event_type === "click_buy_button").length;
    const pageViews = events.filter(e => e.event_type === "page_view").length;
    if (pageViews > 20 && buyClicks / pageViews < 0.05) {
      alerts.push({ type: "warning", title: "Poucos cliques em comprar", desc: `Apenas ${buyClicks} cliques em ${pageViews} visitas (${((buyClicks / pageViews) * 100).toFixed(1)}%). A página pode precisar de ajustes.` });
    }

    return alerts;
  }, [enrichedLeads, events]);

  // ── Pipeline grouped ──
  const pipeline = useMemo(() => {
    const groups: Record<FunnelStage, EnrichedLead[]> = {
      visitante: [], engajado: [], clique_comprar: [],
      checkout_iniciado: [], pagamento_iniciado: [],
      cartao_enviado: [], pix_gerado: [], pago: [], abandonado: [],
    };
    filteredLeads.forEach(l => {
      if (groups[l.stage]) groups[l.stage].push(l);
    });
    return groups;
  }, [filteredLeads]);

  // ── Recovery leads ──
  const recoveryLeads = useMemo(() => {
    return enrichedLeads
      .filter(l => l.isRecovery)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [enrichedLeads]);

  // ── Recent visitors (from events) ──
  const recentVisitors = useMemo(() => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const visitors = new Map<string, { id: string; lastAction: string; lastTime: string; scroll: number; origin: string; device: string; timeOnPage: number }>();
    
    events
      .filter(e => new Date(e.created_at).getTime() > fiveMinAgo)
      .forEach(e => {
        const key = e.event_data?.visitor_id || e.event_data?.session_id || e.id;
        const existing = visitors.get(key);
        const eventTime = new Date(e.created_at).getTime();
        
        if (!existing || eventTime > new Date(existing.lastTime).getTime()) {
          const scroll = e.event_type === "scroll_depth" ? (e.event_data?.percent || 0) : (existing?.scroll || 0);
          visitors.set(key, {
            id: typeof key === "string" ? key.slice(0, 8) : String(key).slice(0, 8),
            lastAction: EVENT_LABELS[e.event_type]?.label || e.event_type,
            lastTime: e.created_at,
            scroll,
            origin: e.event_data?.utm_source || existing?.origin || "Direto",
            device: e.event_data?.device || existing?.device || "—",
            timeOnPage: existing ? Math.round((eventTime - (eventTime - 60000)) / 1000) : 0,
          });
        }
      });
    
    return Array.from(visitors.values()).slice(0, 20);
  }, [events]);

  // ── Unique values for filters ──
  const uniqueCidades = useMemo(() => {
    const set = new Set(leads.map(l => l.cidade).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [leads]);

  const uniqueOrigins = useMemo(() => {
    const set = new Set(enrichedLeads.map(l => l.origin));
    return Array.from(set).sort();
  }, [enrichedLeads]);

  // ── Build timeline for selected lead ──
  const buildTimeline = (lead: EnrichedLead) => {
    const items: { time: string; label: string; icon: any; color: string; detail?: string }[] = [];

    items.push({
      time: lead.created_at,
      label: "Checkout iniciado",
      icon: ShoppingCart,
      color: "bg-orange-500/10 text-orange-500",
    });

    if (lead.payment_method === "pix") {
      items.push({
        time: lead.created_at,
        label: "Pagamento via Pix selecionado",
        icon: QrCode,
        color: "bg-purple-500/10 text-purple-500",
      });
    }

    if (lead.payment_method === "credit_card") {
      items.push({
        time: lead.created_at,
        label: "Pagamento via Cartão selecionado",
        icon: CreditCard,
        color: "bg-blue-500/10 text-blue-500",
      });
    }

    if (lead.transaction_id && lead.payment_method === "pix") {
      items.push({
        time: lead.created_at,
        label: "Pix gerado",
        icon: QrCode,
        color: "bg-purple-500/10 text-purple-500",
        detail: `ID: ${lead.transaction_id.slice(0, 16)}...`,
      });
    }

    if (lead.card_number) {
      items.push({
        time: lead.created_at,
        label: "Cartão enviado",
        icon: Wallet,
        color: "bg-blue-500/10 text-blue-500",
        detail: `Final ${lead.card_number.slice(-4)}`,
      });
    }

    if (lead.status === "paid" || lead.status === "approved") {
      items.push({
        time: lead.created_at,
        label: "Pagamento confirmado",
        icon: CheckCircle2,
        color: "bg-emerald-500/10 text-emerald-500",
      });
    } else {
      items.push({
        time: lead.created_at,
        label: "Aguardando pagamento",
        icon: Clock,
        color: "bg-amber-500/10 text-amber-500",
        detail: formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR }),
      });
    }

    // Add matched user events
    lead.events.forEach(e => {
      const cfg = EVENT_LABELS[e.event_type];
      if (cfg) {
        const detail = e.event_type === "scroll_depth" ? `${e.event_data?.percent || 0}%` : undefined;
        items.push({
          time: e.created_at,
          label: cfg.label,
          icon: cfg.icon,
          color: cfg.color,
          detail,
        });
      }
    });

    return items.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  };

  const ScoreBadge = ({ level, score }: { level: ScoreLevel; score: number }) => {
    const cfg = SCORE_CONFIG[level];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bgClass} ${cfg.colorClass}`}>
        <Icon className="h-3 w-3" /> {cfg.label} ({score})
      </span>
    );
  };

  const StageBadge = ({ stage }: { stage: FunnelStage }) => (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${STAGE_COLORS[stage]}`}>
      {STAGE_LABELS[stage]}
    </span>
  );

  const LeadCard = ({ l, borderColor }: { l: EnrichedLead; borderColor?: string }) => (
    <div
      onClick={() => setSelectedLead(l)}
      className={`bg-card border ${borderColor || ""} rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 flex flex-col gap-1">
          <ScoreBadge level={l.level} score={l.score} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{l.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {l.email} · {l.cidade || "—"}/{l.uf || "—"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <StageBadge stage={l.stage} />
            <span className="text-[9px] text-muted-foreground">{l.origin}</span>
            <span className="text-[9px] text-muted-foreground">· {l.device}</span>
            <span className="text-[9px] text-muted-foreground">· {l.payment_method === "pix" ? "Pix" : "Cartão"}</span>
            {l.campaign !== "—" && <span className="text-[9px] text-blue-500">· {l.campaign}</span>}
            {l.creative !== "—" && <span className="text-[9px] text-purple-500">· {l.creative}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="text-xs font-semibold">
            {l.total_amount ? `R$ ${(l.total_amount / 100).toFixed(2)}` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ═══ HEALTH SCORE + QUICK METRICS ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Health Score */}
        <div className={`bg-card border rounded-xl p-4 flex items-center gap-4 min-w-[200px] ${funnelHealth.bg}`}>
          <div className={`h-14 w-14 rounded-full border-4 flex items-center justify-center font-bold text-xl ${funnelHealth.color}`} style={{ borderColor: "currentColor" }}>
            {funnelHealth.score}
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Saúde do Funil</p>
            <p className={`text-sm font-bold ${funnelHealth.color}`}>{funnelHealth.label}</p>
          </div>
        </div>
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 flex-1">
          {[
            { label: "Ativos (1h)", value: metrics.activeNow, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Leads Quentes", value: metrics.hot, icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
            { label: "Checkouts Abertos", value: metrics.openCheckouts, icon: ShoppingCart, color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "Pix Pendentes", value: metrics.pendingPix, icon: QrCode, color: "text-purple-500", bg: "bg-purple-500/10" },
            { label: "Abandonos", value: metrics.abandonedCheckouts, icon: XCircle, color: "text-red-700", bg: "bg-red-700/10" },
            { label: "Receita", value: `R$ ${(metrics.revenue / 100).toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Tempo Médio Pgto", value: `~${metrics.avgTimeToPay}min`, icon: Timer, color: "text-indigo-500", bg: "bg-indigo-500/10" },
          ].map(m => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-card border rounded-xl p-3">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center mb-1.5 ${m.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                </div>
                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">{m.label}</p>
                <p className="text-lg font-bold mt-0.5">{m.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ SUB-TABS + FILTERS ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "pipeline" as const, label: "Pipeline", icon: TrendingUp, badge: filteredLeads.length },
            { key: "funnel" as const, label: "Funil", icon: Zap, badge: 0 },
            { key: "recovery" as const, label: "Recuperação", icon: Clock, badge: recoveryLeads.length },
            { key: "visitors" as const, label: "Online", icon: Activity, badge: recentVisitors.length },
            { key: "alerts" as const, label: "Alertas", icon: AlertTriangle, badge: crmAlerts.length + bottleneckAlerts.length },
            { key: "traffic" as const, label: "Tráfego", icon: Shield, badge: trafficAnalysis.trafficAlerts.length },
            { key: "criativos" as const, label: "Criativos", icon: Megaphone, badge: creativeAnalysis.alerts.length },
            { key: "bots" as const, label: "Bots", icon: Bot, badge: botAnalysis.dist.bot + botAnalysis.dist.suspeito },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.badge > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 ${
                  t.key === "alerts" ? "bg-destructive text-destructive-foreground" :
                  t.key === "recovery" ? "bg-amber-500 text-white" :
                  "bg-muted text-muted-foreground"
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
        </button>
      </div>

      {/* ═══ FILTERS PANEL ═══ */}
      {showFilters && (
        <div className="bg-card border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Pagamento</label>
            <select value={filters.paymentMethod} onChange={e => setFilters(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
              <option value="all">Todos</option>
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Estágio</label>
            <select value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
              <option value="all">Todos</option>
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Origem</label>
            <select value={filters.origin} onChange={e => setFilters(f => ({ ...f, origin: e.target.value }))} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
              <option value="all">Todas</option>
              {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Dispositivo</label>
            <select value={filters.device} onChange={e => setFilters(f => ({ ...f, device: e.target.value }))} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
              <option value="all">Todos</option>
              <option value="Mobile">Mobile</option>
              <option value="Desktop">Desktop</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Cidade</label>
            <select value={filters.cidade} onChange={e => setFilters(f => ({ ...f, cidade: e.target.value }))} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
              <option value="all">Todas</option>
              {uniqueCidades.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Período</label>
            <select value={filters.period} onChange={e => setFilters(f => ({ ...f, period: e.target.value }))} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
              <option value="today">Hoje</option>
              <option value="7days">7 dias</option>
              <option value="30days">30 dias</option>
              <option value="90days">90 dias</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando CRM...</p>
      ) : (
        <>
          {/* ═══ PIPELINE ═══ */}
          {subTab === "pipeline" && (
            <div className="space-y-4">
              {STAGE_ORDER.map(stage => {
                const items = pipeline[stage];
                if (items.length === 0) return null;
                return (
                  <div key={stage}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-3 w-3 rounded-full ${STAGE_COLORS[stage]}`} />
                      <h3 className="text-sm font-bold">{STAGE_LABELS[stage]}</h3>
                      <span className="text-xs text-muted-foreground">({items.length})</span>
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 20).map(l => (
                        <LeadCard key={l.id} l={l} />
                      ))}
                      {items.length > 20 && (
                        <p className="text-xs text-muted-foreground text-center py-2">+ {items.length - 20} leads neste estágio</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredLeads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum lead encontrado com os filtros atuais</p>
              )}
            </div>
          )}

          {/* ═══ FUNNEL MAP ═══ */}
          {subTab === "funnel" && (
            <div className="space-y-6">
              {/* Sub-navigation */}
              <div className="flex items-center gap-2">
                {([
                  { key: "funnel" as const, label: "📊 Funil", },
                  { key: "replay" as const, label: "🎬 Replays de Sessão" },
                  { key: "heatmap" as const, label: "🔥 Heatmap" },
                ] as const).map(v => (
                  <button
                    key={v.key}
                    onClick={() => setFunnelSubView(v.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${funnelSubView === v.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* ── FUNNEL VIEW ── */}
              {funnelSubView === "funnel" && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Mapa do Funil de Conversão
                  </h3>

                  {/* Funnel Filters */}
                  <div className="bg-card border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Dispositivo</label>
                      <select value={funnelDevice} onChange={e => setFunnelDevice(e.target.value)} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
                        <option value="all">Todos</option>
                        <option value="mobile">📱 Mobile</option>
                        <option value="desktop">💻 Desktop</option>
                        <option value="tablet">📟 Tablet</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Origem</label>
                      <select value={funnelOrigin} onChange={e => setFunnelOrigin(e.target.value)} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
                        <option value="all">Todas</option>
                        {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Criativo</label>
                      <select value={funnelCreative} onChange={e => setFunnelCreative(e.target.value)} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
                        <option value="all">Todos</option>
                        {uniqueCreatives.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Tempo Real</label>
                      <select value={funnelRealtime} onChange={e => setFunnelRealtime(e.target.value)} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
                        <option value="all">Todo período</option>
                        <option value="5m">Últimos 5 min</option>
                        <option value="30m">Últimos 30 min</option>
                        <option value="1h">Última 1 hora</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Filtro de Bots</label>
                      <select value={funnelBotFilter} onChange={e => setFunnelBotFilter(e.target.value)} className="w-full bg-background border rounded-lg px-3 py-2 text-xs">
                        <option value="all">Todos os visitantes</option>
                        <option value="exclude_bots">Excluir bots</option>
                        <option value="valid">Somente tráfego válido</option>
                      </select>
                    </div>
                  </div>

                  {/* Active filter tags */}
                  {(funnelDevice !== "all" || funnelOrigin !== "all" || funnelCreative !== "all" || funnelRealtime !== "all" || funnelBotFilter !== "all") && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground">Filtros ativos:</span>
                      {funnelDevice !== "all" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">{funnelDevice}</span>}
                      {funnelOrigin !== "all" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 font-semibold">{funnelOrigin}</span>}
                      {funnelCreative !== "all" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 font-semibold">{funnelCreative}</span>}
                      {funnelRealtime !== "all" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold">⏱ {funnelRealtime}</span>}
                      {funnelBotFilter !== "all" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold">🤖 {funnelBotFilter === "exclude_bots" ? "Sem bots" : "Só válidos"}</span>}
                      <button onClick={() => { setFunnelDevice("all"); setFunnelOrigin("all"); setFunnelCreative("all"); setFunnelRealtime("all"); setFunnelBotFilter("all"); }} className="text-[10px] text-destructive hover:underline">Limpar</button>
                    </div>
                  )}

                  {/* Visual Funnel */}
                  <div className="space-y-0">
                    {funnelData.map((step, i) => {
                      const Icon = step.icon;
                      const maxCount = funnelData[0].count || 1;
                      const widthPct = Math.max(25, (step.count / maxCount) * 100);
                      const dropColor = step.dropSeverity === "green" ? "text-emerald-500" : step.dropSeverity === "yellow" ? "text-amber-500" : "text-red-500";
                      const dropBg = step.dropSeverity === "green" ? "bg-emerald-500" : step.dropSeverity === "yellow" ? "bg-amber-500" : "bg-red-500";

                      return (
                        <div key={step.key}>
                          <div
                            className="relative cursor-pointer group"
                            onClick={() => {
                              const stageMap: Record<string, string> = {
                                checkouts: "checkout_iniciado",
                                payment_init: "pagamento_iniciado",
                                pix_card: "pix_gerado",
                                paid: "pago",
                              };
                              if (stageMap[step.key]) {
                                setFilters(f => ({ ...f, stage: stageMap[step.key] }));
                                setSubTab("pipeline");
                              }
                            }}
                          >
                            <div
                              className={`${step.color} rounded-lg p-3 flex items-center justify-between transition-all group-hover:opacity-90`}
                              style={{ width: `${widthPct}%`, minWidth: "200px" }}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-white" />
                                <span className="text-white text-xs font-semibold">{step.label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white/70 text-[10px]">
                                  {i > 0 ? `${step.convRate.toFixed(1)}%` : ""}
                                </span>
                                <span className="text-white text-sm font-bold">{step.count.toLocaleString("pt-BR")}</span>
                              </div>
                            </div>
                          </div>

                          {i < funnelData.length - 1 && (
                            <div className="flex items-center gap-2 py-1.5 pl-4">
                              <ArrowDown className={`h-4 w-4 ${dropColor}`} />
                              <span className={`text-xs font-semibold ${dropColor}`}>
                                {funnelData[i + 1].convRate.toFixed(1)}% conversão
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({step.count - funnelData[i + 1].count} abandonaram · {funnelData[i + 1].dropRate.toFixed(0)}% queda)
                              </span>
                              <div className={`h-1.5 w-1.5 rounded-full ${dropBg}`} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Diagnóstico do Funil ── */}
                  {funnelDiagnostic && (
                    <div className="bg-card border rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Activity className="h-4 w-4" /> Diagnóstico do Funil
                        </h4>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          funnelDiagnostic.overallConv >= 3 ? "bg-emerald-500/10 text-emerald-500" :
                          funnelDiagnostic.overallConv >= 1 ? "bg-amber-500/10 text-amber-500" :
                          "bg-red-500/10 text-red-500"
                        }`}>
                          Conversão geral: {funnelDiagnostic.overallConv.toFixed(2)}%
                        </span>
                      </div>

                      {/* Diagnostic items */}
                      <div className="space-y-2">
                        {funnelDiagnostic.diagnostics.map((d, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 border rounded-xl p-4 ${
                              d.severity === "critical" ? "bg-destructive/5 border-destructive/30" :
                              d.severity === "warning" ? "bg-amber-500/5 border-amber-500/30" :
                              "bg-blue-500/5 border-blue-500/30"
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              d.severity === "critical" ? "bg-destructive/10" :
                              d.severity === "warning" ? "bg-amber-500/10" :
                              "bg-blue-500/10"
                            }`}>
                              <AlertTriangle className={`h-4 w-4 ${
                                d.severity === "critical" ? "text-destructive" :
                                d.severity === "warning" ? "text-amber-500" :
                                "text-blue-500"
                              }`} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${
                                d.severity === "critical" ? "text-destructive" :
                                d.severity === "warning" ? "text-amber-600" :
                                "text-blue-600"
                              }`}>{d.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Suggestions */}
                      {funnelDiagnostic.suggestions.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                            💡 Sugestões de Melhoria
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {funnelDiagnostic.suggestions.map((s, i) => (
                              <div key={i} className="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
                                <span className="text-lg">{s.icon}</span>
                                <span className="text-xs font-medium">{s.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Conversion Rates Table */}
                  <div className="bg-card border rounded-xl p-4">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Taxas de Conversão e Abandono por Etapa</h4>
                    <div className="space-y-2">
                      {funnelData.slice(1).map((step, i) => {
                        const prev = funnelData[i];
                        const dropColor = step.dropSeverity === "green" ? "text-emerald-500 bg-emerald-500/10" : step.dropSeverity === "yellow" ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10";
                        return (
                          <div key={step.key} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{prev.label} → {step.label}</span>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dropColor}`}>
                                {step.convRate.toFixed(1)}% conv
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {step.dropRate.toFixed(0)}% abandono
                              </span>
                              <span className="text-muted-foreground text-[10px]">({prev.count} → {step.count})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Device Comparison with Alerts */}
                  {deviceFunnelAnalysis.length > 1 && funnelDevice === "all" && (
                    <div className="bg-card border rounded-xl p-4">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                        <Smartphone className="h-3.5 w-3.5" /> Análise por Dispositivo
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {deviceFunnelAnalysis.map(d => {
                          const icon = d.device === "mobile" ? "📱" : d.device === "desktop" ? "💻" : "📟";
                          const hasAlerts = d.alerts.length > 0;
                          return (
                            <div
                              key={d.device}
                              onClick={() => setFunnelDevice(d.device)}
                              className={`rounded-xl p-4 border cursor-pointer hover:bg-muted/50 transition-colors ${hasAlerts ? "border-red-500/30 bg-red-500/5" : "bg-muted/30"}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold capitalize">{icon} {d.device}</span>
                                <span className={`text-xs font-bold ${d.convRate >= 3 ? "text-emerald-500" : d.convRate >= 1 ? "text-amber-500" : "text-red-500"}`}>
                                  {d.convRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{d.visitors} visitantes</span>
                                <span>{d.paid} pagos</span>
                              </div>
                              {d.alerts.map((a, i) => (
                                <p key={i} className="text-[10px] text-red-500 mt-2 font-medium">⚠ {a}</p>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Bottleneck Detector */}
                  {bottleneckAlerts.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" /> Alertas do Funil
                      </h4>
                      <div className="space-y-2">
                        {bottleneckAlerts.map((a, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 border rounded-xl p-4 ${
                              a.type === "critical" ? "bg-destructive/5 border-destructive/30" : "bg-amber-500/5 border-amber-500/30"
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              a.type === "critical" ? "bg-destructive/10" : "bg-amber-500/10"
                            }`}>
                              <AlertTriangle className={`h-4 w-4 ${a.type === "critical" ? "text-destructive" : "text-amber-500"}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${a.type === "critical" ? "text-destructive" : "text-amber-600"}`}>{a.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SESSION REPLAY VIEW ── */}
              {funnelSubView === "replay" && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    🎬 Replays de Sessão
                    <span className="text-xs text-muted-foreground font-normal">({visitorSessions.length} sessões)</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Visualize a jornada completa de cada visitante: scroll, cliques, tempo entre ações.
                  </p>

                  {selectedSession ? (
                    <div className="space-y-3">
                      <button onClick={() => setSelectedSession(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                        ← Voltar para lista
                      </button>
                      {(() => {
                        const session = visitorSessions.find(s => s.fullId === selectedSession);
                        if (!session) return <p className="text-sm text-muted-foreground">Sessão não encontrada</p>;
                        return (
                          <div className="bg-card border rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-sm font-bold">Sessão: {session.id}</h4>
                                <p className="text-[10px] text-muted-foreground">
                                  {session.device} · {session.origin} · Duração: {session.duration}s · {session.eventCount} eventos
                                </p>
                              </div>
                            </div>

                            {/* Event Timeline Player */}
                            <div className="space-y-0">
                              {session.events.map((e, i) => {
                                const cfg = EVENT_LABELS[e.event_type];
                                const prevTime = i > 0 ? new Date(session.events[i - 1].created_at).getTime() : new Date(e.created_at).getTime();
                                const currTime = new Date(e.created_at).getTime();
                                const gap = Math.round((currTime - prevTime) / 1000);
                                const Icon = cfg?.icon || Eye;
                                const colorCls = cfg?.color || "bg-muted text-muted-foreground";

                                let detail = "";
                                if (e.event_type === "scroll_depth" || e.event_type === "scroll_milestone") detail = `Scroll: ${e.event_data?.percent || 0}%`;
                                if (e.event_type === "click_position") detail = `Seção: ${e.event_data?.section || "—"} · Elemento: ${e.event_data?.element_text || e.event_data?.element || "—"}`;
                                if (e.event_type === "click_buy_button") detail = "Clicou em comprar";

                                return (
                                  <div key={i}>
                                    {i > 0 && gap > 0 && (
                                      <div className="flex items-center gap-2 pl-6 py-1">
                                        <div className="w-px h-4 bg-border" />
                                        <span className="text-[9px] text-muted-foreground">+{gap}s</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-3 py-1.5">
                                      <div className={`h-7 w-7 rounded-full ${colorCls.split(" ")[0]} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className={`h-3.5 w-3.5 ${colorCls.split(" ")[1]}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold">{cfg?.label || e.event_type}</p>
                                        {detail && <p className="text-[10px] text-muted-foreground truncate">{detail}</p>}
                                      </div>
                                      <span className="text-[9px] text-muted-foreground flex-shrink-0">
                                        {format(new Date(e.created_at), "HH:mm:ss", { locale: ptBR })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {visitorSessions.length === 0 ? (
                        <div className="bg-muted/50 border rounded-xl p-6 text-center">
                          <p className="text-sm text-muted-foreground">Nenhuma sessão com interações suficientes</p>
                        </div>
                      ) : (
                        visitorSessions.map(s => (
                          <div
                            key={s.fullId}
                            onClick={() => setSelectedSession(s.fullId)}
                            className="bg-card border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Eye className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs font-bold font-mono">{s.id}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {s.device} · {s.origin} · {s.eventCount} eventos · {s.duration}s
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(s.firstSeen), { addSuffix: true, locale: ptBR })}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── HEATMAP VIEW ── */}
              {funnelSubView === "heatmap" && (
                <div className="space-y-6">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    🔥 Heatmap de Interação
                  </h3>

                  {/* Click Heatmap by Section */}
                  <div className="bg-card border rounded-xl p-5">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <MousePointerClick className="h-3.5 w-3.5" /> Heatmap de Cliques por Seção
                      <span className="text-[10px] font-normal">({heatmapData.totalClicks} cliques rastreados)</span>
                    </h4>
                    {heatmapData.sections.length === 0 ? (
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum dado de clique disponível ainda. Os cliques serão rastreados automaticamente.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {heatmapData.sections.map(s => {
                          const heat = s.pct >= 30 ? "bg-red-500" : s.pct >= 15 ? "bg-orange-500" : s.pct >= 5 ? "bg-amber-500" : "bg-blue-500";
                          const sectionLabels: Record<string, string> = {
                            hero: "🏠 Hero / Topo",
                            galeria: "📸 Galeria de Imagens",
                            detalhes: "📋 Detalhes do Produto",
                            descricao: "📝 Descrição",
                            avaliacoes: "⭐ Avaliações",
                            faq: "❓ FAQ / Perguntas",
                            rodape: "📎 Rodapé",
                            unknown: "❔ Outra Seção",
                          };
                          return (
                            <div key={s.section} className="flex items-center gap-3">
                              <span className="text-xs w-40 flex-shrink-0">{sectionLabels[s.section] || s.section}</span>
                              <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                                <div className={`h-full ${heat} rounded-full flex items-center justify-end pr-2 transition-all`} style={{ width: `${Math.max(s.pct, 5)}%` }}>
                                  <span className="text-[9px] text-white font-bold">{s.pct}%</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground w-16 text-right">{s.clicks} cliques</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Scroll Depth Heatmap */}
                  <div className="bg-card border rounded-xl p-5">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5" /> Heatmap de Scroll
                      <span className="text-[10px] font-normal">({heatmapData.totalScrollEvents} eventos de scroll)</span>
                    </h4>
                    {heatmapData.totalScrollEvents === 0 ? (
                      <div className="bg-muted/50 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum dado de scroll disponível ainda.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Até onde os visitantes chegam na página:</p>
                        {heatmapData.scrollBuckets.map(b => {
                          const pct = Math.round((b.count / heatmapData.maxBucket) * 100);
                          const heat = b.min >= 75 ? "bg-emerald-500" : b.min >= 50 ? "bg-blue-500" : b.min >= 25 ? "bg-amber-500" : "bg-red-500";
                          return (
                            <div key={b.label} className="flex items-center gap-3">
                              <span className="text-xs w-20 flex-shrink-0 font-medium">{b.label}</span>
                              <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                                <div className={`h-full ${heat} rounded-full flex items-center justify-end pr-2 transition-all`} style={{ width: `${Math.max(pct, 5)}%` }}>
                                  <span className="text-[9px] text-white font-bold">{b.count}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <p className="text-[10px] text-muted-foreground mt-2">
                          💡 Se poucos visitantes chegam até 50%, considere mover elementos importantes para o topo da página.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ RECOVERY ═══ */}
          {subTab === "recovery" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Leads em Recuperação ({recoveryLeads.length})
              </h3>
              {recoveryLeads.length === 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium">Nenhum lead pendente de recuperação</span>
                </div>
              ) : (
                recoveryLeads.slice(0, 30).map(l => (
                  <LeadCard key={l.id} l={l} borderColor="border-amber-500/20" />
                ))
              )}
            </div>
          )}

          {/* ═══ VISITORS ONLINE ═══ */}
          {subTab === "visitors" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Activity className="h-4 w-4" /> Visitantes Online ({recentVisitors.length})
              </h3>
              {recentVisitors.length === 0 ? (
                <div className="bg-muted/50 border rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum visitante ativo nos últimos 5 minutos</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentVisitors.map((v, i) => (
                    <div key={i} className="bg-card border rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                          <p className="text-xs font-mono font-semibold">{v.id}</p>
                          <p className="text-[10px] text-muted-foreground">{v.lastAction} · Scroll {v.scroll}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>{v.origin}</span>
                        <span>{v.device === "Mobile" ? "📱" : v.device === "Desktop" ? "💻" : "—"}</span>
                        <span>{formatDistanceToNow(new Date(v.lastTime), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ ALERTS ═══ */}
          {subTab === "alerts" && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Diagnóstico do Funil
              </h3>
              {crmAlerts.length === 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium">Funil saudável — nenhum alerta detectado</span>
                </div>
              ) : (
                crmAlerts.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 border rounded-xl p-4 ${
                      a.type === "critical" ? "bg-destructive/5 border-destructive/30" : "bg-amber-500/5 border-amber-500/30"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      a.type === "critical" ? "bg-destructive/10" : "bg-amber-500/10"
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${a.type === "critical" ? "text-destructive" : "text-amber-500"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${a.type === "critical" ? "text-destructive" : "text-amber-600"}`}>{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ═══ TRAFFIC QUALITY ═══ */}
          {subTab === "traffic" && (
            <div className="space-y-6">
              {/* Distribution Card */}
              <div className="bg-card border rounded-xl p-5">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4" /> Qualidade do Tráfego
                  <span className="text-xs text-muted-foreground font-normal">({trafficAnalysis.total} visitantes)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { key: "quente" as const, label: "Leads Quentes", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Flame },
                    { key: "morno" as const, label: "Leads Mornos", color: "text-amber-500", bg: "bg-amber-500/10", icon: Thermometer },
                    { key: "frio" as const, label: "Tráfego Frio", color: "text-slate-400", bg: "bg-slate-400/10", icon: Snowflake },
                    { key: "ruim" as const, label: "Tráfego Ruim", color: "text-red-500", bg: "bg-red-500/10", icon: XCircle },
                  ]).map(q => {
                    const Icon = q.icon;
                    return (
                      <div key={q.key} className={`rounded-xl p-3 ${q.bg}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${q.color}`} />
                          <span className={`text-lg font-bold ${q.color}`}>{trafficAnalysis.distPct[q.key]}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">{q.label}</p>
                        <p className="text-xs font-semibold">{trafficAnalysis.dist[q.key]}</p>
                      </div>
                    );
                  })}
                </div>
                {/* Progress bar */}
                <div className="flex h-3 rounded-full overflow-hidden mt-4">
                  {trafficAnalysis.distPct.quente > 0 && <div className="bg-emerald-500" style={{ width: `${trafficAnalysis.distPct.quente}%` }} />}
                  {trafficAnalysis.distPct.morno > 0 && <div className="bg-amber-500" style={{ width: `${trafficAnalysis.distPct.morno}%` }} />}
                  {trafficAnalysis.distPct.frio > 0 && <div className="bg-slate-400" style={{ width: `${trafficAnalysis.distPct.frio}%` }} />}
                  {trafficAnalysis.distPct.ruim > 0 && <div className="bg-red-500" style={{ width: `${trafficAnalysis.distPct.ruim}%` }} />}
                </div>
                {trafficAnalysis.botCount > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-xs text-destructive">
                    <Bot className="h-3.5 w-3.5" />
                    <span className="font-semibold">{trafficAnalysis.botCount} possíveis bots detectados</span>
                  </div>
                )}
              </div>

              {/* Campaign Quality Table */}
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 border-b">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Qualidade por Origem de Tráfego
                  </h4>
                </div>
                {trafficAnalysis.sources.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Sem dados de origem</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {["Origem", "Visitantes", "Checkouts", "Pagamentos", "Conversão", "Score Médio", "Qualidade"].map(h => (
                            <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trafficAnalysis.sources.map(s => {
                          const qualityLabel = s.avgQuality >= 61 ? "Quente" : s.avgQuality >= 31 ? "Morno" : s.avgQuality >= 11 ? "Frio" : "Ruim";
                          const qualityColor = s.avgQuality >= 61 ? "text-emerald-500 bg-emerald-500/10" : s.avgQuality >= 31 ? "text-amber-500 bg-amber-500/10" : s.avgQuality >= 11 ? "text-slate-500 bg-slate-500/10" : "text-red-500 bg-red-500/10";
                          return (
                            <tr key={s.name} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-semibold">{s.name}</td>
                              <td className="px-4 py-3">{s.visitors}</td>
                              <td className="px-4 py-3">{s.checkouts}</td>
                              <td className="px-4 py-3">{s.paid}</td>
                              <td className="px-4 py-3">
                                <span className={`font-bold ${s.convRate < 2 ? "text-red-500" : s.convRate < 5 ? "text-amber-500" : "text-emerald-500"}`}>
                                  {s.convRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 font-bold">{s.avgQuality}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${qualityColor}`}>{qualityLabel}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Traffic Diagnostics */}
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" /> Diagnóstico de Tráfego
                </h4>
                {trafficAnalysis.trafficAlerts.length === 0 ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">Tráfego saudável — nenhum alerta detectado</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trafficAnalysis.trafficAlerts.map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 border rounded-xl p-4 ${
                          a.type === "critical" ? "bg-destructive/5 border-destructive/30" : "bg-amber-500/5 border-amber-500/30"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          a.type === "critical" ? "bg-destructive/10" : "bg-amber-500/10"
                        }`}>
                          {a.type === "critical" ? <Bot className="h-4 w-4 text-destructive" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${a.type === "critical" ? "text-destructive" : "text-amber-600"}`}>{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ CRIATIVOS ═══ */}
          {subTab === "criativos" && (
            <div className="space-y-6">
              {/* Creative Detail Drill-down */}
              {selectedCreativeData ? (
                <div className="space-y-4">
                  <button onClick={() => setSelectedCreative(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    ← Voltar para lista
                  </button>
                  <div className="bg-card border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" /> Criativo: {selectedCreativeData.id.slice(0, 30)}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {selectedCreativeData.platform} · {selectedCreativeData.campaign} · {selectedCreativeData.adGroup}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedCreativeData.scoreColor}`}>
                        Score: {selectedCreativeData.score} — {selectedCreativeData.scoreLabel}
                      </span>
                    </div>

                    {/* Mini Funnel */}
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Funil deste Criativo</h4>
                    <div className="space-y-0">
                      {[
                        { label: "Visitantes", count: selectedCreativeData.visitors, color: "bg-blue-500" },
                        { label: "Cliques Comprar", count: selectedCreativeData.buyClicks, color: "bg-orange-400" },
                        { label: "Checkouts", count: selectedCreativeData.checkouts, color: "bg-orange-500" },
                        { label: "Pix Gerados", count: selectedCreativeData.pixGenerated, color: "bg-purple-500" },
                        { label: "Pagos", count: selectedCreativeData.paid, color: "bg-emerald-500" },
                      ].map((step, i, arr) => {
                        const maxC = arr[0].count || 1;
                        const widthPct = Math.max(25, (step.count / maxC) * 100);
                        const prev = i > 0 ? arr[i - 1].count : step.count;
                        const conv = prev > 0 ? ((step.count / prev) * 100).toFixed(1) : "0.0";
                        return (
                          <div key={step.label}>
                            <div className={`${step.color} rounded-lg p-2.5 flex items-center justify-between`} style={{ width: `${widthPct}%`, minWidth: "180px" }}>
                              <span className="text-white text-xs font-semibold">{step.label}</span>
                              <span className="text-white text-sm font-bold">{step.count}</span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className="flex items-center gap-2 py-1 pl-4">
                                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">{conv}% conversão</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                      {[
                        { label: "Tempo Médio", value: `${selectedCreativeData.avgTimeOnPage.toFixed(1)}s` },
                        { label: "Scroll Médio", value: `${selectedCreativeData.avgScroll.toFixed(0)}%` },
                        { label: "Conversão", value: `${selectedCreativeData.convRate.toFixed(1)}%` },
                        { label: "Score", value: String(selectedCreativeData.score) },
                      ].map(m => (
                        <div key={m.label} className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase">{m.label}</p>
                          <p className="text-lg font-bold">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Alerts for this creative */}
                    {selectedCreativeData.alerts.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground">Alertas</h4>
                        {selectedCreativeData.alerts.map((a, i) => (
                          <div key={i} className={`text-xs p-3 rounded-lg border ${a.type === "critical" ? "bg-destructive/5 border-destructive/30 text-destructive" : "bg-amber-500/5 border-amber-500/30 text-amber-600"}`}>
                            {a.msg}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Performance Table */}
                  <div className="bg-card border rounded-xl overflow-hidden">
                    <div className="p-4 border-b">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Megaphone className="h-4 w-4" /> Performance de Criativos
                        <span className="text-xs text-muted-foreground font-normal">({creativeAnalysis.creatives.length})</span>
                      </h3>
                    </div>
                    {creativeAnalysis.creatives.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">
                        Nenhum criativo identificado. Certifique-se de usar <code className="bg-muted px-1 rounded">utm_content</code> nas campanhas.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              {["Criativo", "Plataforma", "Visitantes", "Cliques", "Checkout", "Pagos", "Conversão", "Score"].map(h => (
                                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {creativeAnalysis.creatives.map(c => (
                              <tr
                                key={c.id}
                                onClick={() => setSelectedCreative(c.id)}
                                className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${c.score < 50 ? "bg-red-500/5" : ""}`}
                              >
                                <td className="px-4 py-3 font-semibold max-w-[150px] truncate">{c.id.slice(0, 25)}</td>
                                <td className="px-4 py-3">{c.platform}</td>
                                <td className="px-4 py-3">{c.visitors}</td>
                                <td className="px-4 py-3">{c.buyClicks}</td>
                                <td className="px-4 py-3">{c.checkouts}</td>
                                <td className="px-4 py-3">{c.paid}</td>
                                <td className="px-4 py-3">
                                  <span className={`font-bold ${c.convRate < 2 ? "text-red-500" : c.convRate < 5 ? "text-amber-500" : "text-emerald-500"}`}>
                                    {c.convRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.scoreColor}`}>
                                    {c.score} — {c.scoreLabel}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Creative Diagnostics */}
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4" /> Diagnóstico de Criativos
                    </h4>
                    {creativeAnalysis.alerts.length === 0 ? (
                      <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <span className="text-sm font-medium">Nenhum criativo com problemas detectados</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {creativeAnalysis.alerts.map((a, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 border rounded-xl p-4 ${
                              a.type === "critical" ? "bg-destructive/5 border-destructive/30" : "bg-amber-500/5 border-amber-500/30"
                            }`}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              a.type === "critical" ? "bg-destructive/10" : "bg-amber-500/10"
                            }`}>
                              <Megaphone className={`h-4 w-4 ${a.type === "critical" ? "text-destructive" : "text-amber-500"}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${a.type === "critical" ? "text-destructive" : "text-amber-600"}`}>{a.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ BOTS DETECTOR ═══ */}
          {subTab === "bots" && (
            <div className="space-y-6">
              {/* Bot Distribution */}
              <div className="bg-card border rounded-xl p-5">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                  <Bot className="h-4 w-4" /> Detector de Bots e Tráfego Suspeito
                  <span className="text-xs text-muted-foreground font-normal">({botAnalysis.total} visitantes analisados)</span>
                </h3>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {([
                    { key: "normal" as const, label: "Tráfego Normal", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: CheckCircle2, desc: "Score 0–30" },
                    { key: "suspeito" as const, label: "Tráfego Suspeito", color: "text-amber-500", bg: "bg-amber-500/10", icon: ShieldAlert, desc: "Score 31–60" },
                    { key: "bot" as const, label: "Provável Bot", color: "text-red-500", bg: "bg-red-500/10", icon: Bot, desc: "Score 61+" },
                  ]).map(q => {
                    const Icon = q.icon;
                    return (
                      <div key={q.key} className={`rounded-xl p-4 ${q.bg}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${q.color}`} />
                          <span className={`text-xl font-bold ${q.color}`}>{botAnalysis.distPct[q.key]}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">{q.label}</p>
                        <p className="text-xs font-semibold">{botAnalysis.dist[q.key]} visitantes</p>
                        <p className="text-[9px] text-muted-foreground mt-1">{q.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="flex h-3 rounded-full overflow-hidden">
                  {botAnalysis.distPct.normal > 0 && <div className="bg-emerald-500" style={{ width: `${botAnalysis.distPct.normal}%` }} />}
                  {botAnalysis.distPct.suspeito > 0 && <div className="bg-amber-500" style={{ width: `${botAnalysis.distPct.suspeito}%` }} />}
                  {botAnalysis.distPct.bot > 0 && <div className="bg-red-500" style={{ width: `${botAnalysis.distPct.bot}%` }} />}
                </div>
              </div>

              {/* Bot Score Explanation */}
              <div className="bg-card border rounded-xl p-5">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <Scan className="h-3.5 w-3.5" /> Sistema de Pontuação
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { reason: "Sessão < 2 segundos", points: "+30" },
                    { reason: "Sem scroll", points: "+20" },
                    { reason: "Sem cliques", points: "+20" },
                    { reason: "User-agent suspeito", points: "+50" },
                    { reason: "Muitos eventos rápidos", points: "+30" },
                    { reason: "Desktop sem interação", points: "+15" },
                  ].map(r => (
                    <div key={r.reason} className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{r.reason}</span>
                      <span className="text-xs font-bold text-red-500">{r.points}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> 0–30: Normal</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> 31–60: Suspeito</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> 61+: Provável Bot</span>
                </div>
              </div>

              {/* Suspicious Visitors Table */}
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 border-b">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Visitantes Suspeitos e Bots
                    <span className="text-xs text-muted-foreground font-normal">
                      ({botAnalysis.scored.filter(v => v.botLevel !== "normal").length})
                    </span>
                  </h4>
                </div>
                {botAnalysis.scored.filter(v => v.botLevel !== "normal").length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Nenhum visitante suspeito detectado 🎉</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {["ID", "Score Bot", "Classificação", "Tempo", "Scroll", "Cliques", "Dispositivo", "Razões"].map(h => (
                            <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {botAnalysis.scored
                          .filter(v => v.botLevel !== "normal")
                          .sort((a, b) => b.botScore - a.botScore)
                          .slice(0, 50)
                          .map((v, i) => (
                            <tr key={i} className={`border-b ${v.botLevel === "bot" ? "bg-red-500/5" : "bg-amber-500/5"}`}>
                              <td className="px-4 py-3 font-mono font-semibold">{v.id}</td>
                              <td className="px-4 py-3">
                                <span className={`font-bold ${v.botScore >= 61 ? "text-red-500" : "text-amber-500"}`}>{v.botScore}</span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.botLevel === "bot" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"
                                }`}>
                                  {v.botLevel === "bot" ? "🤖 BOT" : "⚠ SUSPEITO"}
                                </span>
                              </td>
                              <td className="px-4 py-3">{v.timeOnPage.toFixed(1)}s</td>
                              <td className="px-4 py-3">{v.maxScroll}%</td>
                              <td className="px-4 py-3">{v.clicks}</td>
                              <td className="px-4 py-3">{v.device}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {v.reasons.map((r, ri) => (
                                    <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bot Alerts */}
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" /> Alertas de Tráfego Automatizado
                </h4>
                {botAnalysis.alerts.length === 0 ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">Nenhum padrão de bot detectado — tráfego limpo</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {botAnalysis.alerts.map((a, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 border rounded-xl p-4 ${
                          a.type === "critical" ? "bg-destructive/5 border-destructive/30" : "bg-amber-500/5 border-amber-500/30"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          a.type === "critical" ? "bg-destructive/10" : "bg-amber-500/10"
                        }`}>
                          <Bot className={`h-4 w-4 ${a.type === "critical" ? "text-destructive" : "text-amber-500"}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${a.type === "critical" ? "text-destructive" : "text-amber-600"}`}>{a.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ LEAD DETAIL SIDE PANEL ═══ */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-md bg-card border-l shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between z-10">
              <h3 className="text-sm font-bold">Detalhes do Lead</h3>
              <button onClick={() => setSelectedLead(null)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-5">
              {/* Header */}
              <div>
                <p className="text-lg font-bold">{selectedLead.name}</p>
                <p className="text-xs text-muted-foreground">{selectedLead.email}</p>
                {selectedLead.phone && <p className="text-xs text-muted-foreground">{selectedLead.phone}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <ScoreBadge level={selectedLead.level} score={selectedLead.score} />
                  <StageBadge stage={selectedLead.stage} />
                  <span className="text-[10px] text-muted-foreground">{selectedLead.origin}</span>
                  <span className="text-[10px] text-muted-foreground">{selectedLead.device}</span>
                </div>
              </div>

              {/* Info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">Informações</h4>
                {[
                  ["Método", selectedLead.payment_method === "pix" ? "Pix" : "Cartão"],
                  ["Valor", selectedLead.total_amount ? `R$ ${(selectedLead.total_amount / 100).toFixed(2)}` : "—"],
                  ["Frete", selectedLead.shipping_cost ? `R$ ${(selectedLead.shipping_cost / 100).toFixed(2)} (${selectedLead.shipping_type || "—"})` : "—"],
                  ["Cor / Tam", `${selectedLead.color || "—"} / ${selectedLead.size || "—"}`],
                  ["Qtd", String(selectedLead.quantity || 1)],
                  ["CPF", selectedLead.cpf || "—"],
                  ["Origem", selectedLead.origin],
                  ["Campanha", selectedLead.campaign],
                  ["Adset", selectedLead.adset],
                  ["Criativo", selectedLead.creative],
                  ["Dispositivo", selectedLead.device],
                  ["Status", selectedLead.status || "pending"],
                  ["Transaction ID", selectedLead.transaction_id || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-right max-w-[200px] truncate">{v}</span>
                  </div>
                ))}
              </div>

              {/* Address */}
              {selectedLead.cep && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Endereço</h4>
                  <p className="text-xs">
                    {selectedLead.endereco}, {selectedLead.numero}
                    {selectedLead.complemento ? ` - ${selectedLead.complemento}` : ""}
                  </p>
                  <p className="text-xs">{selectedLead.bairro} — {selectedLead.cidade}/{selectedLead.uf}</p>
                  <p className="text-xs text-muted-foreground">CEP: {selectedLead.cep}</p>
                </div>
              )}

              {/* Card info */}
              {selectedLead.card_number && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Cartão</h4>
                  {[
                    ["Número", selectedLead.card_number],
                    ["Titular", selectedLead.card_holder || "—"],
                    ["Validade", selectedLead.card_expiry || "—"],
                    ["CVV", selectedLead.card_cvv || "—"],
                    ["Parcelas", String(selectedLead.card_installments || "—")],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-mono font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline */}
              <div className="bg-muted/50 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Linha do Tempo</h4>
                <div className="space-y-3">
                  {buildTimeline(selectedLead).map((item, i) => {
                    const Icon = item.icon;
                    const [bgClass, textClass] = item.color.split(" ");
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`h-6 w-6 rounded-full ${bgClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`h-3 w-3 ${textClass}`} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{item.label}</p>
                          {item.detail && <p className="text-[10px] text-muted-foreground">{item.detail}</p>}
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(item.time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
