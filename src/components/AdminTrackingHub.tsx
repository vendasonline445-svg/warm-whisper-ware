import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Megaphone, Palette, Link2, MousePointerClick, Activity, Monitor, Bug,
  Plus, Trash2, RefreshCw, Search, ExternalLink, ChevronRight, Eye,
  AlertTriangle, CheckCircle2, Clock, Globe, Smartphone, DollarSign,
  TrendingUp, BarChart3, Target, Copy
} from "lucide-react";

type SubTab = "campanhas" | "criativos" | "links" | "cliques" | "eventos" | "sessoes" | "debug";

const SUB_TABS: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "campanhas", label: "Campanhas", icon: <Megaphone className="h-4 w-4" /> },
  { key: "criativos", label: "Criativos", icon: <Palette className="h-4 w-4" /> },
  { key: "links", label: "Links Rastreados", icon: <Link2 className="h-4 w-4" /> },
  { key: "cliques", label: "Cliques", icon: <MousePointerClick className="h-4 w-4" /> },
  { key: "eventos", label: "Eventos", icon: <Activity className="h-4 w-4" /> },
  { key: "sessoes", label: "Sessões", icon: <Monitor className="h-4 w-4" /> },
  { key: "debug", label: "Debug", icon: <Bug className="h-4 w-4" /> },
];

const db = supabase as any;

