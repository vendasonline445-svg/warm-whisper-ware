import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, ShoppingCart, QrCode, CheckCircle2, Wallet, AlertTriangle,
  Flame, Thermometer, Snowflake, X, Clock, ChevronRight, Filter,
  TrendingUp, XCircle, DollarSign
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

type FunnelStage = "checkout_iniciado" | "pix_gerado" | "pago" | "abandonado" | "cartao_enviado";
type ScoreLevel = "frio" | "morno" | "quente";
type CRMSubTab = "pipeline" | "recovery" | "alerts";

interface CRMFilters {
  paymentMethod: string;
  stage: string;
  cidade: string;
  period: string;
}

// ── Helpers ──
function getLeadStage(lead: Lead): FunnelStage {
  if (lead.status === "paid") return "pago";
  if (lead.payment_method === "pix" && lead.transaction_id) return "pix_gerado";
  if (lead.payment_method === "credit_card" || lead.card_number) return "cartao_enviado";
  return "checkout_iniciado";
}

function getLeadScore(lead: Lead): number {
  let score = 40; // checkout initiated = 40
  if (lead.payment_method === "pix" && lead.transaction_id) score += 20; // pix generated
  if (lead.status === "paid") score += 40; // paid
  if (lead.card_number) score += 10; // card filled
  return score;
}

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 51) return "quente";
  if (score >= 21) return "morno";
  return "frio";
}

const STAGE_LABELS: Record<FunnelStage, string> = {
  checkout_iniciado: "Checkout Iniciado",
  cartao_enviado: "Cartão Enviado",
  pix_gerado: "Pix Gerado",
  pago: "Pago",
  abandonado: "Abandonado",
};

const STAGE_ORDER: FunnelStage[] = ["checkout_iniciado", "cartao_enviado", "pix_gerado", "pago", "abandonado"];

const STAGE_COLORS: Record<FunnelStage, string> = {
  checkout_iniciado: "bg-orange-500",
  cartao_enviado: "bg-blue-500",
  pix_gerado: "bg-purple-500",
  pago: "bg-emerald-500",
  abandonado: "bg-red-500",
};

