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
  TrendingUp, TrendingDown, BarChart3, ShoppingCart, Eye, Layers, ChevronDown, ChevronRight
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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

interface AdGroupInfo {
  adgroup_id: string;
  adgroup_name: string;
  operation_status: string;
  budget: number;
  budget_mode: string;
  ads: AdInfo[];
}

interface AdInfo {
  ad_id: string;
  ad_name: string;
  operation_status: string;
  secondary_status: string;
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
  roi: number;
  cpa: number;
}

type CampaignSortBy = "updated" | "name" | "spend" | "sales" | "revenue" | "roas" | "roi" | "clicks";
type SortDirection = "asc" | "desc";

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
  const [sortBy, setSortBy] = useState<CampaignSortBy>("spend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [metricsMap, setMetricsMap] = useState<Record<string, CampaignMetrics>>({});

  // Duplicate dialog
  const [dupDialog, setDupDialog] = useState<TikTokCampaign | null>(null);
  const [dupName, setDupName] = useState("");
  const [dupBudget, setDupBudget] = useState("");

  // Budget edit dialog
  const [budgetDialog, setBudgetDialog] = useState<TikTokCampaign | null>(null);
  const [newBudget, setNewBudget] = useState("");

  // Bulk duplicate dialog
  const [bulkDupDialog, setBulkDupDialog] = useState<TikTokCampaign | null>(null);
  const [bulkDupName, setBulkDupName] = useState("");
  const [bulkDupBudget, setBulkDupBudget] = useState("");
  const [bulkAccounts, setBulkAccounts] = useState<Array<{ advertiser_id: string; advertiser_name: string; status: string }>>([]);
  const [bulkSelectedAccounts, setBulkSelectedAccounts] = useState<string[]>([]);
  const [bulkLoadingAccounts, setBulkLoadingAccounts] = useState(false);
  const [bulkDuplicating, setBulkDuplicating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkCopies, setBulkCopies] = useState(1);

  // Hierarchy expansion
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [hierarchyData, setHierarchyData] = useState<Record<string, AdGroupInfo[]>>({});
  const [loadingHierarchy, setLoadingHierarchy] = useState<string | null>(null);

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
    if (!campaignList.length) {
      setMetricsMap({});
      return;
    }

    setLoadingMetrics(true);

    try {
      const externalIds = campaignList.map(c => String(c.campaign_id));
      const campaignNames = new Set(campaignList.map(c => String(c.campaign_name || "").trim()).filter(Boolean));

      // 1) Map external campaign_id -> internal campaign row
      const { data: dbCampaigns } = await db
        .from("campaigns")
        .select("id, campaign_external_id, campaign_name")
        .in("campaign_external_id", externalIds);

      const extToInternal: Record<string, string> = {};
      const extToName: Record<string, string> = {};
      (dbCampaigns || []).forEach((c: any) => {
        const extId = String(c.campaign_external_id || "");
        if (!extId) return;
        extToInternal[extId] = c.id;
        extToName[extId] = String(c.campaign_name || "").trim();
      });

      const internalIds = Object.values(extToInternal);
      if (!internalIds.length) {
        setMetricsMap({});
        return;
      }

      const thirtyDaysAgoDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86400000).toISOString();

      // 2) Read spend + sales sources in parallel
      const [costsRes, attribRes, purchaseRes] = await Promise.all([
        db
          .from("campaign_costs")
          .select("campaign_id, spend, impressions, clicks")
          .in("campaign_id", internalIds)
          .gte("date", thirtyDaysAgoDate),
        db
          .from("attributions")
          .select("campaign_id, revenue, event_type")
          .in("campaign_id", internalIds)
          .gte("created_at", thirtyDaysAgoIso),
        db
          .from("events")
          .select("id, campaign, value, event_data")
          .eq("event_name", "purchase")
          .gte("created_at", thirtyDaysAgoIso)
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      // 3) Aggregate costs per internal campaign_id
      const costsAgg: Record<string, { spend: number; impressions: number; clicks: number }> = {};
      (costsRes.data || []).forEach((c: any) => {
        if (!costsAgg[c.campaign_id]) costsAgg[c.campaign_id] = { spend: 0, impressions: 0, clicks: 0 };
        costsAgg[c.campaign_id].spend += Number(c.spend || 0);
        costsAgg[c.campaign_id].impressions += Number(c.impressions || 0);
        costsAgg[c.campaign_id].clicks += Number(c.clicks || 0);
      });

      // 4) Primary source for sales/revenue: attributions
      const attribAgg: Record<string, { revenue: number; sales: number }> = {};
      (attribRes.data || []).forEach((a: any) => {
        if (!a?.campaign_id) return;
        if (!attribAgg[a.campaign_id]) attribAgg[a.campaign_id] = { revenue: 0, sales: 0 };
        attribAgg[a.campaign_id].revenue += Number(a.revenue || 0);
        attribAgg[a.campaign_id].sales += 1;
      });

      // 5) Fallback source when attributions are empty: purchase events (dedupe by transaction_id)
      const fallbackByCampaignName: Record<string, { revenue: number; sales: number }> = {};
      const dedupByCampaignAndTx: Record<string, Record<string, number>> = {};

      (purchaseRes.data || []).forEach((event: any) => {
        const payload = (event?.event_data && typeof event.event_data === "object") ? event.event_data : {};
        const campaignName = String(event?.campaign || payload?.utm_campaign || "").trim();
        if (!campaignName || !campaignNames.has(campaignName)) return;

        const txId = String(payload?.transaction_id || event?.id || "").trim();
        if (!txId) return;

        const value = Number(event?.value || 0);
        if (!Number.isFinite(value) || value <= 0) return;

        if (!dedupByCampaignAndTx[campaignName]) dedupByCampaignAndTx[campaignName] = {};
        dedupByCampaignAndTx[campaignName][txId] = Math.max(dedupByCampaignAndTx[campaignName][txId] || 0, value);
      });

      Object.entries(dedupByCampaignAndTx).forEach(([campaignName, txValues]) => {
        const values = Object.values(txValues);
        fallbackByCampaignName[campaignName] = {
          sales: values.length,
          revenue: values.reduce((sum, value) => sum + value, 0),
        };
      });

      // 6) Build metrics map keyed by external campaign_id
      const newMetrics: Record<string, CampaignMetrics> = {};
      for (const [extId, intId] of Object.entries(extToInternal)) {
        const costs = costsAgg[intId] || { spend: 0, impressions: 0, clicks: 0 };
        const attr = attribAgg[intId] || { revenue: 0, sales: 0 };
        const fallback = fallbackByCampaignName[extToName[extId] || ""] || { revenue: 0, sales: 0 };

        const revenue = attr.sales > 0 || attr.revenue > 0 ? attr.revenue : fallback.revenue;
        const sales = attr.sales > 0 || attr.revenue > 0 ? attr.sales : fallback.sales;

        const roas = costs.spend > 0 ? (revenue / costs.spend) : 0;
        const roi = costs.spend > 0 ? (((revenue - costs.spend) / costs.spend) * 100) : 0;
        const cpa = sales > 0 ? (costs.spend / sales) : 0;
        const cpc = costs.clicks > 0 ? (costs.spend / costs.clicks) : 0;
        const ctr = costs.impressions > 0 ? ((costs.clicks / costs.impressions) * 100) : 0;

        newMetrics[extId] = {
          spend: costs.spend,
          impressions: costs.impressions,
          clicks: costs.clicks,
          cpc,
          ctr,
          revenue,
          sales,
          roas,
          roi,
          cpa,
        };
      }

      setMetricsMap(newMetrics);
    } catch (err) {
      console.error("Error fetching metrics:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fetch metrics when campaigns change
  useEffect(() => {
    if (campaigns.length > 0) fetchMetrics(campaigns);
  }, [campaigns]);

  const fetchCampaigns = async () => {
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    const allAdvertiserIds = (bc.advertiser_id || "").split(",").filter(Boolean);
    if (!allAdvertiserIds.length) {
      toast({ title: "Nenhuma conta de anúncio selecionada", variant: "destructive" });
      return;
    }

    setLoading(true);
    setCampaigns([]);
    setMetricsMap({});
    setProgress({ loaded: 0, total: 0 });

    // 1. Check account statuses and filter out suspended ones
    let activeAdvertiserIds = allAdvertiserIds;
    let suspendedCount = 0;
    try {
      const { data: advData } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "get_advertisers" },
      });
      const advList = advData?.data?.list || [];
      const suspendedStatuses = ["STATUS_DISABLE", "STATUS_PENDING_CONFIRM", "STATUS_CONFIRM_FAIL", "STATUS_CONFIRM_FAIL_END", "STATUS_LIMIT"];
      const activeSet = new Set(
        advList
          .filter((a: any) => !suspendedStatuses.includes(a.status))
          .map((a: any) => String(a.advertiser_id))
      );
      suspendedCount = allAdvertiserIds.filter(id => !activeSet.has(id)).length;
      activeAdvertiserIds = allAdvertiserIds.filter(id => activeSet.has(id));
    } catch (err) {
      console.warn("Could not check account statuses, syncing all:", err);
    }

    if (!activeAdvertiserIds.length) {
      toast({ title: "Todas as contas estão suspensas", description: `${suspendedCount} contas ignoradas`, variant: "destructive" });
      setLoading(false);
      return;
    }

    setProgress({ loaded: 0, total: activeAdvertiserIds.length });

    const batchSize = 15;
    let allCampaigns: TikTokCampaign[] = [];
    let totalErrors = 0;

    for (let i = 0; i < activeAdvertiserIds.length; i += batchSize) {
      const batch = activeAdvertiserIds.slice(i, i + batchSize);
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
      setProgress({ loaded: Math.min(i + batchSize, activeAdvertiserIds.length), total: activeAdvertiserIds.length });
    }

    saveCampaignsToCache(bc.id, allCampaigns);
    const suspendedMsg = suspendedCount > 0 ? `${suspendedCount} contas suspensas ignoradas. ` : "";

    const advertisersWithCampaigns = Array.from(
      new Set(allCampaigns.map((c) => String(c.advertiser_id || "")).filter(Boolean)),
    );
    const advertisersForSync = advertisersWithCampaigns.length > 0 ? advertisersWithCampaigns : activeAdvertiserIds;

    toast({
      title: `${allCampaigns.length} campanhas de ${activeAdvertiserIds.length} contas ativas`,
      description: suspendedMsg +
        `${advertisersForSync.length} conta(s) com campanha em sincronização de gastos` +
        (totalErrors > 0 ? ` • ${totalErrors} contas com erro` : ""),
    });
    setLoading(false);

    // Auto-sync costs only for accounts that actually returned campaigns (faster + more accurate)
    syncCostsInBackground(bc.id, advertisersForSync, allCampaigns);
  };

  const syncCostsInBackground = async (bcId: string, advertiserIds: string[], campaignList?: TikTokCampaign[]) => {
    try {
      const batchSize = 10;
      for (let i = 0; i < advertiserIds.length; i += batchSize) {
        const batch = advertiserIds.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map((advId) =>
            supabase.functions.invoke("tiktok-sync-campaigns", {
              body: { bc_id: bcId, action: "sync_costs", advertiser_id: advId },
            }),
          ),
        );
      }
      // Re-fetch metrics after costs are synced — use passed list to avoid stale closure
      const list = campaignList || campaigns;
      if (list.length > 0) fetchMetrics(list);
    } catch (err) {
      console.error("Background cost sync error:", err);
    }
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

  // ── Toggle campaign hierarchy expansion ──
  const toggleExpand = async (camp: TikTokCampaign) => {
    const campId = camp.campaign_id;
    if (expandedCampaigns.has(campId)) {
      setExpandedCampaigns(prev => { const next = new Set(prev); next.delete(campId); return next; });
      return;
    }

    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    setLoadingHierarchy(campId);

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "get_campaign_hierarchy", advertiser_id: camp.advertiser_id, campaign_id: campId },
      });
      if (error) throw error;
      setHierarchyData(prev => ({ ...prev, [campId]: data.ad_groups || [] }));
      setExpandedCampaigns(prev => new Set(prev).add(campId));
    } catch (err: any) {
      toast({ title: "Erro ao carregar hierarquia", description: err.message, variant: "destructive" });
    }
    setLoadingHierarchy(null);
  };

  // ── Toggle ad group status ──
  const toggleAdGroupStatus = async (camp: TikTokCampaign, agId: string, currentStatus: string) => {
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    const newStatus = currentStatus === "ENABLE" ? "DISABLE" : "ENABLE";
    setActionLoading(agId + "_status");
    try {
      const { error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "update_adgroup_status", advertiser_id: camp.advertiser_id, adgroup_ids: [agId], operation_status: newStatus },
      });
      if (error) throw error;
      toast({ title: `✅ Conjunto ${newStatus === "ENABLE" ? "ativado" : "pausado"}` });
      setHierarchyData(prev => ({
        ...prev,
        [camp.campaign_id]: (prev[camp.campaign_id] || []).map(ag =>
          ag.adgroup_id === agId ? { ...ag, operation_status: newStatus } : ag
        ),
      }));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  // ── Toggle ad status (per v1.3 /ad/status/update/) ──
  const toggleAdStatus = async (camp: TikTokCampaign, agId: string, adId: string, currentStatus: string) => {
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;
    const newStatus = currentStatus === "ENABLE" ? "DISABLE" : "ENABLE";
    setActionLoading(adId + "_status");
    try {
      const { error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "update_ad_status", advertiser_id: camp.advertiser_id, ad_ids: [adId], operation_status: newStatus },
      });
      if (error) throw error;
      toast({ title: `✅ Anúncio ${newStatus === "ENABLE" ? "ativado" : "pausado"}` });
      setHierarchyData(prev => ({
        ...prev,
        [camp.campaign_id]: (prev[camp.campaign_id] || []).map(ag =>
          ag.adgroup_id === agId
            ? { ...ag, ads: ag.ads.map(ad => ad.ad_id === adId ? { ...ad, operation_status: newStatus } : ad) }
            : ag
        ),
      }));
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
      let description = err?.message || "Falha ao atualizar orçamento";
      if (err?.context && typeof err.context.json === "function") {
        try {
          const payload = await err.context.json();
          description = payload?.error || payload?.message || description;
        } catch {
          // ignore parse errors
        }
      }
      toast({ title: "Erro", description, variant: "destructive" });
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
      const agOk = data.ad_groups_created || 0;
      const adsOk = data.ads_created || 0;
      const agFail = data.ad_groups_failed || 0;
      const adsFail = data.ads_failed || 0;
      toast({ title: `✅ Campanha duplicada!`, description: `Campanha + ${agOk} conjunto(s) + ${adsOk} anúncio(s) criados${agFail + adsFail > 0 ? ` (${agFail + adsFail} falhas)` : ""}` });
      setDupDialog(null);
      setDupName("");
      setDupBudget("");
      fetchCampaigns();
    } catch (err: any) {
      toast({ title: "Erro ao duplicar", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  // ── Bulk duplicate ──
  const openBulkDuplicate = async (camp: TikTokCampaign) => {
    setBulkDupDialog(camp);
    setBulkDupName(camp.campaign_name);
    setBulkDupBudget(camp.budget > 0 ? String(camp.budget) : "");
    setBulkSelectedAccounts([]);
    setBulkAccounts([]);
    setBulkCopies(1);
    setBulkLoadingAccounts(true);

    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) { setBulkLoadingAccounts(false); return; }

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "get_advertisers" },
      });
      if (error) throw error;
      const accounts = (data?.data?.list || []).filter(
        (a: any) => a.advertiser_id !== camp.advertiser_id
      );
      setBulkAccounts(accounts);
    } catch (err: any) {
      toast({ title: "Erro ao carregar contas", description: err.message, variant: "destructive" });
    }
    setBulkLoadingAccounts(false);
  };

  const toggleBulkAccount = (advId: string) => {
    setBulkSelectedAccounts(prev =>
      prev.includes(advId) ? prev.filter(id => id !== advId) : [...prev, advId]
    );
  };

  const selectAllActiveAccounts = () => {
    const activeIds = bulkAccounts
      .filter(a => a.status !== "STATUS_DISABLE" && a.status !== "STATUS_PENDING_CONFIRM" && a.status !== "STATUS_CONFIRM_FAIL")
      .map(a => a.advertiser_id);
    setBulkSelectedAccounts(activeIds);
  };

  const executeBulkDuplicate = async () => {
    if (!bulkDupDialog || !bulkSelectedAccounts.length) return;
    const bc = bcs.find((b: any) => b.id === selectedBc);
    if (!bc) return;

    const totalOps = bulkSelectedAccounts.length * bulkCopies;
    setBulkDuplicating(true);
    setBulkProgress({ done: 0, total: totalOps });

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: {
          bc_id: bc.id,
          action: "bulk_duplicate",
          source_advertiser_id: bulkDupDialog.advertiser_id,
          campaign_id: bulkDupDialog.campaign_id,
          target_advertiser_ids: bulkSelectedAccounts,
          new_name: bulkDupName || undefined,
          new_budget: bulkDupBudget ? parseFloat(bulkDupBudget) : undefined,
          copies: bulkCopies,
        },
      });
      if (error) throw error;

      const succeeded = data?.succeeded || 0;
      const total = data?.total || bulkSelectedAccounts.length;
      const failed = total - succeeded;
      const failedMessages = Array.from(new Set((data?.results || [])
        .filter((r: any) => !r.success && r.error)
        .map((r: any) => String(r.error))))
        .slice(0, 2);

      const totalAg = (data?.results || []).reduce((s: number, r: any) => s + (r.ad_groups_created || 0), 0);
      const totalAds = (data?.results || []).reduce((s: number, r: any) => s + (r.ads_created || 0), 0);
      toast({
        title: `✅ Duplicação em massa concluída`,
        description: `${succeeded}/${total} contas • ${totalAg} conjuntos • ${totalAds} anúncios${failed > 0 ? ` — ${failed} falharam` : ""}${failedMessages.length ? ` (${failedMessages.join(" | ")})` : ""}`,
      });

      setBulkDupDialog(null);
      fetchCampaigns();
    } catch (err: any) {
      let description = err?.message || "Falha na duplicação em massa";
      if (err?.context && typeof err.context.json === "function") {
        try {
          const payload = await err.context.json();
          description = payload?.error || payload?.message || description;
        } catch {
          // ignore parse errors
        }
      }
      toast({ title: "Erro na duplicação em massa", description, variant: "destructive" });
    }
    setBulkDuplicating(false);
  };

  const getAccountStatusLabel = (status: string) => {
    const map: Record<string, { label: string; disabled: boolean }> = {
      STATUS_ENABLE: { label: "Ativa", disabled: false },
      STATUS_DISABLE: { label: "Suspensa", disabled: true },
      STATUS_PENDING_CONFIRM: { label: "Pendente", disabled: true },
      STATUS_CONFIRM_FAIL: { label: "Rejeitada", disabled: true },
      STATUS_CONFIRM_FAIL_END: { label: "Rejeitada", disabled: true },
      STATUS_PENDING_VERIFIED: { label: "Em verificação", disabled: false },
      STATUS_CONFIRM_MODIFY_FAIL: { label: "Modificação rejeitada", disabled: true },
    };
    return map[status] || { label: status.replace("STATUS_", ""), disabled: false };
  };

  const statusBadge = (status: string) => {
    if (status === "ENABLE") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]"><Play className="h-2.5 w-2.5 mr-0.5" />Ativo</Badge>;
    if (status === "DISABLE") return <Badge className="bg-muted text-muted-foreground text-[10px]"><Pause className="h-2.5 w-2.5 mr-0.5" />Pausado</Badge>;
    return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  };

  const filteredCampaigns = useMemo(() => (
    statusFilter === "all"
      ? campaigns
      : campaigns.filter((c) => c.operation_status === statusFilter)
  ), [campaigns, statusFilter]);

  const sortedCampaigns = useMemo(() => {
    const next = [...filteredCampaigns];
    const direction = sortDirection === "asc" ? 1 : -1;

    const byNumber = (a: number, b: number) => (a - b) * direction;
    const byText = (a: string, b: string) => a.localeCompare(b, "pt-BR") * direction;

    next.sort((a, b) => {
      const ma = metricsMap[a.campaign_id];
      const mb = metricsMap[b.campaign_id];

      switch (sortBy) {
        case "name":
          return byText(a.campaign_name || "", b.campaign_name || "");
        case "spend":
          return byNumber(ma?.spend || 0, mb?.spend || 0);
        case "sales":
          return byNumber(ma?.sales || 0, mb?.sales || 0);
        case "revenue":
          return byNumber(ma?.revenue || 0, mb?.revenue || 0);
        case "roas":
          return byNumber(ma?.roas || 0, mb?.roas || 0);
        case "roi":
          return byNumber(ma?.roi || 0, mb?.roi || 0);
        case "clicks":
          return byNumber(ma?.clicks || 0, mb?.clicks || 0);
        case "updated":
        default:
          return byNumber(
            new Date(a.modify_time || a.create_time || 0).getTime(),
            new Date(b.modify_time || b.create_time || 0).getTime(),
          );
      }
    });

    return next;
  }, [filteredCampaigns, metricsMap, sortBy, sortDirection]);

  const activeCampaigns = campaigns.filter((c) => c.operation_status === "ENABLE").length;
  const pausedCampaigns = campaigns.filter((c) => c.operation_status === "DISABLE").length;

  // ── Totals for summary cards ──
  const totals = useMemo(() => {
    let spend = 0, revenue = 0, sales = 0, clicks = 0, impressions = 0;
    Object.values(metricsMap).forEach((m) => {
      spend += m.spend;
      revenue += m.revenue;
      sales += m.sales;
      clicks += m.clicks;
      impressions += m.impressions;
    });
    const roas = spend > 0 ? (revenue / spend) : 0;
    const roi = spend > 0 ? (((revenue - spend) / spend) * 100) : 0;
    const cpa = sales > 0 ? (spend / sales) : 0;
    return { spend, revenue, sales, clicks, impressions, roas, roi, cpa };
  }, [metricsMap]);

  const colSpanTotal = 12;

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
              <>
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
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as CampaignSortBy)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated" className="text-xs">Mais recentes</SelectItem>
                      <SelectItem value="name" className="text-xs">Nome</SelectItem>
                      <SelectItem value="sales" className="text-xs">Vendas</SelectItem>
                      <SelectItem value="spend" className="text-xs">Gastos</SelectItem>
                      <SelectItem value="revenue" className="text-xs">Revenue</SelectItem>
                      <SelectItem value="roas" className="text-xs">ROAS</SelectItem>
                      <SelectItem value="roi" className="text-xs">ROI</SelectItem>
                      <SelectItem value="clicks" className="text-xs">Clicks</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as SortDirection)}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue placeholder="Ordem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc" className="text-xs">Decrescente</SelectItem>
                      <SelectItem value="asc" className="text-xs">Crescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* ── Summary Cards ── */}
          {Object.keys(metricsMap).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
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
                <BarChart3 className="h-4 w-4 mx-auto mb-0.5" />
                <p className={`text-sm font-bold ${totals.roas >= 1 ? "text-emerald-500" : "text-destructive"}`}>{totals.roas.toFixed(2)}x</p>
                <p className="text-[10px] text-muted-foreground">ROAS</p>
              </Card>
              <Card className="p-3 text-center">
                {totals.roi >= 0 ? (
                  <TrendingUp className="h-4 w-4 mx-auto text-emerald-500 mb-0.5" />
                ) : (
                  <TrendingDown className="h-4 w-4 mx-auto text-destructive mb-0.5" />
                )}
                <p className={`text-sm font-bold ${totals.roi >= 0 ? "text-emerald-500" : "text-destructive"}`}>{totals.roi.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">ROI</p>
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
                      <TableHead className="text-xs text-right">ROI</TableHead>
                      <TableHead className="text-xs text-right">CPA</TableHead>
                      <TableHead className="text-xs text-right">Clicks</TableHead>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCampaigns.map((camp) => {
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
                            {m ? (
                              <Badge className={`text-[10px] ${m.roi >= 0 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>
                                {m.roi.toFixed(1)}%
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
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={!!actionLoading}
                                onClick={() => openBulkDuplicate(camp)}
                                title="Duplicar em massa">
                                <Layers className="h-3.5 w-3.5" />
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
      {/* Bulk Duplicate Dialog */}
      <Dialog open={!!bulkDupDialog} onOpenChange={(open) => !open && setBulkDupDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" /> Duplicar em Massa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Campanha original</p>
              <p className="text-sm font-medium truncate">{bulkDupDialog?.campaign_name}</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Conta: {bulkDupDialog?.advertiser_id}</p>
            </div>

            <div>
              <Label className="text-xs">Nome da campanha duplicada</Label>
              <Input value={bulkDupName} onChange={(e) => setBulkDupName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Orçamento (R$) — opcional</Label>
              <Input type="number" step="0.01" value={bulkDupBudget} onChange={(e) => setBulkDupBudget(e.target.value)} placeholder="Manter original" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Quantidade de cópias por conta</Label>
              <Input type="number" min={1} max={50} value={bulkCopies} onChange={(e) => setBulkCopies(Math.max(1, parseInt(e.target.value) || 1))} className="mt-1" />
              {bulkCopies > 1 && bulkSelectedAccounts.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Total: {bulkCopies} × {bulkSelectedAccounts.length} conta(s) = {bulkCopies * bulkSelectedAccounts.length} campanha(s)
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs">Selecione as contas de destino</Label>
                <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={selectAllActiveAccounts} disabled={bulkLoadingAccounts}>
                  Selecionar todas ativas
                </Button>
              </div>

              {bulkLoadingAccounts ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando contas...
                </div>
              ) : bulkAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma outra conta encontrada neste BC.</p>
              ) : (
                <div className="border border-border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
                  {bulkAccounts.map((acc) => {
                    const info = getAccountStatusLabel(acc.status);
                    const isDisabled = info.disabled;
                    const isChecked = bulkSelectedAccounts.includes(acc.advertiser_id);
                    return (
                      <label
                        key={acc.advertiser_id}
                        className={`flex items-center gap-3 px-3 py-2 text-xs transition-colors ${
                          isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={() => !isDisabled && toggleBulkAccount(acc.advertiser_id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{acc.advertiser_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{acc.advertiser_id}</p>
                        </div>
                        <Badge variant={isDisabled ? "destructive" : "outline"} className="text-[9px] shrink-0">
                          {info.label}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              )}
              {bulkSelectedAccounts.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {bulkSelectedAccounts.length} conta(s) selecionada(s)
                </p>
              )}
            </div>

            <Button
              onClick={executeBulkDuplicate}
              className="w-full"
              disabled={!bulkSelectedAccounts.length || bulkDuplicating}
            >
              {bulkDuplicating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Duplicando... {bulkProgress.done}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Duplicar {bulkCopies}× em {bulkSelectedAccounts.length} conta(s) ({bulkCopies * bulkSelectedAccounts.length} total)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
