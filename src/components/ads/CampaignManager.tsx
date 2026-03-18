import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  RefreshCw, Play, Pause, Copy, Loader2, DollarSign, AlertTriangle,
  TrendingUp, TrendingDown, BarChart3, ShoppingCart, Eye
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
const SELECTED_BC_STORAGE_KEY = "campaign_manager_selected_bc";
const CAMPAIGN_CACHE_TTL_MS = 10 * 60 * 1000;

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  operation_status: string;
  secondary_status: string;
  budget: number;
  budget_mode: string;
  objective_type: string;
  create_time: string;
  modify_time: string;
  advertiser_id?: string;
}

interface CampaignMetrics {
  spend: number; // centavos
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  revenue: number; // centavos
  sales: number;
  roas: number;
  cpa: number;
}

interface CampaignCachePayload {
  campaigns: TikTokCampaign[];
  updatedAt: number;
}

const fmtMoney = (cents: number) => {
  if (cents === 0) return "R$ 0";
  return `R$ ${(cents / 100).toFixed(2)}`;
};

const fmtMoneyShort = (cents: number) => {
  if (cents === 0) return "R$ 0";
  if (cents >= 100000) return `R$ ${(cents / 100000).toFixed(1)}k`;
  return `R$ ${(cents / 100).toFixed(2)}`;
};

