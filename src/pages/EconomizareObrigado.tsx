import { useEffect } from "react";
import { CheckCircle, Package, Truck, Mail } from "lucide-react";
import { trackPageViewOnce } from "@/utils/track-event";

const EconomizareObrigado = () => {
  const orderDataStr = sessionStorage.getItem("orderData");
  const orderData = orderDataStr ? JSON.parse(orderDataStr) : null;
  const customerName = orderData?.customer?.name || "Cliente";
  const customerEmail = orderData?.customer?.email || "";

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageViewOnce("/economizare/obrigado");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-sm border-b px-4 py-3.5">
        <div className="mx-auto max-w-[480px] text-center">
          <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-8 mx-auto" />
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4 py-8">
        {/* Success */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-20 w-20 rounded-full flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg, #0f7b3f 0%, #1a9d5c 100%)" }}>
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Obrigado, {customerName}! 🎉</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[320px]">Seu pedido foi confirmado e já está sendo processado.</p>
        </div>

        {/* Status */}
        <div className="rounded-2xl bg-card border p-6 shadow-sm mb-4">
          <h2 className="font-bold text-sm mb-4">Status do pedido</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100"><CheckCircle className="h-5 w-5 text-[#0f7b3f]" /></div>
              <div><p className="text-sm font-semibold">Pagamento confirmado</p><p className="text-xs text-muted-foreground">Seu pagamento foi recebido com sucesso</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100"><Package className="h-5 w-5 text-[#0f7b3f]" /></div>
              <div><p className="text-sm font-semibold">Pedido em preparação</p><p className="text-xs text-muted-foreground">Estamos separando seu produto</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"><Truck className="h-5 w-5 text-muted-foreground" /></div>
              <div><p className="text-sm font-semibold text-muted-foreground">Envio</p><p className="text-xs text-muted-foreground">Será enviado em até 24h úteis</p></div>
            </div>
          </div>
        </div>

        {/* Email */}
        {customerEmail && (
          <div className="rounded-2xl bg-card border p-5 mb-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#0f7b3f]" />
              <div><p className="text-sm font-semibold">Confirmação enviada</p><p className="text-xs text-muted-foreground">Enviamos os detalhes para {customerEmail}</p></div>
            </div>
          </div>
        )}

        {/* Tracking info */}
        <div className="rounded-2xl bg-green-50 border border-green-200 p-5 mb-6">
          <p className="text-sm font-semibold text-[#0f7b3f] mb-1">📦 Rastreamento</p>
          <p className="text-xs text-muted-foreground">Você receberá o código de rastreio por e-mail e WhatsApp assim que o pedido for despachado.</p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-y-2 pt-4 border-t">
          <p className="font-semibold text-foreground">Economizare LTDA</p>
          <p>CNPJ: 26.682.422/0001-88</p>
          <p>contato@economizare.com</p>
        </div>
      </div>
    </div>
  );
};

export default EconomizareObrigado;
