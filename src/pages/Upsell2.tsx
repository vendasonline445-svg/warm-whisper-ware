import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUrlWithUtm } from "@/utils/utm";
import { toast } from "@/hooks/use-toast";
import { Loader2, Zap, Truck, Clock } from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

type ShippingOption = {
  id: string;
  label: string;
  sublabel: string;
  days: string;
  price: number;
  priceCents: number;
  priceLabel: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  recommended?: boolean;
  free?: boolean;
};

const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "expresso",
    label: "Envio Expresso",
    sublabel: "Receba em até",
    days: "3 dias úteis",
    price: 22.99,
    priceCents: 2299,
    priceLabel: "R$ 22,99",
    badge: "RECOMENDADO",
    badgeColor: "#16a34a",
    icon: <Zap className="h-5 w-5 text-white" />,
    recommended: true,
  },
  {
    id: "padrao",
    label: "Envio Padrão",
    sublabel: "Receba em até",
    days: "7 dias úteis",
    price: 15.99,
    priceCents: 1599,
    priceLabel: "R$ 15,99",
    icon: <Truck className="h-5 w-5 text-white" />,
  },
  {
    id: "economico",
    label: "Envio Econômico",
    sublabel: "Entrega em até",
    days: "30 dias úteis",
    price: 0,
    priceCents: 0,
    priceLabel: "Grátis",
    badge: "SELECIONADO",
    badgeColor: "#ca8a04",
    icon: <Clock className="h-5 w-5 text-white" />,
    free: true,
  },
];

