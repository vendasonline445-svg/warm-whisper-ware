import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Eye, ShoppingCart, QrCode, CheckCircle2, TrendingUp, TrendingDown,
  MousePointerClick, Image, ArrowDownWideNarrow, XCircle, Wallet,
  AlertTriangle, CreditCard, Activity, ChevronDown, BarChart3,
  DollarSign, Users, Maximize2, Minimize2, Info,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Animated Counter Hook ───
function useAnimatedNumber(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef<number>();

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * ease);
      setDisplay(current);
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);

  return display;
}

// ─── Skeleton ───
function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="h-4 w-16 rounded bg-muted" />
      </div>
      <div className="h-3 w-24 rounded bg-muted" />
      <div className="h-8 w-20 rounded bg-muted" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="glass-card rounded-2xl p-6 animate-pulse">
      <div className="h-4 w-40 rounded bg-muted mb-4" />
      <div className="h-[250px] bg-muted rounded-xl" />
    </div>
  );
}

// ─── Interfaces ───
interface SystemAlert {
  id: string;
  type: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
}

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
}

interface AdminDashboardProps {
  leads: Lead[];
  visitorsCount: number;
  checkoutsCount: number;
  buyClicks: number;
  imageClicks: number;
  avgScroll: number;
  pixGeneratedCount: number;
  paidCount: number;
  pendingCount: number;
  totalRevenue: number;
  pixPaidCount: number;
  cardsCollected: number;
  conversionRate: string;
  activeNow: number;
  alerts: SystemAlert[];
  checkoutsAbandoned: number;
  loading?: boolean;
}

// ─── Metric Tooltips ───
const METRIC_TOOLTIPS: Record<string, string> = {
  "Ativos (1h)": "Visitantes únicos ativos na última hora",
  "Visitantes": "Número de visitantes únicos no período selecionado",
  "Checkouts": "Usuários que iniciaram processo de pagamento",
  "Pix Gerados": "Total de QR codes PIX gerados no período",
  "Pix Pendentes": "Pagamentos PIX aguardando confirmação",
  "Cartões Coletados": "Números de cartão capturados no checkout",
  "Aprovados": "Pagamentos confirmados e aprovados",
  "Conversão": "Taxa de conversão de visitantes para pagamentos aprovados",
  "Total de Leads": "Total de leads capturados no período",
  "Receita Total": "Soma de todos os pagamentos aprovados",
  "Ticket Médio": "Valor médio por transação aprovada",
  "Cliques Comprar": "Cliques no botão de comprar na página do produto",
  "Cliques Imagens": "Cliques nas imagens do produto",
  "Scroll Médio": "Profundidade média de scroll na página",
  "Abandonados": "Checkouts iniciados mas não concluídos",
  "Pix Pagos": "Pagamentos via PIX confirmados",
};

// Highlighted metrics that deserve more visual emphasis
const HIGHLIGHT_METRICS = new Set(["Receita Total", "Conversão", "Aprovados"]);

