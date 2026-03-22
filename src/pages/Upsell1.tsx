import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUrlWithUtm } from "@/utils/utm";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, Clock, Package, Truck, AlertTriangle, Shield } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const NFE_PRICE = 28.99;
const NFE_PRICE_CENTS = 2899;

const Upsell1 = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const orderDataStr = sessionStorage.getItem("orderData");
  const orderData = orderDataStr ? JSON.parse(orderDataStr) : null;
  const customer = orderData?.customer || {
    name: "Cliente", email: "cliente@email.com", phone: "00000000000", cpf: "00000000000",
  };

  const now = new Date();
  const dateStr = `${now.toLocaleDateString("pt-BR")}, ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  // Prevent back navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    window.history.pushState(null, "", window.location.href);
    const handlePop = () => {
      setPopupOpen(true);
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const handleGeneratePix = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const payload = {
        amount: NFE_PRICE_CENTS,
        customer: {
          name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf,
        },
        items: [{
          id: "tenf-nota-fiscal",
          title: "TENF - Taxa de Emissão da Nota Fiscal",
          unitPrice: NFE_PRICE_CENTS,
          quantity: 1,
          tangible: false,
        }],
        shipping: {
          name: customer.name,
          address: { street: "", streetNumber: "", neighborhood: "", city: "", state: "", zipcode: "", country: "br" },
          fee: 0,
        },
        metadata: JSON.stringify({
          type: "upsell_nfe",
          originalOrder: orderData?.product,
          site_id: orderData?.metadata?.site_id || "mesa-dobravel",
          tracking: orderData?.metadata?.tracking || {},
        }),
      };

      const { data, error } = await supabase.functions.invoke("create-pix", { body: payload });

      if (error || !data || data?.error) {
        const errMsg = data?.details?.message || data?.error || error?.message || "Tente novamente.";
        toast({ title: "Erro ao gerar PIX", description: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg), variant: "destructive" });
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("pixData", JSON.stringify(data));
      sessionStorage.setItem("pixReturnTo", "/upsell1");
      navigate(getUrlWithUtm("/pix"));
    } catch (err) {
      console.error("Upsell NFe PIX error:", err);
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#f8f9fa", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="mx-auto max-w-[540px] px-4 py-0">

        {/* Header */}
        <header className="flex items-center justify-center py-4 mt-2">
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-extrabold" style={{ color: "#1a1a2e" }}>N</span>
            <span className="text-2xl font-extrabold" style={{ color: "#f59e0b" }}>F</span>
            <span className="text-2xl font-extrabold" style={{ color: "#22c55e" }}>e</span>
          </div>
        </header>

        {/* Main Card */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <h1 className="text-xl font-bold text-center mb-4" style={{ color: "#1a1a2e" }}>
            Seu pedido foi realizado com sucesso!
          </h1>
          <p className="text-sm text-center leading-relaxed mb-5" style={{ color: "#555" }}>
            Seu pedido foi realizado! Mas para emissão da sua nota fiscal é necessário o pagamento da taxa{" "}
            <strong style={{ color: "#1a1a2e" }}>TENF (Taxa de Emissão da Nota Fiscal)</strong>, no valor único de{" "}
            <strong style={{ color: "#1a1a2e" }}>R$ 28,99</strong>.
          </p>

          {/* Warning Banner */}
          <div className="rounded-xl p-4 text-center mb-6" style={{ background: "#ef4444", color: "#fff" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1">AVISO</p>
            <p className="text-sm">
              O não pagamento da TENF resultará no <strong>cancelamento do pedido e anotação no CPF.</strong>
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-5 relative ml-2 mb-6">
            <div className="absolute left-[15px] top-8 bottom-4 w-px" style={{ background: "#e5e7eb" }} />

            {[
              { icon: <CheckCircle className="h-4 w-4 text-[#16a34a]" />, bg: "rgba(34,197,94,0.12)", title: "Pedido recebido", sub: `Pedido gerado em: ${dateStr}`, subExtra: dateStr, active: true },
              { icon: <Clock className="h-4 w-4 text-muted-foreground" />, bg: "rgba(0,0,0,0.05)", title: "Processando pedido", sub: "Verificando dados do pedido", active: false },
              { icon: <Package className="h-4 w-4 text-muted-foreground" />, bg: "rgba(0,0,0,0.05)", title: "Separando produto", sub: "Produto sendo preparado", active: false },
              { icon: <Truck className="h-4 w-4 text-muted-foreground" />, bg: "rgba(0,0,0,0.05)", title: "Pedido pronto para envio", sub: "Pedido pronto para envio", active: false },
              { icon: <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />, bg: "rgba(245,158,11,0.12)", title: "Taxa de nota fiscal", sub: "Aguardando pagamento da taxa TENF", active: true, highlight: true },
            ].map((step, i) => (
              <div key={i} className={`flex items-start gap-4 relative ${!step.active && !step.highlight ? "opacity-40" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full z-10 flex-shrink-0" style={{ background: step.bg }}>
                  {step.icon}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${step.highlight ? "text-[#f59e0b]" : ""}`} style={{ color: step.highlight ? "#f59e0b" : "#1a1a2e" }}>
                    {step.title}
                  </p>
                  <p className="text-[11px]" style={{ color: "#999" }}>{step.sub}</p>
                  {step.subExtra && i === 0 && <p className="text-[11px]" style={{ color: "#999" }}>{step.subExtra}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Legal Warning */}
          <p className="text-sm leading-relaxed mb-6" style={{ color: "#555" }}>
            <span style={{ color: "#ef4444" }}>O não pagamento da Nota Fiscal resulta no cancelamento do pedido,</span>{" "}
            <strong style={{ color: "#1a1a2e" }}>impossibilitando novas compras por um prazo máximo de 90 dias e anotação no CPF.</strong>
          </p>
        </div>

        {/* PIX Payment Card */}
        <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <p className="text-base font-bold mb-1" style={{ color: "#1a1a2e" }}>Pague via Pix</p>
          <p className="text-xs mb-4" style={{ color: "#999" }}>O pagamento será confirmado imediatamente</p>

          <p className="text-3xl font-extrabold mb-5" style={{ color: "#1a1a2e" }}>R$ 28,99</p>

          <button
            onClick={handleGeneratePix}
            disabled={isLoading}
            className="w-full font-bold text-base py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#fff",
              border: "none",
              cursor: isLoading ? "wait" : "pointer",
              boxShadow: "0 2px 12px rgba(37,99,235,0.35)",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</span>
            ) : (
              "Gerar código PIX"
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield className="h-3.5 w-3.5" style={{ color: "#999" }} />
            <span className="text-[11px]" style={{ color: "#999" }}>Ambiente seguro</span>
          </div>
        </div>
      </div>

      {/* Back Prevention Popup */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #e0e0e0" }}>
          <DialogDescription className="sr-only">Aviso TENF</DialogDescription>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
              <AlertTriangle className="h-7 w-7 text-[#ef4444]" />
            </div>
            <DialogTitle className="text-lg font-bold mb-2" style={{ color: "#1a1a2e" }}>Atenção!</DialogTitle>
            <p className="text-sm mb-5" style={{ color: "#555" }}>
              O pagamento da TENF é obrigatório para emissão da nota fiscal. Sem ele, seu pedido será cancelado.
            </p>
            <button
              onClick={() => setPopupOpen(false)}
              className="w-full mb-2 rounded-xl py-3 text-sm font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #e0e0e0", color: "#555" }}
            >
              Permanecer na página
            </button>
            <button
              onClick={() => { setPopupOpen(false); handleGeneratePix(); }}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", color: "#fff", border: "none" }}
            >
              Pagar taxa agora
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upsell1;