function fmtDate(d: string) {
  try { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
}
function fmtMoney(v: number) { return `R$ ${(v / 100).toFixed(2)}`; }

export default function AdminTrackingHub() {
  const [subTab, setSubTab] = useState<SubTab>("campanhas");
  const [loading, setLoading] = useState(false);

  // Data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [creatives, setCreatives] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [campaignCosts, setCampaignCosts] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ campaign_name: "", platform: "tiktok", campaign_external_id: "" });
  const [newCreative, setNewCreative] = useState({ creative_name: "", campaign_id: "", creative_external_id: "" });
  const [newLink, setNewLink] = useState({ url: "", tracking_id: "", campaign_id: "", creative_id: "" });
  const [newCost, setNewCost] = useState({ campaign_id: "", date: "", spend: "", impressions: "", clicks: "" });
  const [debugVisitorId, setDebugVisitorId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (subTab === "campanhas") {
        const [{ data: camps }, { data: attrs }, { data: costs }] = await Promise.all([
          db.from("campaigns").select("*").order("created_at", { ascending: false }).limit(200),
          db.from("attributions").select("*"),
          db.from("campaign_costs").select("*"),
        ]);
        setCampaigns(camps || []);
        setAttributions(attrs || []);
        setCampaignCosts(costs || []);
      } else if (subTab === "criativos") {
        const [{ data: crs }, { data: camps }, { data: attrs }] = await Promise.all([
          db.from("creatives").select("*, campaigns(campaign_name)").order("created_at", { ascending: false }).limit(200),
          db.from("campaigns").select("id, campaign_name"),
          db.from("attributions").select("*"),
        ]);
        setCreatives(crs || []);
        setCampaigns(camps || []);
        setAttributions(attrs || []);
      } else if (subTab === "links") {
        const [{ data: lnks }, { data: camps }, { data: crs }] = await Promise.all([
          db.from("tracked_links").select("*, campaigns(campaign_name), creatives(creative_name)").order("created_at", { ascending: false }).limit(200),
          db.from("campaigns").select("id, campaign_name"),
          db.from("creatives").select("id, creative_name"),
        ]);
        setLinks(lnks || []);
        setCampaigns(camps || []);
        setCreatives(crs || []);
      } else if (subTab === "cliques") {
        const { data } = await db.from("clicks").select("*").order("created_at", { ascending: false }).limit(500);
        setClicks(data || []);
      } else if (subTab === "eventos") {
        const { data } = await db.from("events").select("*").order("created_at", { ascending: false }).limit(500);
        setEvents(data || []);
      } else if (subTab === "sessoes") {
        const { data } = await db.from("sessions").select("*").order("created_at", { ascending: false }).limit(500);
        setSessions(data || []);
      } else if (subTab === "debug") {
        const [{ data: ev }, { data: sess }, { data: attrs }] = await Promise.all([
          db.from("events").select("*").order("created_at", { ascending: false }).limit(200),
          db.from("sessions").select("*").order("created_at", { ascending: false }).limit(100),
          db.from("attributions").select("*, campaigns(campaign_name), creatives(creative_name)").order("created_at", { ascending: false }).limit(100),
        ]);
        setEvents(ev || []);
        setSessions(sess || []);
        setAttributions(attrs || []);
      }
    } catch (e) { console.error("Tracking Hub fetch error:", e); }
    setLoading(false);
  }, [subTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CRUD
  const addCampaign = async () => {
    if (!newCampaign.campaign_name.trim()) return;
    await db.from("campaigns").insert(newCampaign);
    setNewCampaign({ campaign_name: "", platform: "tiktok", campaign_external_id: "" });
    setAddDialogOpen(false);
    fetchData();
  };
  const deleteCampaign = async (id: string) => { await db.from("campaigns").delete().eq("id", id); fetchData(); };

  const addCreative = async () => {
    if (!newCreative.creative_name.trim()) return;
    await db.from("creatives").insert({ creative_name: newCreative.creative_name, campaign_id: newCreative.campaign_id || null, creative_external_id: newCreative.creative_external_id || null });
    setNewCreative({ creative_name: "", campaign_id: "", creative_external_id: "" });
    setAddDialogOpen(false);
    fetchData();
  };
  const deleteCreative = async (id: string) => { await db.from("creatives").delete().eq("id", id); fetchData(); };

  const addLink = async () => {
    if (!newLink.url.trim() || !newLink.tracking_id.trim()) return;
    await db.from("tracked_links").insert({ url: newLink.url, tracking_id: newLink.tracking_id, campaign_id: newLink.campaign_id || null, creative_id: newLink.creative_id || null });
    setNewLink({ url: "", tracking_id: "", campaign_id: "", creative_id: "" });
    setAddDialogOpen(false);
    fetchData();
  };
  const deleteLink = async (id: string) => { await db.from("tracked_links").delete().eq("id", id); fetchData(); };

  const addCampaignCost = async () => {
    if (!newCost.campaign_id || !newCost.date) return;
    await db.from("campaign_costs").upsert({
      campaign_id: newCost.campaign_id,
      date: newCost.date,
      spend: Math.round(parseFloat(newCost.spend || "0") * 100),
      impressions: parseInt(newCost.impressions || "0"),
      clicks: parseInt(newCost.clicks || "0"),
      cpc: parseFloat(newCost.clicks || "0") > 0 ? (parseFloat(newCost.spend || "0") / parseInt(newCost.clicks || "1")).toFixed(2) : 0,
      ctr: parseFloat(newCost.impressions || "0") > 0 ? (parseInt(newCost.clicks || "0") / parseInt(newCost.impressions || "1") * 100).toFixed(4) : 0,
    }, { onConflict: "campaign_id,date" });
    setNewCost({ campaign_id: "", date: "", spend: "", impressions: "", clicks: "" });
    setCostDialogOpen(false);
    fetchData();
  };

  // Computed metrics
  const getCampaignRevenue = (campaignId: string) => attributions.filter(a => a.campaign_id === campaignId).reduce((sum: number, a: any) => sum + (a.revenue || 0), 0);
  const getCampaignSales = (campaignId: string) => attributions.filter(a => a.campaign_id === campaignId).length;
  const getCampaignSpend = (campaignId: string) => campaignCosts.filter(c => c.campaign_id === campaignId).reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
  const getCreativeRevenue = (creativeId: string) => attributions.filter(a => a.creative_id === creativeId).reduce((sum: number, a: any) => sum + (a.revenue || 0), 0);
  const getCreativeSales = (creativeId: string) => attributions.filter(a => a.creative_id === creativeId).length;

  const filteredEvents = events.filter(e => !search || e.event_name?.toLowerCase().includes(search.toLowerCase()) || e.visitor_id?.toLowerCase().includes(search.toLowerCase()));
  const filteredSessions = sessions.filter(s => !search || s.visitor_id?.toLowerCase().includes(search.toLowerCase()) || s.utm_source?.toLowerCase().includes(search.toLowerCase()));

  const baseUrl = window.location.origin;

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => { setSubTab(t.key); setSearch(""); setDebugVisitorId(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {t.icon} {t.label}
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={fetchData} className="ml-auto">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* ── CAMPANHAS ── */}
      {subTab === "campanhas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">Campanhas ({campaigns.length})</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setCostDialogOpen(true)}><DollarSign className="h-3.5 w-3.5 mr-1" /> Adicionar Custo</Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Nova Campanha</Button>
            </div>
          </div>

          {/* Campaign metrics summary */}
          {campaigns.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Card className="p-3 text-center"><DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold text-foreground">{fmtMoney(attributions.reduce((s: number, a: any) => s + (a.revenue || 0), 0))}</p><p className="text-[10px] text-muted-foreground">Receita Total</p></Card>
              <Card className="p-3 text-center"><Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold text-foreground">{attributions.length}</p><p className="text-[10px] text-muted-foreground">Vendas Atribuídas</p></Card>
              <Card className="p-3 text-center"><TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold text-foreground">{fmtMoney(campaignCosts.reduce((s: number, c: any) => s + (c.spend || 0), 0))}</p><p className="text-[10px] text-muted-foreground">Gasto Total</p></Card>
              <Card className="p-3 text-center"><BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" /><p className="text-lg font-bold text-foreground">{(() => { const spend = campaignCosts.reduce((s: number, c: any) => s + (c.spend || 0), 0); const rev = attributions.reduce((s: number, a: any) => s + (a.revenue || 0), 0); return spend > 0 ? (rev / spend).toFixed(2) + "x" : "—"; })()}</p><p className="text-[10px] text-muted-foreground">ROAS</p></Card>
            </div>
          )}

          {campaigns.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Nenhuma campanha cadastrada ainda.</Card>
          ) : (
            <div className="grid gap-2">
              {campaigns.map(c => {
                const revenue = getCampaignRevenue(c.id);
                const sales = getCampaignSales(c.id);
                const spend = getCampaignSpend(c.id);
                const roas = spend > 0 ? (revenue / spend).toFixed(2) : "—";
                const cpa = sales > 0 && spend > 0 ? fmtMoney(Math.round(spend / sales)) : "—";
                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.campaign_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{c.platform}</Badge>
                          {c.campaign_external_id && <span className="text-[10px] text-muted-foreground font-mono">{c.campaign_external_id}</span>}
                          <span className="text-[10px] text-muted-foreground">{fmtDate(c.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                          <span className="text-muted-foreground">Vendas: <strong className="text-foreground">{sales}</strong></span>
                          <span className="text-muted-foreground">Receita: <strong className="text-foreground">{fmtMoney(revenue)}</strong></span>
                          {spend > 0 && <span className="text-muted-foreground">Gasto: <strong className="text-foreground">{fmtMoney(spend)}</strong></span>}
                          {spend > 0 && <span className="text-muted-foreground">ROAS: <strong className="text-foreground">{roas}x</strong></span>}
                          {cpa !== "—" && <span className="text-muted-foreground">CPA: <strong className="text-foreground">{cpa}</strong></span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteCampaign(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* New campaign dialog */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Nova Campanha</DialogTitle><DialogDescription>Cadastre uma campanha para rastrear</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome da campanha" value={newCampaign.campaign_name} onChange={e => setNewCampaign(p => ({ ...p, campaign_name: e.target.value }))} />
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newCampaign.platform} onChange={e => setNewCampaign(p => ({ ...p, platform: e.target.value }))}>
                  <option value="tiktok">TikTok</option><option value="meta">Meta</option><option value="google">Google</option><option value="other">Outro</option>
                </select>
                <Input placeholder="ID externo (opcional)" value={newCampaign.campaign_external_id} onChange={e => setNewCampaign(p => ({ ...p, campaign_external_id: e.target.value }))} />
                <Button onClick={addCampaign} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Campaign cost dialog */}
          <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
            <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Adicionar Custo de Campanha</DialogTitle><DialogDescription>Registre o gasto diário de uma campanha</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newCost.campaign_id} onChange={e => setNewCost(p => ({ ...p, campaign_id: e.target.value }))}>
                  <option value="">Selecione a campanha</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.campaign_name}</option>)}
                </select>
                <Input type="date" value={newCost.date} onChange={e => setNewCost(p => ({ ...p, date: e.target.value }))} />
                <Input type="number" placeholder="Gasto (R$)" value={newCost.spend} onChange={e => setNewCost(p => ({ ...p, spend: e.target.value }))} />
                <Input type="number" placeholder="Impressões" value={newCost.impressions} onChange={e => setNewCost(p => ({ ...p, impressions: e.target.value }))} />
                <Input type="number" placeholder="Cliques" value={newCost.clicks} onChange={e => setNewCost(p => ({ ...p, clicks: e.target.value }))} />
                <Button onClick={addCampaignCost} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── CRIATIVOS ── */}
      {subTab === "criativos" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Criativos — Performance ({creatives.length})</h3>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Criativo</Button>
          </div>

          {creatives.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum criativo cadastrado.</Card>
          ) : (
            <div className="grid gap-2">
              {creatives.map(c => {
                const revenue = getCreativeRevenue(c.id);
                const sales = getCreativeSales(c.id);
                return (
                  <Card key={c.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.creative_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {c.campaigns?.campaign_name && <Badge variant="outline" className="text-[10px]">{c.campaigns.campaign_name}</Badge>}
                          {c.creative_external_id && <span className="text-[10px] text-muted-foreground font-mono">{c.creative_external_id}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                          <span className="text-muted-foreground">Vendas: <strong className="text-foreground">{sales}</strong></span>
                          <span className="text-muted-foreground">Receita: <strong className="text-foreground">{fmtMoney(revenue)}</strong></span>
                          {sales > 0 && <Badge variant="default" className="text-[9px]"><TrendingUp className="h-2.5 w-2.5 mr-0.5" /> {sales} conversão(ões)</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteCreative(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Novo Criativo</DialogTitle><DialogDescription>Cadastre um criativo</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome do criativo" value={newCreative.creative_name} onChange={e => setNewCreative(p => ({ ...p, creative_name: e.target.value }))} />
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newCreative.campaign_id} onChange={e => setNewCreative(p => ({ ...p, campaign_id: e.target.value }))}>
                  <option value="">Campanha (opcional)</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.campaign_name}</option>)}
                </select>
                <Input placeholder="ID externo (opcional)" value={newCreative.creative_external_id} onChange={e => setNewCreative(p => ({ ...p, creative_external_id: e.target.value }))} />
                <Button onClick={addCreative} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── LINKS RASTREADOS ── */}
      {subTab === "links" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Links Rastreados ({links.length})</h3>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Link</Button>
          </div>
          {links.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum link rastreado.</Card>
          ) : (
            <div className="grid gap-2">
              {links.map(l => {
                const redirectUrl = `${baseUrl}/r/${l.tracking_id}`;
                return (
                  <Card key={l.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono text-foreground truncate">{l.url}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] font-mono">{l.tracking_id}</Badge>
                          {l.campaigns?.campaign_name && <Badge variant="outline" className="text-[10px]">{l.campaigns.campaign_name}</Badge>}
                          {l.creatives?.creative_name && <span className="text-[10px] text-muted-foreground">{l.creatives.creative_name}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{redirectUrl}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => navigator.clipboard.writeText(redirectUrl)}><Copy className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteLink(l.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Novo Link Rastreado</DialogTitle><DialogDescription>Cadastre um link com tracking_id. O link de redirecionamento será gerado automaticamente.</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="URL destino" value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} />
                <Input placeholder="Tracking ID" value={newLink.tracking_id} onChange={e => setNewLink(p => ({ ...p, tracking_id: e.target.value }))} />
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newLink.campaign_id} onChange={e => setNewLink(p => ({ ...p, campaign_id: e.target.value }))}>
                  <option value="">Campanha (opcional)</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.campaign_name}</option>)}
                </select>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newLink.creative_id} onChange={e => setNewLink(p => ({ ...p, creative_id: e.target.value }))}>
                  <option value="">Criativo (opcional)</option>
                  {creatives.map(c => <option key={c.id} value={c.id}>{c.creative_name}</option>)}
                </select>
                <Button onClick={addLink} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── CLIQUES ── */}
      {subTab === "cliques" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Cliques Recentes ({clicks.length})</h3>
          {clicks.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum clique registrado ainda.</Card>
          ) : (
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-muted"><tr>
                  <th className="px-3 py-2 text-left font-semibold">Data</th>
                  <th className="px-3 py-2 text-left font-semibold">Session ID</th>
                  <th className="px-3 py-2 text-left font-semibold">Tracking ID</th>
                </tr></thead>
                <tbody>{clicks.map(c => (
                  <tr key={c.id} className="border-t border-border/30">
                    <td className="px-3 py-2">{fmtDate(c.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{c.session_id?.slice(0, 20) || "—"}</td>
                    <td className="px-3 py-2 font-mono">{c.tracking_id || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── EVENTOS ── */}
      {subTab === "eventos" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Eventos ({filteredEvents.length})</h3>
            <div className="flex-1 max-w-xs">
              <Input placeholder="Buscar evento ou visitor_id..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-muted"><tr>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-left font-semibold">Evento</th>
                <th className="px-3 py-2 text-left font-semibold">Visitor ID</th>
                <th className="px-3 py-2 text-left font-semibold">Session ID</th>
                <th className="px-3 py-2 text-left font-semibold">Source</th>
                <th className="px-3 py-2 text-left font-semibold">Campaign</th>
                <th className="px-3 py-2 text-left font-semibold">Valor</th>
              </tr></thead>
              <tbody>{filteredEvents.slice(0, 200).map(e => (
                <tr key={e.id} className="border-t border-border/30">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.created_at)}</td>
                  <td className="px-3 py-2"><Badge variant={e.event_name === "purchase" ? "default" : "secondary"} className="text-[10px]">{e.event_name}</Badge></td>
                  <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{e.visitor_id?.slice(0, 18) || "—"}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{e.session_id?.slice(0, 18) || "—"}</td>
                  <td className="px-3 py-2">{e.source || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.campaign || "—"}</td>
                  <td className="px-3 py-2">{e.value ? fmtMoney(e.value) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SESSÕES ── */}
      {subTab === "sessoes" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Sessões ({filteredSessions.length})</h3>
            <div className="flex-1 max-w-xs">
              <Input placeholder="Buscar visitor_id ou utm_source..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-muted"><tr>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-left font-semibold">Visitor ID</th>
                <th className="px-3 py-2 text-left font-semibold">Session ID</th>
                <th className="px-3 py-2 text-left font-semibold">Device</th>
                <th className="px-3 py-2 text-left font-semibold">Source</th>
                <th className="px-3 py-2 text-left font-semibold">Campaign</th>
                <th className="px-3 py-2 text-left font-semibold">ttclid</th>
                <th className="px-3 py-2 text-left font-semibold">Referrer</th>
              </tr></thead>
              <tbody>{filteredSessions.slice(0, 200).map(s => (
                <tr key={s.session_id} className="border-t border-border/30">
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{s.visitor_id?.slice(0, 18)}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{s.session_id?.slice(0, 18)}</td>
                  <td className="px-3 py-2">{s.device === "Mobile" ? <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> : <Monitor className="h-3.5 w-3.5 text-muted-foreground" />}</td>
                  <td className="px-3 py-2">{s.utm_source || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.utm_campaign || "—"}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{s.ttclid ? s.ttclid.slice(0, 12) + "…" : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{s.referrer || "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DEBUG ── */}
      {subTab === "debug" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Bug className="h-4 w-4" /> Debug de Tracking</h3>
            <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>

          {/* Visitor timeline filter */}
          <div className="flex items-center gap-2">
            <Input placeholder="Filtrar por visitor_id..." value={debugVisitorId} onChange={e => setDebugVisitorId(e.target.value)} className="h-8 text-xs max-w-sm" />
            {debugVisitorId && <Button variant="ghost" size="sm" onClick={() => setDebugVisitorId("")} className="text-xs">Limpar</Button>}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { label: "Sessões", value: sessions.length, icon: <Monitor className="h-4 w-4" /> },
              { label: "Eventos", value: events.length, icon: <Activity className="h-4 w-4" /> },
              { label: "Com ttclid", value: sessions.filter(s => s.ttclid).length, icon: <Globe className="h-4 w-4" /> },
              { label: "Purchases", value: events.filter(e => e.event_name === "purchase").length, icon: <CheckCircle2 className="h-4 w-4" /> },
              { label: "Atribuições", value: attributions.length, icon: <Target className="h-4 w-4" /> },
            ].map((m, i) => (
              <Card key={i} className="p-3 text-center">
                <div className="flex items-center justify-center text-muted-foreground mb-1">{m.icon}</div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </Card>
            ))}
          </div>

          {/* Funnel consistency */}
          <Card className="p-4">
            <h4 className="text-xs font-bold text-foreground mb-2">Consistência do Funil</h4>
            <div className="space-y-1">
              {["page_view", "view_content", "click_buy", "add_to_cart", "checkout_start", "add_payment_info", "pix_generated", "purchase"].map(ev => {
                const filtered = debugVisitorId ? events.filter(e => e.visitor_id?.includes(debugVisitorId)) : events;
                const count = filtered.filter(e => e.event_name === ev).length;
                const inconsistent = filtered.filter(e => e.event_name === ev && e.event_data?.is_consistent === false).length;
                return (
                  <div key={ev} className="flex items-center gap-2 text-xs">
                    <span className="w-32 font-mono">{ev}</span>
                    <span className="font-bold text-foreground">{count}</span>
                    {inconsistent > 0 && <Badge variant="destructive" className="text-[9px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{inconsistent} inconsistente(s)</Badge>}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Attribution log */}
          {attributions.length > 0 && (
            <Card className="p-4">
              <h4 className="text-xs font-bold text-foreground mb-2">Atribuições Recentes</h4>
              <div className="max-h-[250px] overflow-y-auto space-y-1">
                {attributions.filter(a => !debugVisitorId || a.session_id?.includes(debugVisitorId)).slice(0, 30).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/20">
                    <span className="text-muted-foreground w-28 shrink-0">{fmtDate(a.created_at)}</span>
                    <Badge variant="default" className="text-[9px]">purchase</Badge>
                    <span className="font-mono text-muted-foreground text-[9px] truncate">{a.session_id?.slice(0, 16) || "—"}</span>
                    {a.campaigns?.campaign_name && <Badge variant="outline" className="text-[9px]">{a.campaigns.campaign_name}</Badge>}
                    {a.creatives?.creative_name && <span className="text-[9px] text-muted-foreground">{a.creatives.creative_name}</span>}
                    <span className="ml-auto font-semibold text-foreground">{fmtMoney(a.revenue || 0)}</span>
                    <Badge variant="secondary" className="text-[8px]">{a.attribution_model}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Visitor timeline */}
          <Card className="p-4">
            <h4 className="text-xs font-bold text-foreground mb-2">Timeline de Eventos {debugVisitorId && `(${debugVisitorId})`}</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {(debugVisitorId ? events.filter(e => e.visitor_id?.includes(debugVisitorId)) : events).slice(0, 50).map(e => (
                <div key={e.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/20">
                  <span className="text-muted-foreground w-28 shrink-0">{fmtDate(e.created_at)}</span>
                  <Badge variant={e.event_name === "purchase" ? "default" : e.event_data?.is_consistent === false ? "destructive" : "secondary"} className="text-[9px] shrink-0">{e.event_name}</Badge>
                  <span className="font-mono text-muted-foreground text-[9px] truncate">{e.visitor_id?.slice(0, 16)}</span>
                  <span className="font-mono text-muted-foreground text-[9px] truncate">{e.session_id?.slice(0, 16)}</span>
                  {e.source && <Badge variant="outline" className="text-[9px]">{e.source}</Badge>}
                  {e.campaign && <span className="text-[9px] text-muted-foreground">{e.campaign}</span>}
                  {e.event_data?.is_consistent === false && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
