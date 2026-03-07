import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Shield, CheckCircle2, AlertTriangle, Clock, Truck, FileCheck, Zap,
  Package, ClipboardCheck, Lock, Loader2, X
} from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const TCAD_PRICE = 34.81;
const TCAD_PRICE_CENTS = 3481;

function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const Upsell1 = () => {
  const navigate = useNavigate();
  const timer = useCountdown(600);
  const [isLoading, setIsLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [exitBlocked, setExitBlocked] = useState(false);

  // Get customer data from previous order
  const orderDataStr = sessionStorage.getItem("orderData");
  const orderData = orderDataStr ? JSON.parse(orderDataStr) : null;
  const customer = orderData?.customer;

  // Generate random order number
  const [orderNumber] = useState(() => Math.floor(Math.random() * 9000000000) + 1000000000);

  // Prevent back navigation
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      setPopupOpen(true);
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleGeneratePix = async () => {
    if (!customer || isLoading) return;
    setIsLoading(true);

    try {
      const payload = {
        amount: TCAD_PRICE_CENTS,
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          cpf: customer.cpf,
        },
        items: [
          {
            id: "tcad-auditoria",
            title: "TCAD - Taxa de Consolidação e Auditoria de Dados",
            unitPrice: TCAD_PRICE_CENTS,
            quantity: 1,
            tangible: false,
          },
        ],
        shipping: {
          name: customer.name,
          address: {
            street: "",
            streetNumber: "",
            neighborhood: "",
            city: "",
            state: "",
            zipcode: "",
            country: "br",
          },
          fee: 0,
        },
        metadata: JSON.stringify({
          type: "upsell_tcad",
          originalOrder: orderData?.product,
          tracking: {},
        }),
      };

      const { data, error } = await supabase.functions.invoke("create-pix", {
        body: payload,
      });

      if (error || !data || data?.error) {
        const errMsg = data?.details?.message || data?.error || error?.message || "Tente novamente.";
        toast({ title: "Erro ao gerar PIX", description: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg), variant: "destructive" });
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("pixData", JSON.stringify(data));
      sessionStorage.setItem("pixReturnTo", "/upsell1");
      navigate("/pix");
    } catch (err) {
      console.error("Upsell PIX error:", err);
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(210,20%,97%)]">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3">
        <div className="mx-auto max-w-[600px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Setor de Consolidação e Auditoria de Dados</p>
              <p className="text-[10px] text-muted-foreground">Pedido #{orderNumber} • Uso Interno</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[10px] font-semibold text-amber-700">TCAD pendente</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[600px] px-4 py-4 space-y-4">
        {/* Progress Steps */}
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold">Fluxo de liberação</p>
              <p className="text-[10px] text-muted-foreground">Atualização automática do setor logístico</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-sm font-semibold">NF-e emitida</p>
                <p className="text-[10px] text-muted-foreground">Documento fiscal autenticado</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700">Auditoria de Dados</p>
                <p className="text-[10px] text-muted-foreground">Aguardando conclusão da TCAD</p>
              </div>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Envio em andamento</p>
                <p className="text-[10px] text-muted-foreground">Pausado até finalizar auditoria</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert */}
        <div className="bg-card rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-sm font-bold">Pendência de Consolidação do Pedido</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Sua Nota Fiscal Eletrônica já foi emitida com sucesso.</p>
            <p>Agora, antes da liberação para envio, é necessário concluir a <strong className="text-foreground">TCAD – Taxa de Consolidação e Auditoria de Dados</strong>.</p>
            <p>Esse procedimento finaliza a auditoria manual dos dados preenchidos no momento da compra para evitar:</p>
            <ul className="space-y-1.5 mt-2">
              <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">•</span> Registro no Serasa por inconsistência irregular</li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">•</span> Dados inconsistentes no sistema logístico</li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">•</span> Multas no nome por pendência ativa</li>
              <li className="flex items-start gap-2"><span className="text-destructive mt-0.5">•</span> Atrasos no envio</li>
            </ul>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-foreground">Seu pedido está aguardando essa confirmação.</p>
              <p className="text-muted-foreground mt-1">Sem a TCAD, o pedido permanece <strong>em análise manual</strong> e corre risco de <strong>cancelamento automático por inconsistência de dados</strong>.</p>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-start gap-2 mb-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">Mais de <strong className="text-foreground">87% dos pedidos</strong> são devolvidos por erro de digitação ou inconsistência nos dados fornecidos.</p>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Com a TCAD, um operador faz uma <strong className="text-foreground">validação interna completa</strong>, garantindo:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" /> Correção automática de informações</li>
            <li className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-amber-500 flex-shrink-0" /> Liberação imediata para expedição</li>
            <li className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-primary flex-shrink-0" /> Prioridade no processamento logístico</li>
          </ul>
          <p className="text-sm font-bold mt-4">Esta é a <strong>última etapa antes do envio.</strong></p>
        </div>

        {/* Badges */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: CheckCircle2, label: "Selo de autenticação" },
            { icon: ClipboardCheck, label: "Auditoria manual" },
            { icon: Shield, label: "Verificação interna" },
            { icon: Package, label: "Registro interno" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
              <b.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{b.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-card rounded-xl border p-4">
          <div className="rounded-lg bg-muted/50 p-3 mb-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Protocolo interno</p>
            <p className="text-xs text-muted-foreground">Registro 2025/TCAD-993</p>
            <p className="text-xs text-muted-foreground">Auditor responsável: <strong>D. Medeiros</strong></p>
            <p className="text-xs text-muted-foreground">Disponível para consulta até 23h59</p>
          </div>

          <div className="text-center mb-3">
            <p className="text-lg font-bold">R$ {TCAD_PRICE.toFixed(2).replace(".", ",")}</p>
            <p className="text-xs text-muted-foreground">Pagamento via PIX • Aprovação instantânea</p>
          </div>

          <Button
            onClick={handleGeneratePix}
            disabled={isLoading || !customer}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-4 h-auto rounded-xl"
          >
            {isLoading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</span>
            ) : (
              "Finalizar Auditoria e Liberar Envio"
            )}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">Confirmação registrada automaticamente e liberação imediata do envio.</p>
        </div>
      </div>

      {/* Back Prevention Popup */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center">
          <DialogDescription className="sr-only">Aviso TCAD</DialogDescription>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
              <AlertTriangle className="h-7 w-7 text-amber-600" />
            </div>
            <DialogTitle className="text-lg font-bold mb-2">Aviso TCAD</DialogTitle>
            <p className="text-sm text-muted-foreground mb-5">
              Finalize a taxa de consolidação para liberar o pedido. Sem essa confirmação o envio fica retido.
            </p>
            <Button
              onClick={() => setPopupOpen(false)}
              variant="outline"
              className="w-full mb-2 rounded-xl py-3 h-auto"
            >
              Permanecer na página
            </Button>
            <Button
              onClick={() => {
                setPopupOpen(false);
                handleGeneratePix();
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-3 h-auto"
            >
              Efetuar pagamento da TCAD
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upsell1;
