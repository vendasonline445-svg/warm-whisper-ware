import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, AlertTriangle, Check, RefreshCw, Clock } from "lucide-react";
import { getUrlWithUtm } from "@/utils/utm";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackFunnelEvent } from "@/lib/tracking-hub";
import { trackPageViewOnce } from "@/utils/track-event";

const PIX_TIMEOUT_MINUTES = 15;

function usePixCountdown() {
  const target = useMemo(() => Date.now() + PIX_TIMEOUT_MINUTES * 60 * 1000, []);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = Math.max(0, Math.floor((target - now) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return { display: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, expired: diff === 0 };
}

const EconomizarePix = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showCheckBtn, setShowCheckBtn] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pixData = JSON.parse(sessionStorage.getItem("pixData") || "{}");
  const orderData = JSON.parse(sessionStorage.getItem("orderData") || "{}");
  const transactionId = pixData?.id || pixData?.transactionId || "";
  const { display: timer, expired } = usePixCountdown();

  useEffect(() => { if (expired && pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } }, [expired]);

  const checkPaymentStatus = useCallback(async () => {
    if (!transactionId || paid) return;
    setChecking(true);
    try {
      const { data } = await supabase.functions.invoke("check-pix-status", { body: { transactionId } });
      if (data?.status === "approved" || data?.status === "paid") {
        setPaid(true);
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
        trackFunnelEvent({ event: "purchase", value: orderData?.product?.total || 0, properties: { transaction_id: transactionId, payment_method: "pix" }, userData: orderData?.customer ? { email: orderData.customer.email, phone: orderData.customer.phone, externalId: orderData.customer.cpf } : undefined });
        setTimeout(() => navigate(getUrlWithUtm("/economizare/obrigado")), 2000);
      }
    } catch {} finally { setChecking(false); }
  }, [transactionId, paid, navigate, orderData]);

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageViewOnce("/economizare/pix");
    if (transactionId) {
      pollingRef.current = setInterval(checkPaymentStatus, 5000);
      setTimeout(() => setShowCheckBtn(true), 10000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [transactionId, checkPaymentStatus]);

  // Preload QR image
  useEffect(() => {
    if (pixData?.qrCodeImage || pixData?.qr_code_image) {
      const img = new Image();
      img.src = pixData.qrCodeImage || pixData.qr_code_image;
    }
  }, [pixData]);

  const qrCodeImage = pixData?.qrCodeImage || pixData?.qr_code_image;
  const qrCode = pixData?.qrCode || pixData?.qr_code || pixData?.pixCopiaECola || "";

  const handleCopy = () => {
    if (qrCode) { navigator.clipboard.writeText(qrCode); setCopied(true); setTimeout(() => setCopied(false), 3000); }
  };

  if (paid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0f7b3f, #1a9d5c)" }}>
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Pagamento Confirmado! 🎉</h1>
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-sm border-b px-4 py-3.5">
        <div className="mx-auto max-w-[480px] flex items-center justify-center">
          <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-8" />
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4 py-6">
        {/* Timer */}
        <div className={`rounded-2xl p-4 mb-6 text-center ${expired ? "bg-destructive/10 border border-destructive/20" : "bg-green-50 border border-green-200"}`}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className={`h-4 w-4 ${expired ? "text-destructive" : "text-[#0f7b3f]"}`} />
            <span className={`text-sm font-semibold ${expired ? "text-destructive" : "text-[#0f7b3f]"}`}>{expired ? "Tempo esgotado" : "Aguardando pagamento"}</span>
          </div>
          <p className={`text-3xl font-mono font-extrabold ${expired ? "text-destructive" : "text-[#0f7b3f]"}`}>{timer}</p>
          {!expired && <p className="text-xs text-muted-foreground mt-1">O código PIX expira em {PIX_TIMEOUT_MINUTES} minutos</p>}
        </div>

        {expired ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Código PIX expirado</h2>
            <p className="text-sm text-muted-foreground mb-6">Gere um novo código para finalizar sua compra.</p>
            <Button onClick={() => navigate(getUrlWithUtm("/economizare/checkout"))} className="bg-[#0f7b3f] hover:bg-[#0d6b36] text-white">Gerar novo código</Button>
          </div>
        ) : (
          <>
            {/* QR Code */}
            {qrCodeImage && (
              <div className="flex justify-center mb-6">
                <div className="bg-white rounded-2xl p-4 shadow-sm border">
                  <img src={qrCodeImage} alt="QR Code PIX" className="w-52 h-52 object-contain" />
                </div>
              </div>
            )}

            {/* Copy code */}
            <div className="mb-6">
              <p className="text-sm font-semibold mb-2 text-center">Ou copie o código PIX:</p>
              <div className="relative">
                <div className="bg-muted rounded-xl p-3 pr-12 text-xs font-mono break-all max-h-20 overflow-y-auto">{qrCode || "Carregando..."}</div>
                <button onClick={handleCopy} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0f7b3f] text-white rounded-lg p-2">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              {copied && <p className="text-center text-xs text-[#0f7b3f] font-semibold mt-2">✓ Código copiado!</p>}
            </div>

            {/* Instructions */}
            <div className="rounded-2xl bg-card border p-5 mb-6">
              <h3 className="font-bold text-sm mb-3">Como pagar:</h3>
              <ol className="space-y-3 text-sm">
                {["Abra o app do seu banco", "Escolha pagar via PIX (copia e cola)", "Cole o código copiado acima", "Confirme o pagamento"].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f7b3f] text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span className="text-foreground/80">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {showCheckBtn && (
              <Button onClick={checkPaymentStatus} disabled={checking} variant="outline" className="w-full mb-4">
                {checking ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Verificando...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Já paguei, verificar</>}
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground">O pagamento é detectado automaticamente em poucos segundos após a confirmação.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default EconomizarePix;