const Upsell2 = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("economico");
  const [isLoading, setIsLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const orderDataStr = sessionStorage.getItem("orderData");
  const orderData = orderDataStr ? JSON.parse(orderDataStr) : null;
  const customer = orderData?.customer || {
    name: "Cliente", email: "cliente@email.com", phone: "00000000000", cpf: "00000000000",
  };

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

  const handleContinue = async () => {
    const option = SHIPPING_OPTIONS.find((o) => o.id === selected);
    if (!option) return;

    // Free shipping → go directly to obrigado
    if (option.free) {
      navigate(getUrlWithUtm("/obrigado"));
      return;
    }

    // Paid shipping → generate PIX
    if (isLoading) return;
    setIsLoading(true);

    try {
      const payload = {
        amount: option.priceCents,
        customer: {
          name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf,
        },
        items: [{
          id: `envio-${option.id}`,
          title: `${option.label} - Frete Prioritário`,
          unitPrice: option.priceCents,
          quantity: 1,
          tangible: false,
        }],
        shipping: {
          name: customer.name,
          address: { street: "", streetNumber: "", neighborhood: "", city: "", state: "", zipcode: "", country: "br" },
          fee: 0,
        },
        metadata: JSON.stringify({
          type: "upsell_envio",
          shipping_option: option.id,
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
      sessionStorage.setItem("pixReturnTo", "/upsell2");
      navigate(getUrlWithUtm("/pix"));
    } catch (err) {
      console.error("Upsell2 PIX error:", err);
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const selectedOption = SHIPPING_OPTIONS.find((o) => o.id === selected);
  const buttonLabel = selectedOption?.free
    ? "Continuar com envio econômico"
    : `Pagar ${selectedOption?.priceLabel} via PIX`;

  return (
    <div className="min-h-screen" style={{ background: "#f8f9fa", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Header Bar */}
      <div className="py-3 text-center text-xs font-bold uppercase tracking-widest" style={{ background: "#dc2626", color: "#fff", letterSpacing: "0.15em" }}>
        COMUNICADO OFICIAL — LOGÍSTICA
      </div>

      <div className="mx-auto max-w-[540px] px-4 py-8">
        <h1 className="text-2xl font-extrabold text-center mb-6" style={{ color: "#1a1a2e" }}>ATENÇÃO</h1>

        <p className="text-sm leading-relaxed text-center mb-6" style={{ color: "#555" }}>
          Devido a <strong style={{ color: "#1a1a2e" }}>grande demanda de pedidos</strong> neste período, alguns envios irão sofrer{" "}
          <strong style={{ color: "#1a1a2e" }}>atrasos no processamento</strong>.
        </p>

        <p className="text-sm leading-relaxed text-center mb-8" style={{ color: "#555" }}>
          Nessas condições, o prazo de entrega do envio padrão <strong style={{ color: "#1a1a2e" }}>pode se estender</strong>, em até{" "}
          <strong style={{ color: "#1a1a2e" }}>30 dias</strong>.
        </p>

        <p className="text-sm font-semibold mb-4" style={{ color: "#1a1a2e" }}>
          Selecione uma opção de envio para seu pedido:
        </p>

        {/* Shipping Options */}
        <div className="space-y-3 mb-6">
          {SHIPPING_OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            const borderColor = isSelected ? (option.free ? "#ca8a04" : "#22c55e") : "#e5e7eb";
            const bgColor = isSelected ? (option.free ? "rgba(202,138,4,0.04)" : "rgba(34,197,94,0.04)") : "#fff";

            return (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className="w-full flex items-center gap-4 rounded-xl p-4 text-left transition-all"
                style={{ background: bgColor, border: `2px solid ${borderColor}` }}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: option.recommended ? "#2563eb" : option.free ? "#ca8a04" : "#3b82f6" }}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold" style={{ color: "#1a1a2e" }}>{option.label}</span>
                    {option.badge && (
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{ background: `${option.badgeColor}15`, color: option.badgeColor }}
                      >
                        {option.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#999" }}>
                    {option.sublabel} <strong style={{ color: "#555" }}>{option.days}</strong>
                  </p>
                </div>
                <span
                  className="text-base font-extrabold flex-shrink-0"
                  style={{ color: option.free ? "#16a34a" : "#dc2626" }}
                >
                  {option.priceLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Info box */}
        <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.15)" }}>
          <p className="text-sm text-center leading-relaxed" style={{ color: "#555" }}>
            Caso deseje receber seu pedido com mais rapidez, você pode escolher o{" "}
            <strong style={{ color: "#1a1a2e" }}>envio prioritário</strong>, com prazo de entrega de até{" "}
            <strong style={{ color: "#1a1a2e" }}>3 dias</strong>.
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleContinue}
          disabled={isLoading}
          className="w-full font-bold text-base py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70"
          style={{
            background: selectedOption?.free
              ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
              : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
            color: selectedOption?.free ? "#1a1a2e" : "#fff",
            border: "none",
            cursor: isLoading ? "wait" : "pointer",
            boxShadow: selectedOption?.free
              ? "0 2px 12px rgba(245,158,11,0.35)"
              : "0 2px 12px rgba(22,163,74,0.35)",
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</span>
          ) : (
            buttonLabel
          )}
        </button>

        <p className="text-[11px] text-center mt-3" style={{ color: "#999" }}>
          Opção de envio rápido disponível por tempo limitado.
        </p>
      </div>

      {/* Back Prevention Popup */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center" style={{ background: "#fff", border: "1px solid #e0e0e0" }}>
          <DialogDescription className="sr-only">Aviso de envio</DialogDescription>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
              <Truck className="h-7 w-7 text-[#ef4444]" />
            </div>
            <DialogTitle className="text-lg font-bold mb-2" style={{ color: "#1a1a2e" }}>Selecione seu envio</DialogTitle>
            <p className="text-sm mb-5" style={{ color: "#555" }}>
              Escolha uma opção de envio para finalizar seu pedido e receber o mais rápido possível.
            </p>
            <button
              onClick={() => setPopupOpen(false)}
              className="w-full rounded-xl py-3 text-sm font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #e0e0e0", color: "#555" }}
            >
              Voltar e escolher
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upsell2;
