import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Palette, Zap, Wallet, Plus, Trash2, Pencil, Play, Pause, AlertTriangle, Link2, RefreshCw, ExternalLink, Rocket, ShieldBan, Activity, CalendarDays } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import TikTokConnect from "@/components/ads/TikTokConnect";
import CampaignManager from "@/components/ads/CampaignManager";
import SmartCampaignCreator from "@/components/ads/SmartCampaignCreator";
import BlockedWordsManager from "@/components/ads/BlockedWordsManager";
import AccountHealthMonitor from "@/components/ads/AccountHealthMonitor";

const db = supabase as any;

type SubTab = "campaigns" | "creatives" | "automation" | "budgets" | "connect" | "smart_create" | "blocked_words" | "health";

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "connect", label: "Conexão", icon: <Link2 className="h-4 w-4" /> },
  { key: "smart_create", label: "Smart+", icon: <Rocket className="h-4 w-4" /> },
  { key: "campaigns", label: "Campanhas", icon: <Megaphone className="h-4 w-4" /> },
  { key: "creatives", label: "Criativos", icon: <Palette className="h-4 w-4" /> },
  { key: "automation", label: "Automação", icon: <Zap className="h-4 w-4" /> },
  { key: "budgets", label: "Budgets", icon: <Wallet className="h-4 w-4" /> },
  { key: "blocked_words", label: "Blocked Words", icon: <ShieldBan className="h-4 w-4" /> },
  { key: "health", label: "Saúde", icon: <Activity className="h-4 w-4" /> },
];

const fmtMoney = (v: number) => `R$ ${(v / 100).toFixed(2)}`;