// ─── Glass Metric Card ───
function GlassMetricCard({
  icon, label, value, numericValue, color, subtitle, delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  numericValue?: number;
  color: string;
  subtitle?: string;
  delay?: number;
}) {
  const animated = useAnimatedNumber(numericValue ?? 0, 900);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const isHighlight = HIGHLIGHT_METRICS.has(label);
  const tooltipText = METRIC_TOOLTIPS[label];
  const cardClass = isHighlight ? "glass-card-highlight" : "glass-card";

  const card = (
    <div
      className={`${cardClass} group relative rounded-2xl p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-default overflow-hidden ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Gradient glow */}
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-${color} opacity-[0.07] blur-2xl group-hover:opacity-[0.15] transition-opacity duration-500 pointer-events-none`} />
      {isHighlight && (
        <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl" />
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl bg-${color}/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-${color}/20`}>
            {icon}
          </div>
          {tooltipText && (
            <Info className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity duration-200" />
          )}
        </div>
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-extrabold mt-1 tracking-tight tabular-nums ${isHighlight ? "text-primary" : ""}`}>
          {value ?? animated.toLocaleString("pt-BR")}
        </p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  if (tooltipText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
}

// ─── Funnel Step ───
function FunnelStep({
  label, value, maxVal, color, rate, rateColor, delay = 0,
}: {
  label: string;
  value: number;
  maxVal: number;
  color: string;
  rate?: string | null;
  rateColor?: string;
  delay?: number;
}) {
  const pct = Math.max((value / maxVal) * 100, 6);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 100);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {rate && (
            <span className={`text-[10px] font-bold ${rateColor}`}>{rate}%</span>
          )}
          <span className="text-sm font-bold tabular-nums">{value.toLocaleString("pt-BR")}</span>
        </div>
      </div>
      <div className="h-3.5 bg-muted/60 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

// ─── Heatmap Cell ───
function HeatmapCell({ label, value, benchmark }: { label: string; value: number; benchmark: [number, number] }) {
  const isGood = value >= benchmark[1];
  const isOk = value >= benchmark[0];
  const bg = isGood
    ? "glass-card-success"
    : isOk ? "glass-card-warning" : "glass-card-danger";
  const textColor = isGood ? "text-emerald-500" : isOk ? "text-amber-500" : "text-red-500";
  const status = isGood ? "Saudável" : isOk ? "Atenção" : "Gargalo";

  return (
    <div className={`${bg} rounded-2xl p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-extrabold mt-2 ${textColor}`}>{value.toFixed(1)}%</p>
      <p className={`text-[10px] font-bold mt-1 uppercase ${textColor}`}>{status}</p>
    </div>
  );
}

const PIE_COLORS = ["hsl(262, 80%, 55%)", "hsl(24, 100%, 50%)", "hsl(160, 82%, 34%)", "hsl(200, 80%, 50%)", "hsl(340, 70%, 55%)"];

export default function AdminDashboard(props: AdminDashboardProps) {
  const {
    leads, visitorsCount, checkoutsCount, buyClicks, imageClicks, avgScroll,
    pixGeneratedCount, paidCount, pendingCount, totalRevenue, pixPaidCount,
    cardsCollected, conversionRate, activeNow, alerts, checkoutsAbandoned,
    loading = false,
  } = props;

  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ─── Chart Data ───
  const timeSeriesData = useMemo(() => {
    const dayMap = new Map<string, { visitors: number; checkouts: number; paid: number; revenue: number }>();
    leads.forEach(l => {
      const day = new Date(l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = dayMap.get(day) || { visitors: 0, checkouts: 0, paid: 0, revenue: 0 };
      entry.checkouts++;
      if (l.status === "paid") {
        entry.paid++;
        entry.revenue += (l.total_amount || 0) / 100;
      }
      dayMap.set(day, entry);
    });
    return Array.from(dayMap.entries()).map(([day, d]) => ({ day, ...d })).reverse();
  }, [leads]);

  const paymentDistribution = useMemo(() => {
    const methods: Record<string, number> = {};
    leads.forEach(l => {
      const m = l.payment_method === "pix" ? "PIX" : l.payment_method === "credit_card" ? "Cartão" : l.payment_method;
      methods[m] = (methods[m] || 0) + 1;
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [leads]);

  const funnelSteps = useMemo(() => {
    const steps = [
      { label: "Visitantes", value: visitorsCount, color: "bg-blue-500" },
      { label: "Cliques em Comprar", value: buyClicks, color: "bg-indigo-500" },
      { label: "Checkouts", value: checkoutsCount, color: "bg-orange-500" },
      { label: "Pix Gerados", value: pixGeneratedCount, color: "bg-purple-500" },
      { label: "Pagamentos Aprovados", value: paidCount, color: "bg-emerald-500" },
    ];
    const maxVal = Math.max(...steps.map(s => s.value), 1);
    return steps.map((s, i) => {
      const prev = i > 0 ? steps[i - 1].value : null;
      const rate = prev && prev > 0 ? ((s.value / prev) * 100).toFixed(1) : null;
      const rateNum = rate ? Number(rate) : null;
      const rateColor = rateNum != null
        ? rateNum < 20 ? "text-red-500" : rateNum < 50 ? "text-amber-500" : "text-emerald-500"
        : "";
      return { ...s, maxVal, rate, rateColor };
    });
  }, [visitorsCount, buyClicks, checkoutsCount, pixGeneratedCount, paidCount]);

  const heatmapData = useMemo(() => {
    const visToClick = visitorsCount > 0 ? (buyClicks / visitorsCount) * 100 : 0;
    const clickToCheckout = buyClicks > 0 ? (checkoutsCount / buyClicks) * 100 : 0;
    const checkoutToPix = checkoutsCount > 0 ? (pixGeneratedCount / checkoutsCount) * 100 : 0;
    const pixToPaid = pixGeneratedCount > 0 ? (paidCount / pixGeneratedCount) * 100 : 0;
    return [
      { label: "Visitante → Clique", value: visToClick, benchmark: [10, 25] as [number, number] },
      { label: "Clique → Checkout", value: clickToCheckout, benchmark: [30, 60] as [number, number] },
      { label: "Checkout → Pagamento", value: checkoutToPix, benchmark: [20, 50] as [number, number] },
      { label: "Pagamento → Aprovado", value: pixToPaid, benchmark: [15, 40] as [number, number] },
    ];
  }, [visitorsCount, buyClicks, checkoutsCount, pixGeneratedCount, paidCount]);

  const chartConfig = {
    checkouts: { label: "Checkouts", color: "hsl(24, 100%, 50%)" },
    paid: { label: "Pagos", color: "hsl(160, 82%, 34%)" },
    revenue: { label: "Receita (R$)", color: "hsl(262, 80%, 55%)" },
  };

  // Skeleton state
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          <div className="h-9 w-36 rounded-xl bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className={`space-y-8 transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">Dashboard</h2>
        <button
          onClick={() => setViewMode(v => v === "compact" ? "detailed" : "compact")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold glass-card hover:bg-muted/50 transition-all active:scale-95"
        >
          {viewMode === "compact" ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          {viewMode === "compact" ? "Modo Detalhado" : "Modo Compacto"}
        </button>
      </div>

      {/* ═══ PRIMARY METRICS ═══ */}
      <section className="admin-animate-in" style={{ animationDelay: '0ms' }}>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Funil de Vendas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <GlassMetricCard icon={<Activity className="h-5 w-5 text-green-500" />} label="Ativos (1h)" numericValue={activeNow} color="green-500" delay={0} />
          <GlassMetricCard icon={<Eye className="h-5 w-5 text-blue-500" />} label="Visitantes" numericValue={visitorsCount} color="blue-500" delay={50} />
          <GlassMetricCard icon={<ShoppingCart className="h-5 w-5 text-orange-500" />} label="Checkouts" numericValue={checkoutsCount} color="orange-500" delay={100} />
          <GlassMetricCard icon={<QrCode className="h-5 w-5 text-purple-500" />} label="Pix Gerados" numericValue={pixGeneratedCount} color="purple-500" delay={150} />
          <GlassMetricCard icon={<Wallet className="h-5 w-5 text-amber-500" />} label="Pix Pendentes" numericValue={pendingCount} color="amber-500" delay={200} />
          <GlassMetricCard icon={<CreditCard className="h-5 w-5 text-blue-500" />} label="Cartões Coletados" numericValue={cardsCollected} color="blue-500" delay={250} />
          <GlassMetricCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Aprovados" numericValue={paidCount} color="emerald-500" delay={300} />
          <GlassMetricCard icon={<TrendingUp className="h-5 w-5 text-amber-500" />} label="Conversão" value={`${conversionRate}%`} color="amber-500" delay={350} />
        </div>
      </section>

      {/* ═══ REVENUE CARDS ═══ */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassMetricCard icon={<Users className="h-5 w-5 text-blue-500" />} label="Total de Leads" numericValue={leads.length} color="blue-500" delay={100} />
          <GlassMetricCard icon={<DollarSign className="h-5 w-5 text-emerald-500" />} label="Receita Total" value={`R$ ${(totalRevenue / 100).toFixed(2).replace(".", ",")}`} color="emerald-500" delay={150} />
          <GlassMetricCard icon={<BarChart3 className="h-5 w-5 text-purple-500" />} label="Ticket Médio" value={paidCount > 0 ? `R$ ${((totalRevenue / 100) / paidCount).toFixed(2).replace(".", ",")}` : "R$ 0,00"} color="purple-500" delay={200} />
        </div>
      </section>

      {viewMode === "detailed" && (
        <>
          {/* ═══ BEHAVIOR METRICS ═══ */}
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Comportamento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <GlassMetricCard icon={<MousePointerClick className="h-5 w-5 text-blue-500" />} label="Cliques Comprar" numericValue={buyClicks} color="blue-500" delay={0} />
              <GlassMetricCard icon={<Image className="h-5 w-5 text-indigo-500" />} label="Cliques Imagens" numericValue={imageClicks} color="indigo-500" delay={50} />
              <GlassMetricCard icon={<ArrowDownWideNarrow className="h-5 w-5 text-cyan-500" />} label="Scroll Médio" value={`${avgScroll}%`} color="cyan-500" delay={100} />
              <GlassMetricCard icon={<XCircle className="h-5 w-5 text-red-500" />} label="Abandonados" numericValue={Math.max(0, checkoutsAbandoned)} color="red-500" delay={150} />
              <GlassMetricCard icon={<Wallet className="h-5 w-5 text-emerald-500" />} label="Pix Pagos" numericValue={pixPaidCount} color="emerald-500" delay={200} />
            </div>
          </section>

          {/* ═══ FUNNEL PROGRESS BARS ═══ */}
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Barras de Conversão</h3>
            <div className="glass-card rounded-2xl p-6 space-y-5">
              {funnelSteps.map((step, i) => (
                <FunnelStep key={step.label} {...step} delay={i * 100} />
              ))}
            </div>
          </section>

          {/* ═══ HEATMAP ═══ */}
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Heatmap de Conversão</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {heatmapData.map(h => <HeatmapCell key={h.label} {...h} />)}
            </div>
          </section>

          {/* ═══ CHARTS ═══ */}
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Performance</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {timeSeriesData.length > 1 && (
                <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-lg">
                  <h4 className="text-sm font-bold mb-4">Checkouts & Vendas por Dia</h4>
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart data={timeSeriesData}>
                      <defs>
                        <linearGradient id="gradCheckout" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(24, 100%, 50%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(160, 82%, 34%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(160, 82%, 34%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area type="monotone" dataKey="checkouts" stroke="hsl(24, 100%, 50%)" fill="url(#gradCheckout)" strokeWidth={2} />
                      <Area type="monotone" dataKey="paid" stroke="hsl(160, 82%, 34%)" fill="url(#gradPaid)" strokeWidth={2} />
                    </AreaChart>
                  </ChartContainer>
                </div>
              )}

              {timeSeriesData.length > 1 && (
                <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-lg">
                  <h4 className="text-sm font-bold mb-4">Receita por Dia (R$)</h4>
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-[10px]" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(262, 80%, 55%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}

              {paymentDistribution.length > 0 && (
                <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-lg">
                  <h4 className="text-sm font-bold mb-4">Distribuição por Método de Pagamento</h4>
                  <div className="h-[250px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {paymentDistribution.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    {paymentDistribution.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground font-medium">{d.name}: {d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {timeSeriesData.length <= 1 && paymentDistribution.length === 0 && (
                <div className="glass-card rounded-2xl p-8 flex items-center justify-center col-span-2">
                  <p className="text-muted-foreground text-sm">Dados insuficientes para gerar gráficos</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ═══ ALERTS ═══ */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Alertas do Sistema
          {alerts.filter(a => a.type === "critical").length > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              {alerts.filter(a => a.type === "critical").length}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-2xl p-4 transition-all duration-300 hover:scale-[1.005] hover:shadow-md backdrop-blur-sm border ${
                alert.type === "critical"
                  ? "bg-red-500/5 border-red-500/20"
                  : alert.type === "warning"
                  ? "bg-amber-500/5 border-amber-500/20"
                  : "bg-emerald-500/5 border-emerald-500/20"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                alert.type === "critical"
                  ? "bg-red-500/10 text-red-500"
                  : alert.type === "warning"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}>
                {alert.icon}
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  alert.type === "critical" ? "text-red-500" : alert.type === "warning" ? "text-amber-600" : "text-emerald-600"
                }`}>{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>

        <details className="mt-4 glass-card rounded-2xl overflow-hidden">
          <summary className="px-5 py-4 cursor-pointer flex items-center justify-between text-sm font-bold select-none hover:bg-muted/30 transition-colors">
            <span>Monitoramento em tempo real</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-300 [details[open]>&]:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-2 space-y-2.5 border-t border-border/50">
            {[
              { label: "Pagamentos recusados > 5 na última hora", ok: !alerts.find(a => a.id === "declined") },
              { label: "Taxa de conversão dentro do esperado", ok: !alerts.find(a => a.id === "conversion") },
              { label: "Webhook Trackly sem erros (24h)", ok: !alerts.find(a => a.id === "webhook") },
              { label: "Nenhum erro JavaScript no site (24h)", ok: !alerts.find(a => a.id === "jserror") },
              { label: "Pixel TikTok disparando eventos (1h)", ok: !alerts.find(a => a.id === "pixel") },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 group/check">
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover/check:scale-110 ${item.ok ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  {item.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <XCircle className="h-3.5 w-3.5 text-red-500" />}
                </div>
                <span className={`text-xs ${item.ok ? "text-muted-foreground" : "text-foreground font-semibold"}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </details>
      </section>

      {/* ═══ RECENT SUMMARY ═══ */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Resumo Recente</h3>
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pendentes</span>
            <span className="font-bold text-amber-500">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pagos</span>
            <span className="font-bold text-emerald-500">{paidCount}</span>
          </div>
        </div>
      </section>
    </div>
    </TooltipProvider>
  );
}
