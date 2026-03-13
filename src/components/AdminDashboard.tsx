import { useState, useMemo } from "react";
import {
  Eye, ShoppingCart, QrCode, CheckCircle2, TrendingUp, TrendingDown,
  MousePointerClick, Image, ArrowDownWideNarrow, XCircle, Wallet,
  AlertTriangle, CreditCard, Activity, ChevronDown, BarChart3,
  Layers, DollarSign, Users, Maximize2, Minimize2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

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
}

// ─── Metric Card ───
function MetricCard({
  icon, label, value, trend, color, subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number | null;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className={`group relative bg-card border rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-${color}/5 overflow-hidden`}>
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-${color}/5 to-transparent opacity-60 pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`h-10 w-10 rounded-xl bg-${color}/10 flex items-center justify-center transition-transform group-hover:scale-110`}>
            {icon}
          </div>
          {trend != null && trend !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
              trend > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"
            }`}>
              {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-extrabold mt-1 tracking-tight">{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Funnel Step ───
function FunnelStep({
  label, value, maxVal, color, rate, rateColor,
}: {
  label: string;
  value: number;
  maxVal: number;
  color: string;
  rate?: string | null;
  rateColor?: string;
}) {
  const pct = Math.max((value / maxVal) * 100, 6);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {rate && (
            <span className={`text-[10px] font-bold ${rateColor}`}>{rate}%</span>
          )}
          <span className="text-sm font-bold tabular-nums">{value.toLocaleString("pt-BR")}</span>
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Heatmap Cell ───
function HeatmapCell({ label, value, benchmark }: { label: string; value: number; benchmark: [number, number] }) {
  const bg = value >= benchmark[1]
    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600"
    : value >= benchmark[0]
    ? "bg-amber-500/15 border-amber-500/30 text-amber-600"
    : "bg-red-500/15 border-red-500/30 text-red-500";
  const status = value >= benchmark[1] ? "Saudável" : value >= benchmark[0] ? "Atenção" : "Gargalo";
  return (
    <div className={`border rounded-xl p-4 ${bg} transition-all hover:scale-[1.02]`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value.toFixed(1)}%</p>
      <p className="text-[10px] font-bold mt-1 uppercase">{status}</p>
    </div>
  );
}

const PIE_COLORS = ["hsl(262, 80%, 55%)", "hsl(24, 100%, 50%)", "hsl(160, 82%, 34%)", "hsl(200, 80%, 50%)", "hsl(340, 70%, 55%)"];

export default function AdminDashboard(props: AdminDashboardProps) {
  const {
    leads, visitorsCount, checkoutsCount, buyClicks, imageClicks, avgScroll,
    pixGeneratedCount, paidCount, pendingCount, totalRevenue, pixPaidCount,
    cardsCollected, conversionRate, activeNow, alerts, checkoutsAbandoned,
  } = props;

  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");

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
    return Array.from(dayMap.entries())
      .map(([day, d]) => ({ day, ...d }))
      .reverse();
  }, [leads]);

  const paymentDistribution = useMemo(() => {
    const methods: Record<string, number> = {};
    leads.forEach(l => {
      const m = l.payment_method === "pix" ? "PIX" : l.payment_method === "credit_card" ? "Cartão" : l.payment_method;
      methods[m] = (methods[m] || 0) + 1;
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // ─── Funnel Rates ───
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

  // ─── Heatmap Data ───
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

  return (
    <div className="space-y-8">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold tracking-tight">Dashboard</h2>
        <button
          onClick={() => setViewMode(v => v === "compact" ? "detailed" : "compact")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
        >
          {viewMode === "compact" ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
          {viewMode === "compact" ? "Modo Detalhado" : "Modo Compacto"}
        </button>
      </div>

      {/* ═══ PRIMARY METRICS ═══ */}
      <section>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Funil de Vendas</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <MetricCard icon={<Activity className="h-5 w-5 text-green-500" />} label="Ativos (1h)" value={activeNow} color="green-500" />
          <MetricCard icon={<Eye className="h-5 w-5 text-blue-500" />} label="Visitantes" value={visitorsCount} color="blue-500" />
          <MetricCard icon={<ShoppingCart className="h-5 w-5 text-orange-500" />} label="Checkouts" value={checkoutsCount} color="orange-500" />
          <MetricCard icon={<QrCode className="h-5 w-5 text-purple-500" />} label="Pix Gerados" value={pixGeneratedCount} color="purple-500" />
          <MetricCard icon={<Wallet className="h-5 w-5 text-amber-500" />} label="Pix Pendentes" value={pendingCount} color="amber-500" />
          <MetricCard icon={<CreditCard className="h-5 w-5 text-blue-500" />} label="Cartões Coletados" value={cardsCollected} color="blue-500" />
          <MetricCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Aprovados" value={paidCount} color="emerald-500" />
          <MetricCard icon={<TrendingUp className="h-5 w-5 text-amber-500" />} label="Conversão" value={`${conversionRate}%`} color="amber-500" />
        </div>
      </section>

      {/* ═══ REVENUE CARDS ═══ */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard icon={<Users className="h-5 w-5 text-blue-500" />} label="Total de Leads" value={leads.length} color="blue-500" />
          <MetricCard icon={<DollarSign className="h-5 w-5 text-emerald-500" />} label="Receita Total" value={`R$ ${(totalRevenue / 100).toFixed(2).replace(".", ",")}`} color="emerald-500" />
          <MetricCard icon={<BarChart3 className="h-5 w-5 text-purple-500" />} label="Ticket Médio" value={paidCount > 0 ? `R$ ${((totalRevenue / 100) / paidCount).toFixed(2).replace(".", ",")}` : "R$ 0,00"} color="purple-500" />
        </div>
      </section>

      {viewMode === "detailed" && (
        <>
          {/* ═══ BEHAVIOR METRICS ═══ */}
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Comportamento</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard icon={<MousePointerClick className="h-5 w-5 text-blue-500" />} label="Cliques Comprar" value={buyClicks} color="blue-500" />
              <MetricCard icon={<Image className="h-5 w-5 text-indigo-500" />} label="Cliques Imagens" value={imageClicks} color="indigo-500" />
              <MetricCard icon={<ArrowDownWideNarrow className="h-5 w-5 text-cyan-500" />} label="Scroll Médio" value={`${avgScroll}%`} color="cyan-500" />
              <MetricCard icon={<XCircle className="h-5 w-5 text-red-500" />} label="Abandonados" value={Math.max(0, checkoutsAbandoned)} color="red-500" />
              <MetricCard icon={<Wallet className="h-5 w-5 text-emerald-500" />} label="Pix Pagos" value={pixPaidCount} color="emerald-500" />
            </div>
          </section>

          {/* ═══ FUNNEL PROGRESS BARS ═══ */}
          <section>
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Barras de Conversão</h3>
            <div className="bg-card border rounded-2xl p-6 space-y-4">
              {funnelSteps.map((step) => (
                <FunnelStep key={step.label} {...step} />
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
              {/* Area Chart - Checkouts & Paid */}
              {timeSeriesData.length > 1 && (
                <div className="bg-card border rounded-2xl p-6">
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

              {/* Bar Chart - Revenue */}
              {timeSeriesData.length > 1 && (
                <div className="bg-card border rounded-2xl p-6">
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

              {/* Pie Chart - Payment Methods */}
              {paymentDistribution.length > 0 && (
                <div className="bg-card border rounded-2xl p-6">
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

              {/* No data fallback */}
              {timeSeriesData.length <= 1 && paymentDistribution.length === 0 && (
                <div className="bg-card border rounded-2xl p-8 flex items-center justify-center col-span-2">
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
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              {alerts.filter(a => a.type === "critical").length}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 border rounded-2xl p-4 transition-all hover:scale-[1.005] ${
                alert.type === "critical"
                  ? "bg-destructive/5 border-destructive/30"
                  : alert.type === "warning"
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-emerald-500/5 border-emerald-500/30"
              }`}
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                alert.type === "critical"
                  ? "bg-destructive/10 text-destructive"
                  : alert.type === "warning"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}>
                {alert.icon}
              </div>
              <div>
                <p className={`text-sm font-bold ${
                  alert.type === "critical" ? "text-destructive" : alert.type === "warning" ? "text-amber-600" : "text-emerald-600"
                }`}>{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <details className="mt-4 bg-card border rounded-2xl overflow-hidden">
          <summary className="px-5 py-4 cursor-pointer flex items-center justify-between text-sm font-bold select-none hover:bg-muted/50 transition-colors">
            <span>Monitoramento em tempo real</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [details[open]>&]:rotate-180" />
          </summary>
          <div className="px-5 pb-5 pt-2 space-y-2.5 border-t">
            {[
              { label: "Pagamentos recusados > 5 na última hora", ok: !alerts.find(a => a.id === "declined") },
              { label: "Taxa de conversão dentro do esperado", ok: !alerts.find(a => a.id === "conversion") },
              { label: "Webhook Trackly sem erros (24h)", ok: !alerts.find(a => a.id === "webhook") },
              { label: "Nenhum erro JavaScript no site (24h)", ok: !alerts.find(a => a.id === "jserror") },
              { label: "Pixel TikTok disparando eventos (1h)", ok: !alerts.find(a => a.id === "pixel") },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-lg flex items-center justify-center flex-shrink-0 ${item.ok ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                  {item.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    : <XCircle className="h-3.5 w-3.5 text-destructive" />}
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
        <div className="bg-card border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pendentes</span>
            <span className="font-bold text-amber-600">{pendingCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pagos</span>
            <span className="font-bold text-emerald-600">{paidCount}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
