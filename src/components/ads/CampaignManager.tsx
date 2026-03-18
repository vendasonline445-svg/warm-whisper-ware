import { useState, useEffect } from "react";
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
  RefreshCw, Play, Pause, Copy, Loader2, DollarSign, AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

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
  advertiser_id?: string; // track which account owns this campaign
}

export default function CampaignManager() {
  const [bcs, setBcs] = useState<any[]>([]);
  const [selectedBc, setSelectedBc] = useState<string>("");
  const [campaigns, setCampaigns] = useState<TikTokCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Duplicate dialog
  const [dupDialog, setDupDialog] = useState<TikTokCampaign | null>(null);
  const [dupName, setDupName] = useState("");
  const [dupBudget, setDupBudget] = useState("");

  // Budget edit dialog
  const [budgetDialog, setBudgetDialog] = useState<TikTokCampaign | null>(null);
  const [newBudget, setNewBudget] = useState("");

  useEffect(() => {
    loadBCs();
  }, []);

  const loadBCs = async () => {
    const { data } = await db
      .from("business_centers")
      .select("*")
      .eq("platform", "tiktok")
      .not("access_token", "is", null)
      .not("advertiser_id", "is", null);
    setBcs(data || []);
    if (data?.length === 1) {
      setSelectedBc(data[0].id);
    }
  };

  const fetchCampaigns = async () => {
    const bc = bcs.find((b) => b.id === selectedBc);
    if (!bc) return;

    const advertiserIds = (bc.advertiser_id || "").split(",").filter(Boolean);
    if (!advertiserIds.length) {
      toast({ title: "Nenhuma conta de anúncio selecionada", variant: "destructive" });
      return;
    }

    setLoading(true);
    setCampaigns([]);
    try {
      // Single edge function call handles all advertiser IDs server-side
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "get_campaign_details", advertiser_ids: advertiserIds },
      });
      if (error) throw error;
      setCampaigns(data.campaigns || []);
      toast({ 
        title: `${data.campaigns?.length || 0} campanhas de ${data.accounts || advertiserIds.length} contas`,
        description: data.errors > 0 ? `${data.errors} contas com erro (ignoradas)` : undefined,
      });
    } catch (err: any) {
      toast({ title: "Erro ao buscar campanhas", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedBc) fetchCampaigns();
  }, [selectedBc]);

  const toggleStatus = async (camp: TikTokCampaign) => {
    const bc = bcs.find((b) => b.id === selectedBc);
    if (!bc) return;

    const newStatus = camp.operation_status === "ENABLE" ? "DISABLE" : "ENABLE";
    setActionLoading(camp.campaign_id + "_status");

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: {
          bc_id: bc.id,
          action: "update_status",
          advertiser_id: camp.advertiser_id,
          campaign_ids: [camp.campaign_id],
          operation_status: newStatus,
        },
      });
      if (error) throw error;
      toast({ title: `✅ Campanha ${newStatus === "ENABLE" ? "ativada" : "pausada"}` });
      // Update local state
      setCampaigns(prev => prev.map(c =>
        c.campaign_id === camp.campaign_id ? { ...c, operation_status: newStatus } : c
      ));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const updateBudget = async () => {
    if (!budgetDialog || !newBudget) return;
    const bc = bcs.find((b) => b.id === selectedBc);
    if (!bc) return;

    setActionLoading(budgetDialog.campaign_id + "_budget");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: {
          bc_id: bc.id,
          action: "update_budget",
          advertiser_id: budgetDialog.advertiser_id,
          campaign_id: budgetDialog.campaign_id,
          budget: parseFloat(newBudget),
        },
      });
      if (error) throw error;
      toast({ title: "✅ Orçamento atualizado" });
      setBudgetDialog(null);
      setNewBudget("");
      setCampaigns(prev => prev.map(c =>
        c.campaign_id === budgetDialog.campaign_id ? { ...c, budget: parseFloat(newBudget) } : c
      ));
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setActionLoading(null);
  };

  const duplicateCampaign = async () => {
    if (!dupDialog) return;
    const bc = bcs.find((b) => b.id === selectedBc);
    if (!bc) return;

    setActionLoading(dupDialog.campaign_id + "_dup");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: {
          bc_id: bc.id,
          action: "duplicate_campaign",
          advertiser_id: dupDialog.advertiser_id,
          campaign_id: dupDialog.campaign_id,
          new_name: dupName || undefined,
          new_budget: dupBudget ? parseFloat(dupBudget) : undefined,
        },
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
                {bcs.map((bc) => (
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

            {/* Status filter */}
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

          {/* Campaigns Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Nome</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Orçamento</TableHead>
                      <TableHead className="text-xs">Objetivo</TableHead>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((camp) => (
                      <TableRow key={camp.campaign_id}>
                        <TableCell className="font-medium text-xs max-w-[200px] truncate">{camp.campaign_name}</TableCell>
                        <TableCell>{statusBadge(camp.operation_status)}</TableCell>
                        <TableCell className="text-xs">
                          {camp.budget > 0 ? `R$ ${camp.budget.toFixed(2)}` : <span className="text-muted-foreground">Dinâmico</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px]">{camp.objective_type?.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">{camp.campaign_id}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0"
                              disabled={!!actionLoading}
                              onClick={() => toggleStatus(camp)}
                              title={camp.operation_status === "ENABLE" ? "Pausar" : "Ativar"}
                            >
                              {actionLoading === camp.campaign_id + "_status" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : camp.operation_status === "ENABLE" ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0"
                              disabled={!!actionLoading}
                              onClick={() => { setBudgetDialog(camp); setNewBudget(camp.budget > 0 ? String(camp.budget) : ""); }}
                              title="Editar orçamento"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-7 w-7 p-0"
                              disabled={!!actionLoading}
                              onClick={() => { setDupDialog(camp); setDupName(`Copy of ${camp.campaign_name}`); setDupBudget(camp.budget > 0 ? String(camp.budget) : ""); }}
                              title="Duplicar campanha"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!loading && !campaigns.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                          {selectedBc ? "Nenhuma campanha encontrada. Clique em Atualizar." : "Selecione um Business Center."}
                        </TableCell>
                      </TableRow>
                    )}
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Buscando campanhas de todas as contas...</p>
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
          <DialogHeader>
            <DialogTitle className="text-sm">Editar Orçamento</DialogTitle>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle className="text-sm">Duplicar Campanha</DialogTitle>
          </DialogHeader>
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