export default function CampaignManager() {
  const [bcs, setBcs] = useState<any[]>([]);
  const [selectedBc, setSelectedBc] = useState<string>("");
  const [campaigns, setCampaigns] = useState<TikTokCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [metricsMap, setMetricsMap] = useState<Record<string, CampaignMetrics>>({});

  // Duplicate dialog
  const [dupDialog, setDupDialog] = useState<TikTokCampaign | null>(null);
  const [dupName, setDupName] = useState("");
  const [dupBudget, setDupBudget] = useState("");

  // Budget edit dialog
  const [budgetDialog, setBudgetDialog] = useState<TikTokCampaign | null>(null);
  const [newBudget, setNewBudget] = useState("");

  const getCacheKey = (bcId: string) => `campaign_manager_cache_${bcId}`;

  const loadCampaignsFromCache = (bcId: string): boolean => {
    try {
      const raw = localStorage.getItem(getCacheKey(bcId));
      if (!raw) return false;
      const parsed = JSON.parse(raw) as CampaignCachePayload;
      if (!parsed?.updatedAt || !Array.isArray(parsed?.campaigns)) {
        localStorage.removeItem(getCacheKey(bcId));
        return false;
      }
      if (Date.now() - parsed.updatedAt > CAMPAIGN_CACHE_TTL_MS) {
        localStorage.removeItem(getCacheKey(bcId));
        return false;
      }
      setCampaigns(parsed.campaigns);
      return true;
    } catch {
      localStorage.removeItem(getCacheKey(bcId));
      return false;
    }
  };

  const saveCampaignsToCache = (bcId: string, data: TikTokCampaign[]) => {
    const payload: CampaignCachePayload = { campaigns: data, updatedAt: Date.now() };
    localStorage.setItem(getCacheKey(bcId), JSON.stringify(payload));
  };

  useEffect(() => { loadBCs(); }, []);

  const loadBCs = async () => {
    const { data } = await db
      .from("business_centers")
      .select("*")
      .eq("platform", "tiktok")
      .not("access_token", "is", null)
      .not("advertiser_id", "is", null);
    const allBcs = data || [];
    setBcs(allBcs);
    const savedBcId = localStorage.getItem(SELECTED_BC_STORAGE_KEY);
    if (savedBcId && allBcs.some((bc: any) => bc.id === savedBcId)) {
      setSelectedBc(savedBcId);
      return;
    }
    if (allBcs.length === 1) setSelectedBc(allBcs[0].id);
  };

  // ── Fetch performance metrics from DB ──
  const fetchMetrics = async (campaignList: TikTokCampaign[]) => {
    if (!campaignList.length) return;
    setLoadingMetrics(true);

    try {
      const externalIds = campaignList.map(c => c.campaign_id);

      // 1. Get matching campaigns from DB (maps external_id → internal id)
      const { data: dbCampaigns } = await db
        .from("campaigns")
        .select("id, campaign_external_id")
        .in("campaign_external_id", externalIds);

      const extToInternal: Record<string, string> = {};
      (dbCampaigns || []).forEach((c: any) => {
        if (c.campaign_external_id) extToInternal[c.campaign_external_id] = c.id;
      });

      const internalIds = Object.values(extToInternal);
      if (!internalIds.length) {
        setLoadingMetrics(false);
        return;
      }

      // 2. Fetch costs and attributions in parallel
      const [costsRes, attribRes] = await Promise.all([
        db.from("campaign_costs").select("campaign_id, spend, impressions, clicks, cpc, ctr").in("campaign_id", internalIds),
        db.from("attributions").select("campaign_id, revenue, event_type").in("campaign_id", internalIds),
      ]);

      // 3. Aggregate costs per campaign
      const costsAgg: Record<string, { spend: number; impressions: number; clicks: number }> = {};
      (costsRes.data || []).forEach((c: any) => {
        if (!costsAgg[c.campaign_id]) costsAgg[c.campaign_id] = { spend: 0, impressions: 0, clicks: 0 };
        costsAgg[c.campaign_id].spend += c.spend || 0;
        costsAgg[c.campaign_id].impressions += c.impressions || 0;
        costsAgg[c.campaign_id].clicks += c.clicks || 0;
      });

      // 4. Aggregate attributions per campaign
      const attribAgg: Record<string, { revenue: number; sales: number }> = {};
      (attribRes.data || []).forEach((a: any) => {
        if (!attribAgg[a.campaign_id]) attribAgg[a.campaign_id] = { revenue: 0, sales: 0 };
        attribAgg[a.campaign_id].revenue += a.revenue || 0;
        attribAgg[a.campaign_id].sales += 1;
      });

      // 5. Build metrics map keyed by external campaign_id
      const newMetrics: Record<string, CampaignMetrics> = {};
      for (const [extId, intId] of Object.entries(extToInternal)) {
        const costs = costsAgg[intId] || { spend: 0, impressions: 0, clicks: 0 };
        const attr = attribAgg[intId] || { revenue: 0, sales: 0 };
        const roas = costs.spend > 0 ? (attr.revenue / costs.spend) : 0;
        const cpa = attr.sales > 0 ? (costs.spend / attr.sales) : 0;
        const cpc = costs.clicks > 0 ? (costs.spend / costs.clicks) : 0;
        const ctr = costs.impressions > 0 ? ((costs.clicks / costs.impressions) * 100) : 0;

        newMetrics[extId] = {
          spend: costs.spend,
          impressions: costs.impressions,
          clicks: costs.clicks,
          cpc,
          ctr,
          revenue: attr.revenue,
          sales: attr.sales,
          roas,
          cpa,
        };
      }

      setMetricsMap(newMetrics);
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
    setLoadingMetrics(false);
  };

  // Fetch metrics when campaigns change
  useEffect(() => {
    if (campaigns.length > 0) fetchMetrics(campaigns);
  }, [campaigns]);

  const fetchCampaigns = async () => {
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    const advertiserIds = (bc.advertiser_id || "").split(",").filter(Boolean);
    if (!advertiserIds.length) {
      toast({ title: "Nenhuma conta de anúncio selecionada", variant: "destructive" });
      return;
    }

    setLoading(true);
    setCampaigns([]);
    setMetricsMap({});
    setProgress({ loaded: 0, total: advertiserIds.length });

    const batchSize = 15;
    let allCampaigns: TikTokCampaign[] = [];
    let totalErrors = 0;

    for (let i = 0; i < advertiserIds.length; i += batchSize) {
      const batch = advertiserIds.slice(i, i + batchSize);
      try {
        const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
          body: { bc_id: bc.id, action: "get_campaign_details", advertiser_ids: batch },
        });
        if (error) throw error;
        const newCamps = data.campaigns || [];
        totalErrors += data.errors || 0;
        allCampaigns = [...allCampaigns, ...newCamps];
        setCampaigns([...allCampaigns]);
      } catch {
        totalErrors += batch.length;
      }
      setProgress({ loaded: Math.min(i + batchSize, advertiserIds.length), total: advertiserIds.length });
    }

    saveCampaignsToCache(bc.id, allCampaigns);
    toast({
      title: `${allCampaigns.length} campanhas de ${advertiserIds.length} contas`,
      description: totalErrors > 0 ? `${totalErrors} contas com erro (ignoradas)` : undefined,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedBc) { setCampaigns([]); setMetricsMap({}); return; }
    localStorage.setItem(SELECTED_BC_STORAGE_KEY, selectedBc);
    const hasCache = loadCampaignsFromCache(selectedBc);
    if (!hasCache) setCampaigns([]);
  }, [selectedBc]);

  // ── Actions ──
  const toggleStatus = async (camp: TikTokCampaign) => {
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    const newStatus = camp.operation_status === "ENABLE" ? "DISABLE" : "ENABLE";
    setActionLoading(camp.campaign_id + "_status");
    try {
      const { error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "update_status", advertiser_id: camp.advertiser_id, campaign_ids: [camp.campaign_id], operation_status: newStatus },
      });
      if (error) throw error;
      toast({ title: `✅ Campanha ${newStatus === "ENABLE" ? "ativada" : "pausada"}` });
      setCampaigns(prev => prev.map(c => c.campaign_id === camp.campaign_id ? { ...c, operation_status: newStatus } : c));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const updateBudget = async () => {
    if (!budgetDialog || !newBudget) return;
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    setActionLoading(budgetDialog.campaign_id + "_budget");
    try {
      const { error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "update_budget", advertiser_id: budgetDialog.advertiser_id, campaign_id: budgetDialog.campaign_id, budget: parseFloat(newBudget) },
      });
      if (error) throw error;
      toast({ title: "✅ Orçamento atualizado" });
      setBudgetDialog(null);
      setNewBudget("");
      setCampaigns(prev => prev.map(c => c.campaign_id === budgetDialog.campaign_id ? { ...c, budget: parseFloat(newBudget) } : c));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const duplicateCampaign = async () => {
    if (!dupDialog) return;
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    setActionLoading(dupDialog.campaign_id + "_dup");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "duplicate_campaign", advertiser_id: dupDialog.advertiser_id, campaign_id: dupDialog.campaign_id, new_name: dupName || undefined, new_budget: dupBudget ? parseFloat(dupBudget) : undefined },
      });
      if (error) throw error;
      toast({ title: `✅ Campanha duplicada! ID: ${data.new_campaign_id}` });
      setDupDialog(null);
      setDupName("");
      setDupBudget("");
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: "Erro ao duplicar", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const statusBadge = (status: string) => {
    if (status === "ENABLE") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]"><Play className="h-2.5 w-2.5 mr-0.5" />Ativo</Badge>;
    if (status === "DISABLE") return <Badge className="bg-muted text-muted-foreground text-[10px]"><Pause className="h-2.5 w-2.5 mr-0.5" />Pausado</Badge>;
    return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  };

  const filteredCampaigns = statusFilter === "all"
    ? campaigns
    : campaigns.filter(c => c.operation_status === statusFilter);

  const activeCampaigns = campaigns.filter(c => c.operation_status === "ENABLE").length;
  const pausedCampaigns = campaigns.filter(c => c.operation_status === "DISABLE").length;

  // ── Totals for summary cards ──
  const totals = useMemo(() => {
    let spend = 0, revenue = 0, sales = 0, clicks = 0, impressions = 0;
    Object.values(metricsMap).forEach(m => {
      spend += m.spend;
      revenue += m.revenue;
      sales += m.sales;
      clicks += m.clicks;
      impressions += m.impressions;
    });
    const roas = spend > 0 ? (revenue / spend) : 0;
    const cpa = sales > 0 ? (spend / sales) : 0;
    return { spend, revenue, sales, clicks, impressions, roas, cpa };
  }, [metricsMap]);

  const colSpanTotal = 11;

  return (
    <div className="space-y-4">
      {bcs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">Conecte um Business Center com token OAuth e selecione contas de anúncio para gerenciar campanhas.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedBc} onValueChange={setSelectedBc}>
              <SelectTrigger className="w-72 h-8 text-xs">
                <SelectValue placeholder="Selecione o Business Center" />
              </SelectTrigger>
              <SelectContent>
                {bcs.map((bc: any) => (
                  <SelectItem key={bc.id} value={bc.id} className="text-xs">
                    {bc.bc_name} ({(bc.advertiser_id || "").split(",").filter(Boolean).length} contas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={fetchCampaigns} disabled={loading || !selectedBc}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Atualizar
            </Button>

            {campaigns.length > 0 && (
              <div className="flex gap-1 ml-auto">
                <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setStatusFilter("all")}>
                  Todas ({campaigns.length})
                </Button>
                <Button size="sm" variant={statusFilter === "ENABLE" ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setStatusFilter("ENABLE")}>
                  Ativas ({activeCampaigns})
                </Button>
                <Button size="sm" variant={statusFilter === "DISABLE" ? "default" : "outline"} className="h-7 text-[10px]" onClick={() => setStatusFilter("DISABLE")}>
                  Pausadas ({pausedCampaigns})
                </Button>
              </div>
            )}
          </div>

          {/* ── Summary Cards ── */}
          {Object.keys(metricsMap).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <Card className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-sm font-bold text-foreground">{fmtMoneyShort(totals.spend)}</p>
                <p className="text-[10px] text-muted-foreground">Spend Total</p>
              </Card>
              <Card className="p-3 text-center">
                <ShoppingCart className="h-4 w-4 mx-auto text-emerald-500 mb-0.5" />
                <p className="text-sm font-bold text-foreground">{totals.sales}</p>
                <p className="text-[10px] text-muted-foreground">Vendas</p>
              </Card>
              <Card className="p-3 text-center">
                <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-0.5" />
                <p className="text-sm font-bold text-foreground">{fmtMoneyShort(totals.revenue)}</p>
                <p className="text-[10px] text-muted-foreground">Revenue</p>
              </Card>
              <Card className="p-3 text-center">
                <BarChart3 className="h-4 w-4 mx-auto mb-0.5" style={{ color: totals.roas >= 1 ? "var(--emerald-500, #10b981)" : "var(--destructive)" }} />
                <p className={`text-sm font-bold ${totals.roas >= 1 ? "text-emerald-500" : "text-destructive"}`}>{totals.roas.toFixed(2)}x</p>
                <p className="text-[10px] text-muted-foreground">ROAS</p>
              </Card>
              <Card className="p-3 text-center">
                <DollarSign className="h-4 w-4 mx-auto text-amber-500 mb-0.5" />
                <p className="text-sm font-bold text-foreground">{fmtMoneyShort(totals.cpa)}</p>
                <p className="text-[10px] text-muted-foreground">CPA</p>
              </Card>
              <Card className="p-3 text-center">
                <Eye className="h-4 w-4 mx-auto text-muted-foreground mb-0.5" />
                <p className="text-sm font-bold text-foreground">{totals.clicks.toLocaleString("pt-BR")}</p>
                <p className="text-[10px] text-muted-foreground">Clicks</p>
              </Card>
            </div>
          )}

          {/* ── Campaigns Table ── */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Orçamento</TableHead>
                      <TableHead className="text-xs text-right">Spend</TableHead>
                      <TableHead className="text-xs text-right">Vendas</TableHead>
                      <TableHead className="text-xs text-right">Revenue</TableHead>
                      <TableHead className="text-xs text-right">ROAS</TableHead>
                      <TableHead className="text-xs text-right">CPA</TableHead>
                      <TableHead className="text-xs text-right">Clicks</TableHead>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((camp) => {
                      const m = metricsMap[camp.campaign_id];
                      return (
                        <TableRow key={camp.campaign_id}>
                          <TableCell className="font-medium text-xs max-w-[200px] truncate">{camp.campaign_name}</TableCell>
                          <TableCell>{statusBadge(camp.operation_status)}</TableCell>
                          <TableCell className="text-xs">
                            {camp.budget > 0 ? `R$ ${camp.budget.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {m ? fmtMoney(m.spend) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {m ? (
                              <span className={m.sales > 0 ? "text-emerald-500 font-semibold" : "text-muted-foreground"}>
                                {m.sales}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {m ? (
                              <span className={m.revenue > 0 ? "text-emerald-500" : "text-muted-foreground"}>
                                {fmtMoney(m.revenue)}
                              </span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {m ? (
                              <Badge className={`text-[10px] ${m.roas >= 2 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : m.roas >= 1 ? "bg-amber-500/15 text-amber-600 border-amber-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>
                                {m.roas.toFixed(2)}x
                              </Badge>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {m && m.cpa > 0 ? fmtMoney(m.cpa) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {m ? m.clicks.toLocaleString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell className="text-[10px] font-mono text-muted-foreground">{camp.campaign_id}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!!actionLoading} onClick={() => toggleStatus(camp)}
                                title={camp.operation_status === "ENABLE" ? "Pausar" : "Ativar"}>
                                {actionLoading === camp.campaign_id + "_status" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : camp.operation_status === "ENABLE" ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 text-emerald-500" />
                                )}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!!actionLoading}
                                onClick={() => { setBudgetDialog(camp); setNewBudget(camp.budget > 0 ? String(camp.budget) : ""); }}
                                title="Editar orçamento">
                                <DollarSign className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!!actionLoading}
                                onClick={() => { setDupDialog(camp); setDupName(`Copy of ${camp.campaign_name}`); setDupBudget(camp.budget > 0 ? String(camp.budget) : ""); }}
                                title="Duplicar campanha">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!loading && !campaigns.length && (
                      <TableRow>
                        <TableCell colSpan={colSpanTotal} className="text-center text-muted-foreground text-sm py-8">
                          {selectedBc ? "Nenhuma campanha encontrada. Clique em Atualizar." : "Selecione um Business Center."}
                        </TableCell>
                      </TableRow>
                    )}
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={colSpanTotal} className="text-center py-8">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <div className="w-48">
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-300"
                                  style={{ width: `${progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1.5">
                                {progress.loaded}/{progress.total} contas • {campaigns.length} campanhas encontradas
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && loadingMetrics && campaigns.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={colSpanTotal} className="text-center py-2">
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Carregando métricas de performance...
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Budget Edit Dialog */}
      <Dialog open={!!budgetDialog} onOpenChange={(open) => !open && setBudgetDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Editar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground truncate">{budgetDialog?.campaign_name}</p>
            <div>
              <Label className="text-xs">Novo Orçamento (R$)</Label>
              <Input type="number" step="0.01" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} placeholder="Ex: 50.00" />
            </div>
            <Button onClick={updateBudget} className="w-full" disabled={!newBudget || !!actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Orçamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={!!dupDialog} onOpenChange={(open) => !open && setDupDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">Duplicar Campanha</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground truncate">Original: {dupDialog?.campaign_name}</p>
            <div>
              <Label className="text-xs">Nome da nova campanha</Label>
              <Input value={dupName} onChange={(e) => setDupName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Orçamento (R$) — opcional</Label>
              <Input type="number" step="0.01" value={dupBudget} onChange={(e) => setDupBudget(e.target.value)} placeholder="Manter original" />
            </div>
            <Button onClick={duplicateCampaign} className="w-full" disabled={!!actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Duplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
