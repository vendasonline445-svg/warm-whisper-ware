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
  AlertTriangle, CheckCircle2, Clock, Globe, Smartphone
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
  const [search, setSearch] = useState("");

  // Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ campaign_name: "", platform: "tiktok", campaign_external_id: "" });
  const [newCreative, setNewCreative] = useState({ creative_name: "", campaign_id: "", creative_external_id: "" });
  const [newLink, setNewLink] = useState({ url: "", tracking_id: "", campaign_id: "", creative_id: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (subTab === "campanhas") {
        const { data } = await db.from("campaigns").select("*").order("created_at", { ascending: false }).limit(200);
        setCampaigns(data || []);
      } else if (subTab === "criativos") {
        const { data } = await db.from("creatives").select("*, campaigns(campaign_name)").order("created_at", { ascending: false }).limit(200);
        setCreatives(data || []);
        const { data: camps } = await db.from("campaigns").select("id, campaign_name");
        setCampaigns(camps || []);
      } else if (subTab === "links") {
        const { data } = await db.from("tracked_links").select("*, campaigns(campaign_name), creatives(creative_name)").order("created_at", { ascending: false }).limit(200);
        setLinks(data || []);
        const { data: camps } = await db.from("campaigns").select("id, campaign_name");
        setCampaigns(camps || []);
        const { data: crs } = await db.from("creatives").select("id, creative_name");
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
        const { data: ev } = await db.from("events").select("*").order("created_at", { ascending: false }).limit(100);
        setEvents(ev || []);
        const { data: sess } = await db.from("sessions").select("*").order("created_at", { ascending: false }).limit(50);
        setSessions(sess || []);
      }
    } catch (e) {
      console.error("Tracking Hub fetch error:", e);
    }
    setLoading(false);
  }, [subTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // CRUD helpers
  const addCampaign = async () => {
    if (!newCampaign.campaign_name.trim()) return;
    await db.from("campaigns").insert(newCampaign);
    setNewCampaign({ campaign_name: "", platform: "tiktok", campaign_external_id: "" });
    setAddDialogOpen(false);
    fetchData();
  };

  const deleteCampaign = async (id: string) => {
    await db.from("campaigns").delete().eq("id", id);
    fetchData();
  };

  const addCreative = async () => {
    if (!newCreative.creative_name.trim()) return;
    await db.from("creatives").insert({
      creative_name: newCreative.creative_name,
      campaign_id: newCreative.campaign_id || null,
      creative_external_id: newCreative.creative_external_id || null,
    });
    setNewCreative({ creative_name: "", campaign_id: "", creative_external_id: "" });
    setAddDialogOpen(false);
    fetchData();
  };

  const deleteCreative = async (id: string) => {
    await db.from("creatives").delete().eq("id", id);
    fetchData();
  };

  const addLink = async () => {
    if (!newLink.url.trim() || !newLink.tracking_id.trim()) return;
    await db.from("tracked_links").insert({
      url: newLink.url,
      tracking_id: newLink.tracking_id,
      campaign_id: newLink.campaign_id || null,
      creative_id: newLink.creative_id || null,
    });
    setNewLink({ url: "", tracking_id: "", campaign_id: "", creative_id: "" });
    setAddDialogOpen(false);
    fetchData();
  };

  const deleteLink = async (id: string) => {
    await db.from("tracked_links").delete().eq("id", id);
    fetchData();
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const filteredEvents = events.filter(e =>
    !search || e.event_name?.toLowerCase().includes(search.toLowerCase()) || e.visitor_id?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSessions = sessions.filter(s =>
    !search || s.visitor_id?.toLowerCase().includes(search.toLowerCase()) || s.utm_source?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-1.5">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setSubTab(t.key); setSearch(""); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${subTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Campanhas ({campaigns.length})</h3>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Nova Campanha</Button>
          </div>
          {campaigns.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Nenhuma campanha cadastrada ainda. Clique em "Nova Campanha" para começar.</Card>
          ) : (
            <div className="grid gap-2">
              {campaigns.map(c => (
                <Card key={c.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.campaign_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{c.platform}</Badge>
                      {c.campaign_external_id && <span className="text-[10px] text-muted-foreground font-mono">{c.campaign_external_id}</span>}
                      <span className="text-[10px] text-muted-foreground">{fmtDate(c.created_at)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteCampaign(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </Card>
              ))}
            </div>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Campanha</DialogTitle><DialogDescription>Cadastre uma campanha para rastrear</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Nome da campanha" value={newCampaign.campaign_name} onChange={e => setNewCampaign(p => ({ ...p, campaign_name: e.target.value }))} />
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newCampaign.platform} onChange={e => setNewCampaign(p => ({ ...p, platform: e.target.value }))}>
                  <option value="tiktok">TikTok</option>
                  <option value="meta">Meta</option>
                  <option value="google">Google</option>
                  <option value="other">Outro</option>
                </select>
                <Input placeholder="ID externo (opcional)" value={newCampaign.campaign_external_id} onChange={e => setNewCampaign(p => ({ ...p, campaign_external_id: e.target.value }))} />
                <Button onClick={addCampaign} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ── CRIATIVOS ── */}
      {subTab === "criativos" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Criativos ({creatives.length})</h3>
            <Button size="sm" onClick={() => setAddDialogOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Novo Criativo</Button>
          </div>
          {creatives.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">Nenhum criativo cadastrado.</Card>
          ) : (
            <div className="grid gap-2">
              {creatives.map(c => (
                <Card key={c.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.creative_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {c.campaigns?.campaign_name && <Badge variant="outline" className="text-[10px]">{c.campaigns.campaign_name}</Badge>}
                      {c.creative_external_id && <span className="text-[10px] text-muted-foreground font-mono">{c.creative_external_id}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteCreative(c.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </Card>
              ))}
            </div>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Novo Criativo</DialogTitle><DialogDescription>Cadastre um criativo para rastrear</DialogDescription></DialogHeader>
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
              {links.map(l => (
                <Card key={l.id} className="p-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-foreground truncate">{l.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] font-mono">{l.tracking_id}</Badge>
                      {l.campaigns?.campaign_name && <Badge variant="outline" className="text-[10px]">{l.campaigns.campaign_name}</Badge>}
                      {l.creatives?.creative_name && <span className="text-[10px] text-muted-foreground">{l.creatives.creative_name}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteLink(l.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </Card>
              ))}
            </div>
          )}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Novo Link Rastreado</DialogTitle><DialogDescription>Cadastre um link com tracking_id</DialogDescription></DialogHeader>
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
                <tbody>
                  {clicks.map(c => (
                    <tr key={c.id} className="border-t border-border/30">
                      <td className="px-3 py-2">{fmtDate(c.created_at)}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{c.session_id?.slice(0, 20) || "—"}</td>
                      <td className="px-3 py-2 font-mono">{c.tracking_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
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
              <tbody>
                {filteredEvents.slice(0, 200).map(e => (
                  <tr key={e.id} className="border-t border-border/30">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.created_at)}</td>
                    <td className="px-3 py-2">
                      <Badge variant={e.event_name === "purchase" ? "default" : "secondary"} className="text-[10px]">{e.event_name}</Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{e.visitor_id?.slice(0, 18) || "—"}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{e.session_id?.slice(0, 18) || "—"}</td>
                    <td className="px-3 py-2">{e.source || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{e.campaign || "—"}</td>
                    <td className="px-3 py-2">{e.value ? `R$ ${(e.value / 100).toFixed(2)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
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
              <tbody>
                {filteredSessions.slice(0, 200).map(s => (
                  <tr key={s.session_id} className="border-t border-border/30">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(s.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{s.visitor_id?.slice(0, 18)}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{s.session_id?.slice(0, 18)}</td>
                    <td className="px-3 py-2">
                      {s.device === "Mobile" ? <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> : <Monitor className="h-3.5 w-3.5 text-muted-foreground" />}
                    </td>
                    <td className="px-3 py-2">{s.utm_source || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.utm_campaign || "—"}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{s.ttclid ? s.ttclid.slice(0, 12) + "…" : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{s.referrer || "—"}</td>
                  </tr>
                ))}
              </tbody>
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

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Sessões (50 recentes)", value: sessions.length, icon: <Monitor className="h-4 w-4" /> },
              { label: "Eventos (100 recentes)", value: events.length, icon: <Activity className="h-4 w-4" /> },
              { label: "Com ttclid", value: sessions.filter(s => s.ttclid).length, icon: <Globe className="h-4 w-4" /> },
              { label: "Purchases", value: events.filter(e => e.event_name === "purchase").length, icon: <CheckCircle2 className="h-4 w-4" /> },
            ].map((m, i) => (
              <Card key={i} className="p-3 text-center">
                <div className="flex items-center justify-center text-muted-foreground mb-1">{m.icon}</div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </Card>
            ))}
          </div>

          {/* Funnel consistency check */}
          <Card className="p-4">
            <h4 className="text-xs font-bold text-foreground mb-2">Consistência do Funil (últimos 100 eventos)</h4>
            <div className="space-y-1">
              {["page_view", "view_content", "click_buy", "add_to_cart", "checkout_start", "add_payment_info", "pix_generated", "purchase"].map(ev => {
                const count = events.filter(e => e.event_name === ev).length;
                const inconsistent = events.filter(e => e.event_name === ev && e.event_data?.is_consistent === false).length;
                return (
                  <div key={ev} className="flex items-center gap-2 text-xs">
                    <span className="w-32 font-mono">{ev}</span>
                    <span className="font-bold text-foreground">{count}</span>
                    {inconsistent > 0 && (
                      <Badge variant="destructive" className="text-[9px]"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{inconsistent} inconsistente(s)</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent events live log */}
          <Card className="p-4">
            <h4 className="text-xs font-bold text-foreground mb-2">Últimos Eventos (Live)</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {events.slice(0, 30).map(e => (
                <div key={e.id} className="flex items-center gap-2 text-[11px] py-1 border-b border-border/20">
                  <span className="text-muted-foreground w-28 shrink-0">{fmtDate(e.created_at)}</span>
                  <Badge variant={e.event_name === "purchase" ? "default" : "secondary"} className="text-[9px] shrink-0">{e.event_name}</Badge>
                  <span className="font-mono text-muted-foreground text-[9px] truncate">{e.visitor_id?.slice(0, 16)}</span>
                  <span className="font-mono text-muted-foreground text-[9px] truncate">{e.session_id?.slice(0, 16)}</span>
                  {e.source && <Badge variant="outline" className="text-[9px]">{e.source}</Badge>}
                  {e.campaign && <span className="text-[9px] text-muted-foreground">{e.campaign}</span>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
