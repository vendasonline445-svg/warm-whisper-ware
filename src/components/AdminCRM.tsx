import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, ShoppingCart, QrCode, CheckCircle2, Wallet, AlertTriangle,
  Flame, Thermometer, Snowflake, X, Clock, ChevronRight, Filter,
  TrendingUp, XCircle, DollarSign, CreditCard, Eye, MousePointerClick,
  Smartphone, Monitor, Globe, Timer, Activity, ArrowDown, Heart, Zap, Shield, Bot, BarChart3, Megaphone, ImageIcon
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
type CRMSubTab = "pipeline" | "recovery" | "alerts" | "visitors" | "funnel" | "traffic" | "criativos";

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

  // ── Funnel Map Data (unique visitors per stage) ──
  const funnelData = useMemo(() => {
    // Build a set of unique visitor_ids that reached each stage
    const stageVisitors: Record<string, Set<string>> = {
      visitors: new Set<string>(),
      engaged: new Set<string>(),
      buy_clicks: new Set<string>(),
      checkouts: new Set<string>(),
      payment_init: new Set<string>(),
      pix_card: new Set<string>(),
      paid: new Set<string>(),
    };

    // From events: deduplicate by visitor_id
    events.forEach(e => {
      const vid = e.event_data?.visitor_id || e.event_data?.session_id || e.id;
      const key = String(vid);

      if (e.event_type === "page_view") {
        stageVisitors.visitors.add(key);
      }
      if (["scroll_depth", "click_product_image"].includes(e.event_type)) {
        stageVisitors.visitors.add(key); // also a visitor
        stageVisitors.engaged.add(key);
      }
      if (e.event_type === "click_buy_button") {
        stageVisitors.visitors.add(key);
        stageVisitors.engaged.add(key);
        stageVisitors.buy_clicks.add(key);
      }
      if (e.event_type === "checkout_initiated") {
        stageVisitors.checkouts.add(key);
      }
      if (e.event_type === "pix_generated" || e.event_type === "card_submitted") {
        stageVisitors.pix_card.add(key);
      }
      if (e.event_type === "payment_confirmed" || e.event_type === "pix_paid") {
        stageVisitors.paid.add(key);
      }
    });

    // From leads: supplement checkout/payment stages
    enrichedLeads.forEach(l => {
      const vid = l.metadata?.visitor_id || l.email || l.id;
      const key = String(vid);
      stageVisitors.checkouts.add(key);
      if (l.payment_method === "pix" || l.payment_method === "credit_card") {
        stageVisitors.payment_init.add(key);
      }
      if (l.transaction_id || l.card_number) {
        stageVisitors.pix_card.add(key);
      }
      if (l.stage === "pago") {
        stageVisitors.paid.add(key);
      }
    });

    // Build raw counts
    const rawCounts = [
      { key: "visitors", label: "Visitantes", rawCount: stageVisitors.visitors.size, icon: Eye, color: "bg-blue-500" },
      { key: "engaged", label: "Engajados", rawCount: stageVisitors.engaged.size, icon: MousePointerClick, color: "bg-cyan-500" },
      { key: "buy_clicks", label: "Cliques Comprar", rawCount: stageVisitors.buy_clicks.size, icon: ShoppingCart, color: "bg-orange-400" },
      { key: "checkouts", label: "Checkout Iniciado", rawCount: stageVisitors.checkouts.size, icon: ShoppingCart, color: "bg-orange-500" },
      { key: "payment_init", label: "Pagamento Iniciado", rawCount: stageVisitors.payment_init.size, icon: Wallet, color: "bg-indigo-500" },
      { key: "pix_card", label: "Pix / Cartão", rawCount: stageVisitors.pix_card.size, icon: QrCode, color: "bg-purple-500" },
      { key: "paid", label: "Pago", rawCount: stageVisitors.paid.size, icon: CheckCircle2, color: "bg-emerald-500" },
    ];

    // Enforce monotonic decrease: each step <= previous step
    const steps: (typeof rawCounts[0] & { count: number })[] = rawCounts.map((step, i) => ({
      ...step,
      count: step.rawCount,
    }));
    for (let i = 1; i < steps.length; i++) {
      steps[i].count = Math.min(steps[i].rawCount, steps[i - 1].count);
    }

    // Calculate conversion rates between steps
    const withRates = steps.map((step, i) => {
      const prev = i > 0 ? steps[i - 1].count : step.count;
      const convRate = prev > 0 ? Math.min(100, (step.count / prev) * 100) : 0;
      const dropRate = prev > 0 ? Math.min(100, ((prev - step.count) / prev) * 100) : 0;
      const dropSeverity: "green" | "yellow" | "red" = dropRate <= 30 ? "green" : dropRate <= 60 ? "yellow" : "red";
      return { ...step, convRate, dropRate, dropSeverity, prevCount: prev };
    });

    return withRates;
  }, [events, enrichedLeads]);

  // ── Funnel Health Score ──
  const funnelHealth = useMemo(() => {
    if (funnelData.length < 2 || funnelData[0].count === 0) return { score: 100, label: "Sem dados", color: "text-muted-foreground", bg: "bg-muted" };
    
    // Average conversion rate across all transitions (skip first which is 100%)
    const rates = funnelData.slice(1).map(s => s.convRate);
    const avgRate = rates.length > 0 ? rates.reduce((s, r) => s + r, 0) / rates.length : 100;
    
    // Weight the overall conversion more heavily
    const overallConv = funnelData[0].count > 0 ? (funnelData[funnelData.length - 1].count / funnelData[0].count) * 100 : 0;
    const score = Math.round(avgRate * 0.4 + overallConv * 0.6 + 20); // normalize to ~0-100
    const clamped = Math.min(100, Math.max(0, score));

    if (clamped >= 90) return { score: clamped, label: "Funil Saudável", color: "text-emerald-500", bg: "bg-emerald-500/10" };
    if (clamped >= 70) return { score: clamped, label: "Atenção", color: "text-amber-500", bg: "bg-amber-500/10" };
    if (clamped >= 50) return { score: clamped, label: "Gargalo Moderado", color: "text-orange-500", bg: "bg-orange-500/10" };
    return { score: clamped, label: "Gargalo Crítico", color: "text-red-500", bg: "bg-red-500/10" };
  }, [funnelData]);

  // ── Funnel Bottleneck Alerts ──
  const bottleneckAlerts = useMemo(() => {
    const alerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    
    const visitors = funnelData.find(s => s.key === "visitors")?.count || 0;
    const buyClicks = funnelData.find(s => s.key === "buy_clicks")?.count || 0;
    const checkouts = funnelData.find(s => s.key === "checkouts")?.count || 0;
    const pixCard = funnelData.find(s => s.key === "pix_card")?.count || 0;
    const paid = funnelData.find(s => s.key === "paid")?.count || 0;

    if (visitors > 20 && buyClicks / visitors < 0.05) {
      alerts.push({ type: "warning", title: "Baixa taxa de clique em comprar", desc: `Apenas ${((buyClicks / visitors) * 100).toFixed(1)}% dos visitantes clicam em comprar. Possível problema na copy ou layout da página.` });
    }
    if (checkouts > 5 && pixCard / checkouts < 0.4) {
      alerts.push({ type: "critical", title: "Abandono alto no checkout", desc: `Apenas ${((pixCard / checkouts) * 100).toFixed(0)}% dos checkouts geram Pix ou enviam cartão. Possível problema no preço, confiança ou formulário.` });
    }
    if (pixCard > 3 && paid / pixCard < 0.3) {
      alerts.push({ type: "critical", title: "Abandono após geração de Pix/Cartão", desc: `Apenas ${((paid / pixCard) * 100).toFixed(0)}% dos Pix/Cartão resultam em pagamento. Possível problema de urgência ou confiança.` });
    }
    
    return alerts;
  }, [funnelData]);

  // ── Traffic Quality Analysis ──
  const trafficAnalysis = useMemo(() => {
    // Group events by visitor/session
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

    // Score each visitor
    type ScoredVisitor = {
      id: string;
      score: number;
      quality: TrafficQuality;
      timeOnPage: number;
      maxScroll: number;
      clicks: number;
      origin: string;
      device: string;
      isBot: boolean;
    };

    const scored: ScoredVisitor[] = [];

    visitorMap.forEach((data, key) => {
      let score = 5; // entered page
      let maxScroll = 0;
      let clicks = 0;
      let origin = "Direto";
      let device = "—";

      data.events.forEach(e => {
        if (e.event_type === "scroll_depth") {
          const pct = Number(e.event_data?.percent || 0);
          maxScroll = Math.max(maxScroll, pct);
          if (pct > 30) score += 10;
        }
        if (e.event_type === "click_product_image") { score += 10; clicks++; }
        if (e.event_type === "click_buy_button") { score += 20; clicks++; }
        if (e.event_type === "checkout_initiated") score += 40;
        if (e.event_type === "pix_generated") score += 60;
        if (e.event_type === "card_submitted") score += 50;
        if (e.event_type === "payment_confirmed" || e.event_type === "pix_paid") score += 100;
        
        if (e.event_data?.utm_source) origin = String(e.event_data.utm_source);
        if (e.event_data?.device) device = String(e.event_data.device);
      });

      const timeOnPage = (data.lastSeen - data.firstSeen) / 1000;
      const isBot = timeOnPage < 2 && maxScroll < 5 && clicks === 0 && data.events.length > 3;

      let quality: TrafficQuality = "quente";
      if (score <= 10) quality = "ruim";
      else if (score <= 30) quality = "frio";
      else if (score <= 60) quality = "morno";

      // Override for very short sessions
      if (timeOnPage < 3 && maxScroll < 10 && clicks === 0) quality = "ruim";
      if (clicks === 0 && maxScroll < 20 && score <= 15) quality = "frio";

      scored.push({
        id: typeof key === "string" ? key.slice(0, 8) : String(key).slice(0, 8),
        score, quality, timeOnPage, maxScroll, clicks, origin, device, isBot,
      });
    });

    // Distribution
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

    // By source
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

    // Also count from enrichedLeads by origin
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
        name,
        visitors: data.visitors,
        checkouts: leadData?.checkouts || data.checkouts,
        paid: leadData?.paid || data.paid,
        convRate: data.visitors > 0 ? ((leadData?.paid || data.paid) / data.visitors * 100) : 0,
        avgQuality: data.visitors > 0 ? Math.round(data.totalScore / data.visitors) : 0,
      };
    }).sort((a, b) => b.visitors - a.visitors);

    // Traffic alerts
    const trafficAlerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    const botCount = scored.filter(v => v.isBot).length;
    if (botCount > 5) {
      trafficAlerts.push({ type: "critical", title: "Possível tráfego automatizado detectado", desc: `${botCount} visitantes com comportamento de bot (sessão < 2s, sem interação, múltiplos eventos).` });
    }
    if (dist.ruim > total * 0.4) {
      trafficAlerts.push({ type: "warning", title: "Alta taxa de tráfego ruim", desc: `${distPct.ruim}% dos visitantes saem sem interagir. Verifique a qualidade do tráfego ou a landing page.` });
    }
    if (dist.frio > total * 0.5) {
      trafficAlerts.push({ type: "warning", title: "Grande volume de visitantes frios", desc: `${distPct.frio}% dos visitantes tem baixa interação. A oferta pode não estar atraindo o público certo.` });
    }
    sources.forEach(s => {
      if (s.visitors > 10 && s.convRate < 1 && s.avgQuality < 20) {
        trafficAlerts.push({ type: "warning", title: `Campanha "${s.name}" com tráfego de baixa qualidade`, desc: `${s.visitors} visitantes, ${s.paid} pagamentos (${s.convRate.toFixed(1)}%). Score médio: ${s.avgQuality}.` });
      }
    });

    return { scored, dist, distPct, sources, trafficAlerts, botCount, total: scored.length };
  }, [events, enrichedLeads]);

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
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Zap className="h-4 w-4" /> Mapa do Funil de Conversão
              </h3>

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
                          <span className="text-white text-sm font-bold">{step.count.toLocaleString("pt-BR")}</span>
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

              {/* Conversion Summary */}
              <div className="bg-card border rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Taxas de Conversão por Etapa</h4>
                <div className="space-y-2">
                  {funnelData.slice(1).map((step, i) => {
                    const prev = funnelData[i];
                    const dropColor = step.dropSeverity === "green" ? "text-emerald-500 bg-emerald-500/10" : step.dropSeverity === "yellow" ? "text-amber-500 bg-amber-500/10" : "text-red-500 bg-red-500/10";
                    return (
                      <div key={step.key} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{prev.label} → {step.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dropColor}`}>
                            {step.convRate.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground text-[10px]">({prev.count} → {step.count})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottleneck Detector */}
              <div>
                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Detector de Gargalos
                </h4>
                {bottleneckAlerts.length === 0 ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium">Nenhum gargalo detectado — funil fluindo bem</span>
                  </div>
                ) : (
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
                )}
              </div>
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
