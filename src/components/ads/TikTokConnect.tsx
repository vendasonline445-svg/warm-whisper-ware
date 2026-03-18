import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link2, ExternalLink, RefreshCw, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
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

export default function TikTokConnect({ onSynced }: { onSynced?: () => void }) {
  const { profile } = useAuth();
  const [bcs, setBcs] = useState<BC[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newBc, setNewBc] = useState({ bc_name: "", bc_external_id: "" });
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => { loadBCs(); }, []);

  // Check for OAuth callback
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

  const syncCampaigns = async (bc: BC) => {
    if (!bc.advertiser_id) {
      toast({ title: "Configure o Advertiser ID primeiro", variant: "destructive" });
      return;
    }
    setSyncing(bc.id);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "sync_campaigns", advertiser_id: bc.advertiser_id },
      });
      if (error) throw error;
      toast({ title: `✅ ${data.synced} campanhas sincronizadas` });
      onSynced?.();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const syncCosts = async (bc: BC) => {
    if (!bc.advertiser_id) {
      toast({ title: "Configure o Advertiser ID primeiro", variant: "destructive" });
      return;
    }
    setSyncing(bc.id + "_costs");
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { bc_id: bc.id, action: "sync_costs", advertiser_id: bc.advertiser_id },
      });
      if (error) throw error;
      toast({ title: `✅ ${data.inserted} registros de custo sincronizados` });
      onSynced?.();
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    }
    setSyncing(null);
  };

  const updateAdvertiserId = async (bcId: string, advertiserId: string) => {
    await db.from("business_centers").update({ advertiser_id: advertiserId }).eq("id", bcId);
    loadBCs();
  };

  const isTokenValid = (bc: BC) => {
    if (!bc.access_token) return false;
    if (!bc.token_expires_at) return true;
    return new Date(bc.token_expires_at) > new Date();
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
          {bcs.map((bc) => (
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

                {/* Advertiser ID */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-muted-foreground whitespace-nowrap">Advertiser ID:</Label>
                  <Input
                    className="h-7 text-xs flex-1"
                    placeholder="Ex: 7234567890123"
                    defaultValue={bc.advertiser_id || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (bc.advertiser_id || "")) {
                        updateAdvertiserId(bc.id, e.target.value);
                      }
                    }}
                  />
                </div>

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
          ))}
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
