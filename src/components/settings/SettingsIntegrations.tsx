import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plug, Save, Settings2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface IntegrationSetting {
  id: string;
  integration_key: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

interface IntegrationDef {
  key: string;
  name: string;
  icon: string;
  group: string;
  description: string;
  configFields: { key: string; label: string; type: "text" | "password"; placeholder?: string }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    key: "gtag", name: "Google Analytics 4", icon: "📊", group: "analytics",
    description: "Google Analytics 4 (gtag.js)",
    configFields: [{ key: "measurement_id", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX" }],
  },
  {
    key: "gtm", name: "Google Tag Manager", icon: "🏷️", group: "analytics",
    description: "Gerenciador de tags do Google",
    configFields: [{ key: "container_id", label: "Container ID", type: "text", placeholder: "GTM-XXXXXXX" }],
  },
  {
    key: "clarity", name: "Microsoft Clarity", icon: "🔍", group: "heatmaps",
    description: "Heatmaps e session recording",
    configFields: [{ key: "project_id", label: "Project ID", type: "text", placeholder: "Ex: vsbxker0lm" }],
  },
  {
    key: "xtracky", name: "xTracky", icon: "📡", group: "tracking",
    description: "UTM handler e tracking de parâmetros",
    configFields: [
      { key: "token", label: "Token", type: "text", placeholder: "Token de acesso" },
      { key: "script_url", label: "Script URL", type: "text", placeholder: "https://cdn.jsdelivr.net/..." },
    ],
  },
  {
    key: "utmify", name: "UTMify", icon: "🎯", group: "tracking",
    description: "Monitoramento de conversões (server-side)",
    configFields: [
      { key: "api_token", label: "API Token", type: "password", placeholder: "Token da UTMify" },
      { key: "event_waiting", label: "Evento: Aguardando Pagamento", type: "text", placeholder: "waiting_payment" },
      { key: "event_paid", label: "Evento: Pago", type: "text", placeholder: "paid" },
    ],
  },
];

const GROUPS: Record<string, string> = {
  analytics: "Analytics",
  heatmaps: "Heatmaps",
  tracking: "Tracking Externo",
  ai: "Anthropic AI",
};

export default function SettingsIntegrations() {
  const [settings, setSettings] = useState<IntegrationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, any>>({});
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [savingAnthropic, setSavingAnthropic] = useState(false);

  useEffect(() => {
    loadSettings();
    checkAnthropicKey();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from("integration_settings").select("*")
      .in("integration_key", INTEGRATIONS.map(i => i.key));
    setSettings((data as IntegrationSetting[]) || []);
    setLoading(false);
  };

  const checkAnthropicKey = async () => {
    // Try calling ai-assistant with an empty request to check if key is set
    try {
      const { error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: [{ role: "user", content: "ping" }], context: null, mode: "assistente" },
      });
      // If no error about key, it's configured
      setAnthropicConfigured(!error || !error.message?.includes("ANTHROPIC_API_KEY"));
    } catch {
      setAnthropicConfigured(false);
    }
  };

  const getSetting = (key: string) => settings.find(s => s.integration_key === key);

  const openEdit = (def: IntegrationDef) => {
    const existing = getSetting(def.key);
    setEditConfig(existing?.config || {});
    setEditKey(def.key);
  };

  const saveConfig = async () => {
    if (!editKey) return;
    const def = INTEGRATIONS.find(i => i.key === editKey)!;
    const existing = getSetting(editKey);

    if (existing) {
      await supabase.from("integration_settings").update({ config: editConfig, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("integration_settings").insert({
        integration_key: editKey,
        name: def.name,
        enabled: true,
        config: editConfig,
      });
    }
    toast.success("Configuração salva!");
    setEditKey(null);
    loadSettings();
  };

  const toggleEnabled = async (key: string) => {
    const existing = getSetting(key);
    if (existing) {
      await supabase.from("integration_settings").update({ enabled: !existing.enabled }).eq("id", existing.id);
      loadSettings();
    }
  };

  const groupedIntegrations = Object.keys(GROUPS).map(group => ({
    group,
    label: GROUPS[group],
    items: INTEGRATIONS.filter(i => i.group === group),
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" /> Integrações
        </h1>
        <p className="text-sm text-muted-foreground">Analytics, heatmaps, tracking externo e IA</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {groupedIntegrations.map(({ group, label, items }) => (
            <div key={group}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</h2>
              <div className="space-y-2">
                {items.map((def) => {
                  const setting = getSetting(def.key);
                  return (
                    <Card key={def.key}>
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{def.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{def.name}</p>
                            <p className="text-[10px] text-muted-foreground">{def.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {setting && (
                            <Switch checked={setting.enabled} onCheckedChange={() => toggleEnabled(def.key)} />
                          )}
                          {setting?.enabled
                            ? <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">Ativo</Badge>
                            : <Badge variant="outline" className="text-[10px] text-muted-foreground">Desativado</Badge>
                          }
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(def)}>
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Anthropic AI Section */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Anthropic AI</h2>
            <Card>
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🧠</span>
                    <div>
                      <p className="text-sm font-medium">Claude AI — Assistente de funil</p>
                      <p className="text-[10px] text-muted-foreground">
                        Necessária para o hub de IA. Obtenha em{" "}
                        <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          console.anthropic.com
                        </a>
                      </p>
                    </div>
                  </div>
                  {anthropicConfigured && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Configurada
                    </Badge>
                  )}
                </div>
                {!anthropicConfigured && (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="sk-ant-..."
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!anthropicKey.trim() || savingAnthropic}
                      onClick={async () => {
                        setSavingAnthropic(true);
                        toast.info("A chave da API precisa ser configurada nas secrets do projeto. Entre em contato com o administrador.");
                        setSavingAnthropic(false);
                      }}
                      className="gap-1"
                    >
                      <Save className="h-3.5 w-3.5" /> Salvar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editKey} onOpenChange={(open) => { if (!open) setEditKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar {INTEGRATIONS.find(i => i.key === editKey)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {INTEGRATIONS.find(i => i.key === editKey)?.configFields.map((field) => (
              <div key={field.key}>
                <Label className="text-xs">{field.label}</Label>
                <Input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={editConfig[field.key] || ""}
                  onChange={(e) => setEditConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button onClick={saveConfig} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