export default function AdminAdsHub({ defaultTab }: { defaultTab?: SubTab }) {
  const [subTab, setSubTab] = useState<SubTab>(defaultTab ?? "connect");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [creativeMetrics, setCreativeMetrics] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialogs
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ rule_name: "", metric: "cpa", condition_operator: ">", condition_value: "", action: "pause_campaign", campaign_id: "", client_id: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [campRes, creatRes, rulesRes, costsRes, clientsRes, metricsRes] = await Promise.all([
      db.from("campaigns").select("*").order("created_at", { ascending: false }),
      db.from("creatives").select("*, campaigns(campaign_name)").order("created_at", { ascending: false }),
      db.from("automation_rules").select("*, campaigns(campaign_name), clients(client_name)").order("created_at", { ascending: false }),
      db.from("campaign_costs").select("*, campaigns(campaign_name)").order("date", { ascending: false }).limit(100),
      db.from("clients").select("id, client_name").eq("status", "active"),
      db.from("creative_metrics").select("*"),
    ]);
    setCampaigns(campRes.data || []);
    setCreatives(creatRes.data || []);
    setCreativeMetrics(metricsRes.data || []);
    setRules(rulesRes.data || []);
    setCosts(costsRes.data || []);
    setClients(clientsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Automation Rules CRUD ──
  const addRule = async () => {
    if (!newRule.rule_name || !newRule.condition_value) return;
    const payload: any = {
      rule_name: newRule.rule_name,
      metric: newRule.metric,
      condition_operator: newRule.condition_operator,
      condition_value: parseFloat(newRule.condition_value),
      action: newRule.action,
      rule_type: newRule.metric + "_" + newRule.action,
    };
    if (newRule.campaign_id) payload.campaign_id = newRule.campaign_id;
    if (newRule.client_id) payload.client_id = newRule.client_id;

    const { error } = await db.from("automation_rules").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Regra criada" });
    setShowAddRule(false);
    setNewRule({ rule_name: "", metric: "cpa", condition_operator: ">", condition_value: "", action: "pause_campaign", campaign_id: "", client_id: "" });
    fetchData();
  };

  const toggleRule = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    await db.from("automation_rules").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    fetchData();
  };

  const deleteRule = async (id: string) => {
    await db.from("automation_rules").delete().eq("id", id);
    fetchData();
  };

  // ── Budget summary from campaign_costs ──
  const budgetSummary = useMemo(() => {
    const bycamp: Record<string, { name: string; totalSpend: number; days: number; lastDate: string }> = {};
    costs.forEach((c: any) => {
      const cid = c.campaign_id || "unknown";
      if (!bycamp[cid]) bycamp[cid] = { name: c.campaigns?.campaign_name || "—", totalSpend: 0, days: 0, lastDate: "" };
      bycamp[cid].totalSpend += c.spend || 0;
      bycamp[cid].days++;
      if (!bycamp[cid].lastDate || c.date > bycamp[cid].lastDate) bycamp[cid].lastDate = c.date;
    });
    return Object.entries(bycamp).map(([id, v]) => ({
      campaign_id: id,
      ...v,
      avgDaily: v.days > 0 ? Math.round(v.totalSpend / v.days) : 0,
    }));
  }, [costs]);

  // ── Daily spend breakdown ──
  const dailySpend = useMemo(() => {
    const byDate: Record<string, { date: string; totalSpend: number; campaigns: number; campaignNames: Set<string> }> = {};
    costs.forEach((c: any) => {
      const d = c.date;
      if (!byDate[d]) byDate[d] = { date: d, totalSpend: 0, campaigns: 0, campaignNames: new Set() };
      byDate[d].totalSpend += c.spend || 0;
      byDate[d].campaignNames.add(c.campaigns?.campaign_name || c.campaign_id || "—");
    });
    return Object.values(byDate)
      .map(v => ({ ...v, campaigns: v.campaignNames.size }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [costs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Ads Hub</h2>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && subTab !== "connect" && subTab !== "smart_create" && subTab !== "blocked_words" && subTab !== "health" && <p className="text-center text-muted-foreground py-8">Carregando...</p>}

      {/* ── CONNECT ── */}
      {subTab === "connect" && <TikTokConnect onSynced={fetchData} />}

      {/* ── SMART CREATE ── */}
      {subTab === "smart_create" && <SmartCampaignCreator />}

      {/* ── BLOCKED WORDS ── */}
      {subTab === "blocked_words" && <BlockedWordsManager />}

      {/* ── HEALTH MONITOR ── */}
      {subTab === "health" && <AccountHealthMonitor />}

      {/* ── CAMPAIGNS ── */}
      {!loading && subTab === "campaigns" && (
        <div className="space-y-4">
          <CampaignManager />
          
          {/* Local campaigns from DB */}
          <Card>
            <CardHeader><CardTitle className="text-base">Campanhas Sincronizadas ({campaigns.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>ID Externo</TableHead>
                      <TableHead>Criada em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.campaign_name}</TableCell>
                        <TableCell><Badge variant="outline">{c.platform}</Badge></TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{c.campaign_external_id || "—"}</TableCell>
                        <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                    {!campaigns.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma campanha</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CREATIVES ── */}
      {!loading && subTab === "creatives" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Criativos ({creatives.length})</CardTitle>
            <p className="text-xs text-muted-foreground">Performance dos criativos com dados de vendas, spend e ROAS</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creatives.map(c => {
                    const m = creativeMetrics.find((cm: any) => cm.creative_id === c.id);
                    const spend = Number(m?.spend || 0);
                    const conversions = Number(m?.conversions || 0);
                    const revenue = Number(m?.revenue || 0);
                    const cpa = Number(m?.cpa || 0);
                    const roas = Number(m?.roas || 0);
                    
                    let statusLabel = "Sem dados";
                    let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                    if (spend > 0 && conversions > 0 && roas >= 2) {
                      statusLabel = "✅ Validado";
                      statusVariant = "default";
                    } else if (spend > 0 && conversions > 0) {
                      statusLabel = "⚠️ Em teste";
                      statusVariant = "secondary";
                    } else if (spend > 0 && conversions === 0) {
                      statusLabel = "❌ Sem vendas";
                      statusVariant = "destructive";
                    }

                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{c.creative_name}</TableCell>
                        <TableCell className="text-xs">{c.campaigns?.campaign_name || "—"}</TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {spend > 0 ? `R$ ${spend.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-semibold">
                          {conversions || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {revenue > 0 ? `R$ ${revenue.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {cpa > 0 ? `R$ ${cpa.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          {roas > 0 ? `${roas.toFixed(2)}x` : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusVariant} className="text-[10px]">{statusLabel}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!creatives.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum criativo</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AUTOMATION ── */}
      {!loading && subTab === "automation" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Regras de Automação ({rules.length})</h3>
            <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Regra</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Regra de Automação</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nome da regra" value={newRule.rule_name} onChange={e => setNewRule(p => ({ ...p, rule_name: e.target.value }))} />
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={newRule.metric} onValueChange={v => setNewRule(p => ({ ...p, metric: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpa">CPA</SelectItem>
                        <SelectItem value="roas">ROAS</SelectItem>
                        <SelectItem value="ctr">CTR</SelectItem>
                        <SelectItem value="spend">Spend</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newRule.condition_operator} onValueChange={v => setNewRule(p => ({ ...p, condition_operator: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">{">"}</SelectItem>
                        <SelectItem value="<">{"<"}</SelectItem>
                        <SelectItem value=">=">{"≥"}</SelectItem>
                        <SelectItem value="<=">{"≤"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="Valor" value={newRule.condition_value} onChange={e => setNewRule(p => ({ ...p, condition_value: e.target.value }))} />
                  </div>
                  <Select value={newRule.action} onValueChange={v => setNewRule(p => ({ ...p, action: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pause_campaign">Pausar campanha</SelectItem>
                      <SelectItem value="reduce_budget">Reduzir budget</SelectItem>
                      <SelectItem value="mark_creative_weak">Marcar criativo fraco</SelectItem>
                      <SelectItem value="alert">Gerar alerta</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newRule.campaign_id || "none"} onValueChange={v => setNewRule(p => ({ ...p, campaign_id: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Campanha (todas)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas as campanhas</SelectItem>
                      {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addRule} className="w-full">Criar Regra</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Rules summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{rules.filter(r => r.status === "active").length}</p>
              <p className="text-xs text-muted-foreground">Regras ativas</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{rules.filter(r => r.status === "paused").length}</p>
              <p className="text-xs text-muted-foreground">Pausadas</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{rules.filter(r => r.action === "pause_campaign").length}</p>
              <p className="text-xs text-muted-foreground">Auto-pause</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-sm">{r.rule_name}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {r.metric?.toUpperCase()} {r.condition_operator} {r.condition_value}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.action === "pause_campaign" ? "destructive" : "outline"} className="text-[10px]">
                          {r.action === "pause_campaign" ? "Pausar" : r.action === "reduce_budget" ? "Reduzir Budget" : r.action === "mark_creative_weak" ? "Marcar Fraco" : "Alerta"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.campaigns?.campaign_name || "Todas"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {r.status === "active" ? "Ativa" : "Pausada"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleRule(r.id, r.status)}>
                            {r.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rules.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma regra configurada</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── BUDGETS ── */}
      {!loading && subTab === "budgets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{fmtMoney(budgetSummary.reduce((s, b) => s + b.totalSpend, 0))}</p>
              <p className="text-xs text-muted-foreground">Spend Total</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{fmtMoney(budgetSummary.reduce((s, b) => s + b.avgDaily, 0))}</p>
              <p className="text-xs text-muted-foreground">Média Diária</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{budgetSummary.length}</p>
              <p className="text-xs text-muted-foreground">Campanhas com custos</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Controle de Budget por Campanha</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Spend Total</TableHead>
                    <TableHead>Média/Dia</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Último Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgetSummary.map(b => (
                    <TableRow key={b.campaign_id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{fmtMoney(b.totalSpend)}</TableCell>
                      <TableCell>{fmtMoney(b.avgDaily)}</TableCell>
                      <TableCell>{b.days}</TableCell>
                      <TableCell className="text-xs">{b.lastDate}</TableCell>
                    </TableRow>
                  ))}
                  {!budgetSummary.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum dado de custo registrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {/* Daily spend breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Gasto por Dia</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">Controle diário de quanto foi gasto em cada dia</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Spend do Dia</TableHead>
                    <TableHead className="text-right">Campanhas Ativas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySpend.map(d => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmtMoney(d.totalSpend)}</TableCell>
                      <TableCell className="text-right text-xs">{d.campaigns}</TableCell>
                    </TableRow>
                  ))}
                  {!dailySpend.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum dado</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
