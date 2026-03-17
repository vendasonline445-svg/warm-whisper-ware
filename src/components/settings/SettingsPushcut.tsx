import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Destination {
  id: string;
  label: string;
  api_key: string;
  notification_name: string;
  events: string[];
  enabled: boolean;
}

const EVENT_OPTIONS = [
  { value: "pending", label: "⏳ Pendente (PIX/Cartão)" },
  { value: "approved", label: "✅ Aprovada" },
];

export default function SettingsPushcut() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ label: "", api_key: "", notification_name: "", events: [] as string[] });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("pushcut_destinations" as any).select("*").order("created_at");
    setDestinations((data as any as Destination[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ label: "", api_key: "", notification_name: "", events: ["pending"] });
    setEditOpen(true);
  };

  const openEdit = (d: Destination) => {
    setEditId(d.id);
    setForm({ label: d.label, api_key: d.api_key, notification_name: d.notification_name, events: d.events });
    setEditOpen(true);
  };

  const toggleEvent = (ev: string) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  };

  const save = async () => {
    if (!form.label || !form.api_key || !form.notification_name || !form.events.length) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (editId) {
      await (supabase.from("pushcut_destinations" as any) as any).update({
        label: form.label,
        api_key: form.api_key,
        notification_name: form.notification_name,
        events: form.events,
      }).eq("id", editId);
    } else {
      await (supabase.from("pushcut_destinations" as any) as any).insert({
        label: form.label,
        api_key: form.api_key,
        notification_name: form.notification_name,
        events: form.events,
      });
    }
    toast.success("Salvo!");
    setEditOpen(false);
    load();
  };

  const toggleEnabled = async (d: Destination) => {
    await (supabase.from("pushcut_destinations" as any) as any).update({ enabled: !d.enabled }).eq("id", d.id);
    load();
  };

  const remove = async (id: string) => {
    await (supabase.from("pushcut_destinations" as any) as any).delete().eq("id", id);
    toast.success("Removido");
    load();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Pushcut — Notificações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie destinos de notificação push para vendas pendentes e aprovadas
          </p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> Novo Destino
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : destinations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum destino configurado</p>
      ) : (
        <div className="space-y-2">
          {destinations.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">🔔</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      ...{d.api_key.slice(-6)} → {d.notification_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.events.map((ev) => (
                    <Badge key={ev} variant="outline" className="text-[10px]">
                      {ev === "pending" ? "⏳ Pendente" : "✅ Aprovada"}
                    </Badge>
                  ))}
                  <Switch checked={d.enabled} onCheckedChange={() => toggleEnabled(d)} />
                  {d.enabled ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Off</Badge>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(d)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => remove(d.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="py-3 px-4">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> Cada destino envia uma notificação via Pushcut quando o evento selecionado ocorre.
            O <code className="bg-muted px-1 rounded">API Key</code> é o token único da URL do Pushcut 
            (ex: <code className="bg-muted px-1 rounded">SpzDS98J4ESuSNvFb2HbR</code>) e o <code className="bg-muted px-1 rounded">Nome da Notificação</code> é 
            o nome configurado no app Pushcut.
          </p>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Destino" : "Novo Destino"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome / Label</Label>
              <Input placeholder="Ex: Meu iPhone" value={form.label} onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">API Key (token da URL)</Label>
              <Input placeholder="SpzDS98J4ESuSNvFb2HbR" value={form.api_key} onChange={(e) => setForm(f => ({ ...f, api_key: e.target.value }))} className="font-mono text-sm" />
            </div>
            <div>
              <Label className="text-xs">Nome da Notificação (no Pushcut)</Label>
              <Input placeholder="MinhaNotificação" value={form.notification_name} onChange={(e) => setForm(f => ({ ...f, notification_name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Eventos</Label>
              <div className="space-y-2">
                {EVENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.events.includes(opt.value)}
                      onCheckedChange={() => toggleEvent(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={save} className="w-full gap-1">
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