const SCORE_CONFIG: Record<ScoreLevel, { label: string; icon: any; colorClass: string; bgClass: string }> = {
  quente: { label: "Quente", icon: Flame, colorClass: "text-red-500", bgClass: "bg-red-500/10" },
  morno: { label: "Morno", icon: Thermometer, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" },
  frio: { label: "Frio", icon: Snowflake, colorClass: "text-blue-400", bgClass: "bg-blue-400/10" },
};

// ── Component ──
export default function AdminCRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [subTab, setSubTab] = useState<CRMSubTab>("pipeline");
  const [filters, setFilters] = useState<CRMFilters>({
    paymentMethod: "all",
    stage: "all",
    cidade: "all",
    period: "30days",
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const daysMap: Record<string, number> = { today: 0, "7days": 7, "30days": 30, "90days": 90 };
    const days = daysMap[filters.period] ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { data } = await supabase
      .from("checkout_leads")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    setLeads((data as Lead[]) || []);
    setLoading(false);
  }, [filters.period]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Filtered & enriched leads ──
  const enrichedLeads = useMemo(() => {
    return leads.map(l => {
      const stage = getLeadStage(l);
      const score = getLeadScore(l);
      const level = getScoreLevel(score);
      const isRecovery = stage !== "pago" && (l.transaction_id || l.card_number);
      return { ...l, stage, score, level, isRecovery: !!isRecovery };
    });
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return enrichedLeads.filter(l => {
      if (filters.paymentMethod !== "all" && l.payment_method !== filters.paymentMethod) return false;
      if (filters.stage !== "all" && l.stage !== filters.stage) return false;
      if (filters.cidade !== "all" && l.cidade !== filters.cidade) return false;
      return true;
    });
  }, [enrichedLeads, filters]);

  // ── Metrics ──
  const metrics = useMemo(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const activeNow = enrichedLeads.filter(l => new Date(l.created_at).getTime() > oneHourAgo).length;
    const hot = enrichedLeads.filter(l => l.level === "quente").length;
    const openCheckouts = enrichedLeads.filter(l => l.stage === "checkout_iniciado").length;
    const pendingPix = enrichedLeads.filter(l => l.stage === "pix_gerado").length;
    const revenue = enrichedLeads.filter(l => l.stage === "pago").reduce((s, l) => s + (l.total_amount || 0), 0);
    return { activeNow, hot, openCheckouts, pendingPix, revenue };
  }, [enrichedLeads]);

  // ── Alerts ──
  const crmAlerts = useMemo(() => {
    const alerts: { type: "critical" | "warning"; title: string; desc: string }[] = [];
    const total = enrichedLeads.length;
    if (total < 5) return alerts;

    const checkoutStarted = enrichedLeads.filter(l => l.stage !== "pago").length;
    const paid = enrichedLeads.filter(l => l.stage === "pago").length;
    const pixGenerated = enrichedLeads.filter(l => l.stage === "pix_gerado" || l.stage === "pago").length;
    const pixPaid = enrichedLeads.filter(l => l.payment_method === "pix" && l.stage === "pago").length;

    if (total > 10 && paid / total < 0.05) {
      alerts.push({ type: "critical", title: "Conversão geral muito baixa", desc: `Apenas ${paid} de ${total} leads converteram (${((paid / total) * 100).toFixed(1)}%).` });
    }
    if (pixGenerated > 5 && pixPaid / pixGenerated < 0.3) {
      alerts.push({ type: "warning", title: "Muitos Pix gerados sem pagamento", desc: `${pixGenerated} Pix gerados, mas apenas ${pixPaid} pagos. Possível problema no pagamento.` });
    }
    const abandoned = enrichedLeads.filter(l => l.stage === "checkout_iniciado").length;
    if (abandoned > total * 0.6) {
      alerts.push({ type: "warning", title: "Alto abandono no checkout", desc: `${abandoned} leads abandonaram no checkout (${((abandoned / total) * 100).toFixed(0)}%). Revise a oferta.` });
    }
    return alerts;
  }, [enrichedLeads]);

  // ── Pipeline grouped ──
  const pipeline = useMemo(() => {
    const groups: Record<FunnelStage, typeof filteredLeads> = {
      checkout_iniciado: [], cartao_enviado: [], pix_gerado: [], pago: [], abandonado: [],
    };
    filteredLeads.forEach(l => {
      if (groups[l.stage]) groups[l.stage].push(l);
    });
    return groups;
  }, [filteredLeads]);

  // ── Recovery leads ──
  const recoveryLeads = useMemo(() => {
    return enrichedLeads.filter(l => l.isRecovery).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [enrichedLeads]);

  // ── Unique cities for filter ──
  const uniqueCidades = useMemo(() => {
    const set = new Set(leads.map(l => l.cidade).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [leads]);

  const ScoreBadge = ({ level, score }: { level: ScoreLevel; score: number }) => {
    const cfg = SCORE_CONFIG[level];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bgClass} ${cfg.colorClass}`}>
        <Icon className="h-3 w-3" /> {cfg.label} ({score})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Ativos (1h)", value: metrics.activeNow, icon: Users, color: "bg-blue-500/10 text-blue-500" },
          { label: "Leads Quentes", value: metrics.hot, icon: Flame, color: "bg-red-500/10 text-red-500" },
          { label: "Checkouts Abertos", value: metrics.openCheckouts, icon: ShoppingCart, color: "bg-orange-500/10 text-orange-500" },
          { label: "Pix Pendentes", value: metrics.pendingPix, icon: QrCode, color: "bg-purple-500/10 text-purple-500" },
          { label: "Receita Confirmada", value: `R$ ${(metrics.revenue / 100).toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "bg-emerald-500/10 text-emerald-500" },
        ].map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-card border rounded-xl p-4">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2 ${m.color.split(" ")[0]}`}>
                <Icon className={`h-4 w-4 ${m.color.split(" ")[1]}`} />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{m.label}</p>
              <p className="text-xl font-bold mt-1">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* Sub-tabs + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {([
            { key: "pipeline", label: "Pipeline", icon: TrendingUp },
            { key: "recovery", label: "Recuperação", icon: Clock },
            { key: "alerts", label: "Alertas", icon: AlertTriangle },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.key === "alerts" && crmAlerts.length > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">{crmAlerts.length}</span>
              )}
              {t.key === "recovery" && recoveryLeads.length > 0 && (
                <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">{recoveryLeads.length}</span>
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-card border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          {/* PIPELINE */}
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
                        <div
                          key={l.id}
                          onClick={() => setSelectedLead(l)}
                          className="bg-card border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex-shrink-0">
                              <ScoreBadge level={l.level} score={l.score} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{l.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{l.email} · {l.cidade || "—"}/{l.uf || "—"}</p>
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

          {/* RECOVERY */}
          {subTab === "recovery" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Leads em Recuperação ({recoveryLeads.length})
              </h3>
              {recoveryLeads.length === 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">Nenhum lead pendente de recuperação</span>
                </div>
              ) : (
                recoveryLeads.slice(0, 30).map(l => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    className="bg-card border border-amber-500/20 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-3 w-3 rounded-full flex-shrink-0 ${STAGE_COLORS[l.stage]}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{l.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{STAGE_LABELS[l.stage]}</span>
                          <span>·</span>
                          <span>{l.payment_method === "pix" ? "Pix" : "Cartão"}</span>
                          <span>·</span>
                          <span>{l.cidade || "—"}/{l.uf || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-amber-600">
                          {l.total_amount ? `R$ ${(l.total_amount / 100).toFixed(2)}` : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ALERTS */}
          {subTab === "alerts" && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Alertas do CRM
              </h3>
              {crmAlerts.length === 0 ? (
                <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">Nenhum alerta detectado — funil saudável</span>
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
        </>
      )}

      {/* ── Lead Detail Side Panel ── */}
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
                <div className="flex items-center gap-2 mt-2">
                  <ScoreBadge level={getScoreLevel(getLeadScore(selectedLead))} score={getLeadScore(selectedLead)} />
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${STAGE_COLORS[getLeadStage(selectedLead)]}`}>
                    {STAGE_LABELS[getLeadStage(selectedLead)]}
                  </span>
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
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShoppingCart className="h-3 w-3 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Checkout iniciado</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {selectedLead.transaction_id && selectedLead.payment_method === "pix" && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <QrCode className="h-3 w-3 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Pix gerado</p>
                        <p className="text-[10px] text-muted-foreground">ID: {selectedLead.transaction_id.slice(0, 12)}...</p>
                      </div>
                    </div>
                  )}
                  {selectedLead.card_number && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Wallet className="h-3 w-3 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Cartão enviado</p>
                        <p className="text-[10px] text-muted-foreground">Final {selectedLead.card_number.slice(-4)}</p>
                      </div>
                    </div>
                  )}
                  {selectedLead.status === "paid" && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-600">Pagamento confirmado</p>
                      </div>
                    </div>
                  )}
                  {selectedLead.status !== "paid" && (
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <XCircle className="h-3 w-3 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Aguardando pagamento</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(selectedLead.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
