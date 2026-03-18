import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, ExternalLink, RefreshCw, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2, CheckSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const db = supabase as any;
const TIKTOK_APP_ID = "7617705058569814033";

interface BC {
  id: string;
  bc_name: string;
  bc_external_id: string | null;
  access_token: string | null;
  advertiser_id: string | null;
  token_expires_at: string | null;
  status: string;
  client_id: string;
  created_at: string;
}

interface Advertiser {
  advertiser_id: string;
  advertiser_name: string;
}

export default function TikTokConnect({ onSynced }: { onSynced?: () => void }) {
  const { profile } = useAuth();
  const [bcs, setBcs] = useState<BC[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBc, setNewBc] = useState({ bc_name: "", bc_external_id: "" });
  const [syncing, setSyncing] = useState<string | null>(null);
  const [advertisers, setAdvertisers] = useState<Record<string, Advertiser[]>>({});
  const [loadingAdvs, setLoadingAdvs] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>({});

  useEffect(() => { loadBCs(); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") {
      toast({ title: "✅ TikTok conectado!", description: "Token de acesso recebido com sucesso." });
      window.history.replaceState({}, "", window.location.pathname);
      loadBCs();
    }
  }, []);

  const loadBCs = async () => {
    setLoading(true);
    const { data } = await db.from("business_centers").select("*").order("created_at", { ascending: false });
    setBcs(data || []);
    setLoading(false);
  };

  const getSelectedIds = (bc: BC): string[] => {
    if (!bc.advertiser_id) return [];
    return bc.advertiser_id.split(",").filter(Boolean);
  };

  const addBC = async () => {
    if (!newBc.bc_name) {
      toast({ title: "Preencha o nome", variant: "destructive" });
      return;
    }
    const clientId = profile?.client_id;
    if (!clientId) {
      toast({ title: "Erro: sem client_id no perfil", variant: "destructive" });
      return;
    }

    const { error } = await db.from("business_centers").insert({
      bc_name: newBc.bc_name,
      bc_external_id: newBc.bc_external_id || null,
      client_id: clientId,
      platform: "tiktok",
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Business Center adicionado" });
      setNewBc({ bc_name: "", bc_external_id: "" });
      setShowAdd(false);
      loadBCs();
    }
  };

  const deleteBC = async (id: string) => {
    if (!confirm("Remover este Business Center?")) return;
    await db.from("business_centers").delete().eq("id", id);
    loadBCs();
  };

  const startOAuth = (bc: BC) => {
    const state = btoa(JSON.stringify({ client_id: bc.client_id, bc_id: bc.id }));
    const redirectUri = encodeURIComponent(
      `https://slcuaijctwvmumgtpxgv.supabase.co/functions/v1/tiktok-oauth-callback`
    );
    const oauthUrl = `https://business-api.tiktok.com/portal/auth?app_id=${TIKTOK_APP_ID}&state=${state}&redirect_uri=${redirectUri}`;
    window.open(oauthUrl, "_blank");
  };

  const toggleAdvertiser = async (bcId: string, advId: string) => {
    const bc = bcs.find(b => b.id === bcId);
    if (!bc) return;
    const selected = getSelectedIds(bc);
    const newSelected = selected.includes(advId)
      ? selected.filter(id => id !== advId)
      : [...selected, advId];
    const newValue = newSelected.join(",") || null;
    await db.from("business_centers").update({ advertiser_id: newValue }).eq("id", bcId);
    setBcs(prev => prev.map(b => b.id === bcId ? { ...b, advertiser_id: newValue } : b));
  };

  const selectAllAdvertisers = async (bcId: string) => {
    const advList = advertisers[bcId];
    if (!advList?.length) return;
    const bc = bcs.find(b => b.id === bcId);
    if (!bc) return;
    const currentSelected = getSelectedIds(bc);
    const allIds = advList.map(a => a.advertiser_id);
    const allSelected = allIds.every(id => currentSelected.includes(id));
    
    let newValue: string | null;
    if (allSelected) {
      // Deselect all
      newValue = null;
    } else {
      // Select all (merge with existing)
      const merged = [...new Set([...currentSelected, ...allIds])];
      newValue = merged.join(",");
    }
    await db.from("business_centers").update({ advertiser_id: newValue }).eq("id", bcId);
    setBcs(prev => prev.map(b => b.id === bcId ? { ...b, advertiser_id: newValue } : b));
  };

  const syncCampaigns = async (bc: BC) => {
    const selected = getSelectedIds(bc);
    if (!selected.length) {
      toast({ title: "Selecione pelo menos uma conta", variant: "destructive" });
      return;
    }
    setSyncing(bc.id);
    try {
      let totalSynced = 0;
      for (const advId of selected) {
        const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
          body: { bc_id: bc.id, action: "sync_campaigns", advertiser_id: advId },
        });
        if (error) throw error;
        totalSynced += data.synced || 0;
      }
      toast({ title: `✅ ${totalSynced} campanhas sincronizadas de ${selected.length} contas` });
      onSynced?.();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const syncCosts = async (bc: BC) => {
    const selected = getSelectedIds(bc);
    if (!selected.length) {
      toast({ title: "Selecione pelo menos uma conta", variant: "destructive" });
      return;
    }
    setSyncing(bc.id + "_costs");
    try {
      let totalInserted = 0;
      for (const advId of selected) {
        const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
          body: { bc_id: bc.id, action: "sync_costs", advertiser_id: advId },
        });
        if (error) throw error;
        totalInserted += data.inserted || 0;
      }
      toast({ title: `✅ ${totalInserted} registros de custo sincronizados` });
      onSynced?.();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const fetchAdvertisers = async (bc: BC) => {
    setLoadingAdvs(bc.id);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "get_advertisers" },
      });
      if (error) throw error;
      const list = data?.data?.list || [];
      setAdvertisers(prev => ({ ...prev, [bc.id]: list }));
      if (list.length === 0) {
        toast({ title: "Nenhuma conta de anúncio encontrada", variant: "destructive" });
      } else {
        toast({ title: `${list.length} contas encontradas` });
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar contas", description: err.message, variant: "destructive" });
    }
    setLoadingAdvs(null);
  };

  const isTokenValid = (bc: BC) => {
    if (!bc.access_token) return false;
    if (!bc.token_expires_at) return true;
    return new Date(bc.token_expires_at) > new Date();
  };

  const getFilteredAdvertisers = (bcId: string) => {
    const list = advertisers[bcId] || [];
    const query = (searchQuery[bcId] || "").toLowerCase();
    if (!query) return list;
    return list.filter(a =>
      a.advertiser_name.toLowerCase().includes(query) ||
      a.advertiser_id.includes(query)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Conexão TikTok Ads</h3>
          <p className="text-xs text-muted-foreground">Conecte seu Business Center para sincronizar campanhas e custos</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAdd(true)}>
          <Plus className="h-3 w-3" /> Novo BC
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
      ) : bcs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Link2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum Business Center configurado</p>
            <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bcs.map((bc) => {
            const selectedIds = getSelectedIds(bc);
            const advList = advertisers[bc.id] || [];
            const filteredAdvs = getFilteredAdvertisers(bc.id);
            const allFilteredSelected = filteredAdvs.length > 0 && filteredAdvs.every(a => selectedIds.includes(a.advertiser_id));

            return (
              <Card key={bc.id}>
                <CardContent className="py-4 px-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📱</span>
                      <div>
                        <p className="text-sm font-medium">{bc.bc_name}</p>
                        {bc.bc_external_id && (
                          <p className="text-[10px] text-muted-foreground font-mono">BC: {bc.bc_external_id}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isTokenValid(bc) ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Conectado
                        </Badge>
                      ) : bc.access_token ? (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Token expirado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Não conectado</Badge>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteBC(bc.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Advertiser Account Selection */}
                  {isTokenValid(bc) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Contas Selecionadas:</Label>
                        <Badge variant="secondary" className="text-[10px]">
                          {selectedIds.length} conta{selectedIds.length !== 1 ? "s" : ""}
                        </Badge>
                        <Button
                          size="sm" variant="outline" className="h-6 text-[10px] gap-1 ml-auto"
                          disabled={loadingAdvs === bc.id}
                          onClick={() => fetchAdvertisers(bc)}
                        >
                          {loadingAdvs === bc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Buscar Contas
                        </Button>
                      </div>

                      {advList.length > 0 && (
                        <div className="border border-border rounded-md overflow-hidden">
                          {/* Search + Select All header */}
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                            <Input
                              className="h-7 text-xs flex-1"
                              placeholder="Buscar conta..."
                              value={searchQuery[bc.id] || ""}
                              onChange={(e) => setSearchQuery(prev => ({ ...prev, [bc.id]: e.target.value }))}
                            />
                            <Button
                              size="sm" variant="outline" className="h-7 text-[10px] gap-1 whitespace-nowrap"
                              onClick={() => selectAllAdvertisers(bc.id)}
                            >
                              <CheckSquare className="h-3 w-3" />
                              {allFilteredSelected ? "Desmarcar Todas" : "Selecionar Todas"}
                            </Button>
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                              {advList.length} total
                            </Badge>
                          </div>

                          {/* Advertiser list */}
                          <div className="max-h-48 overflow-y-auto divide-y divide-border">
                            {filteredAdvs.map((adv) => {
                              const isSelected = selectedIds.includes(adv.advertiser_id);
                              return (
                                <label
                                  key={adv.advertiser_id}
                                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-xs hover:bg-muted/50 ${
                                    isSelected ? "bg-primary/5" : ""
                                  }`}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleAdvertiser(bc.id, adv.advertiser_id)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{adv.advertiser_name}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">{adv.advertiser_id}</p>
                                  </div>
                                </label>
                              );
                            })}
                            {filteredAdvs.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma conta encontrada</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isTokenValid(bc) && (
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Advertiser ID:</Label>
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="Conecte via OAuth para buscar contas"
                        defaultValue={bc.advertiser_id || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (bc.advertiser_id || "")) {
                            db.from("business_centers").update({ advertiser_id: e.target.value }).eq("id", bc.id);
                            loadBCs();
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {!isTokenValid(bc) && (
                      <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => startOAuth(bc)}>
                        <ExternalLink className="h-3 w-3" /> Conectar via OAuth
                      </Button>
                    )}
                    {isTokenValid(bc) && (
                      <>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs gap-1"
                          disabled={!!syncing}
                          onClick={() => syncCampaigns(bc)}
                        >
                          {syncing === bc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Sync Campanhas
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs gap-1"
                          disabled={!!syncing}
                          onClick={() => syncCosts(bc)}
                        >
                          {syncing === bc.id + "_costs" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Sync Custos
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => startOAuth(bc)}>
                          <ExternalLink className="h-3 w-3" /> Reconectar
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add BC Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Business Center</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input placeholder="Ex: BC Principal" value={newBc.bc_name} onChange={(e) => setNewBc(p => ({ ...p, bc_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">BC ID (opcional)</Label>
              <Input placeholder="ID externo do TikTok" value={newBc.bc_external_id} onChange={(e) => setNewBc(p => ({ ...p, bc_external_id: e.target.value }))} />
            </div>
            <Button onClick={addBC} className="w-full">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
