import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Activity, AlertTriangle, CheckCircle2, DollarSign, Loader2, Bell, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const db = supabase as any;

interface BCInfo {
  id: string;
  bc_name: string;
  advertiser_id: string;
  access_token: string;
  bc_external_id: string;
}

interface HealthAlert {
  advertiser_id: string;
  name: string;
  issue: string;
  detail: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  STATUS_ENABLE: { label: "Ativa", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  STATUS_DISABLE: { label: "Desativada", color: "bg-destructive/10 text-destructive border-destructive/30" },
  STATUS_LIMIT: { label: "Limitada", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  STATUS_LIMIT_PART: { label: "Parcialmente Limitada", color: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  STATUS_PENDING_CONFIRM: { label: "Pendente Confirmação", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  STATUS_PENDING_VERIFIED: { label: "Pendente Verificação", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  STATUS_CONFIRM_FAIL: { label: "Confirmação Falhou", color: "bg-destructive/10 text-destructive border-destructive/30" },
  STATUS_CONFIRM_FAIL_END: { label: "Falha Definitiva", color: "bg-destructive/10 text-destructive border-destructive/30" },
};

export default function AccountHealthMonitor() {
  const [bcs, setBcs] = useState<BCInfo[]>([]);
  const [selectedBcId, setSelectedBcId] = useState("");
  const [checking, setChecking] = useState(false);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [pushcutSent, setPushcutSent] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("business_centers")
        .select("id, bc_name, advertiser_id, access_token, bc_external_id")
        .eq("status", "active");
      setBcs(data || []);
      if (data?.length === 1) setSelectedBcId(data[0].id);
    })();
  }, []);

  const selectedBc = bcs.find(b => b.id === selectedBcId);
  const advCount = (selectedBc?.advertiser_id || "").split(",").filter(Boolean).length;

  const checkHealth = async () => {
    if (!selectedBcId) return;
    setChecking(true);
    setAlerts([]);
    setPushcutSent(false);

    try {
      const { data, error } = await supabase.functions.invoke("tiktok-sync-campaigns", {
        body: { action: "check_account_health", bc_id: selectedBcId },
      });

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }

      setAlerts(data.alerts || []);
      setTotalAccounts(data.total_accounts || 0);
      setPushcutSent(data.pushcut_sent || false);
      setLastCheck(new Date().toLocaleTimeString("pt-BR"));

      if (data.alerts_count > 0) {
        toast({
          title: `⚠️ ${data.alerts_count} alerta(s) encontrado(s)`,
          description: data.pushcut_sent ? "Notificação enviada via Pushcut" : "Verifique os detalhes abaixo",
          variant: "destructive",
        });
      } else {
        toast({ title: "✅ Todas as contas saudáveis", description: `${data.total_accounts} contas verificadas` });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const statusAlerts = alerts.filter(a => a.issue === "status");
  const balanceAlerts = alerts.filter(a => a.issue === "balance");
  const lowBalanceAlerts = alerts.filter(a => a.issue === "low_balance");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" />
            Monitor de Saúde das Contas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Verifica o <strong>status</strong> e <strong>saldo</strong> de todas as contas do BC e envia alertas via Pushcut quando encontra problemas.
          </p>

          <div className="flex gap-2">
            <Select value={selectedBcId} onValueChange={setSelectedBcId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um BC" />
              </SelectTrigger>
              <SelectContent>
                {bcs.map(bc => (
                  <SelectItem key={bc.id} value={bc.id}>
                    {bc.bc_name} ({(bc.advertiser_id || "").split(",").filter(Boolean).length} contas)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={checkHealth} disabled={checking || !selectedBcId} size="lg">
              {checking ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verificando...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Verificar Saúde</>
              )}
            </Button>
          </div>

          {lastCheck && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Última verificação: {lastCheck}</span>
              {pushcutSent && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                  <Bell className="h-3 w-3 mr-1" /> Pushcut enviado
                </Badge>
              )}
            </div>
          )}

          {/* Summary Cards */}
          {lastCheck && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold">{totalAccounts}</p>
                  <p className="text-xs text-muted-foreground">Contas verificadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{totalAccounts - alerts.length}</p>
                  <p className="text-xs text-muted-foreground">Saudáveis</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{statusAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Problemas de status</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{balanceAlerts.length + lowBalanceAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Sem saldo / Saldo baixo</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alerts Table */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Alertas ({alerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Detalhe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((a, i) => {
                      const statusInfo = STATUS_LABELS[a.detail] || null;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{a.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{a.advertiser_id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {a.issue === "status" ? (
                              <Badge variant="destructive" className="text-[10px]">Status</Badge>
                            ) : a.issue === "balance" ? (
                              <Badge variant="destructive" className="text-[10px]">
                                <DollarSign className="h-3 w-3 mr-0.5" /> Sem Saldo
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                                <DollarSign className="h-3 w-3 mr-0.5" /> Saldo Baixo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {statusInfo ? (
                              <Badge className={`${statusInfo.color} text-[10px]`}>{statusInfo.label}</Badge>
                            ) : (
                              <span className="text-sm">{a.detail}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {lastCheck && alerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
              <p className="font-semibold text-green-600">Todas as contas saudáveis!</p>
              <p className="text-sm text-muted-foreground">{totalAccounts} contas verificadas sem problemas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
