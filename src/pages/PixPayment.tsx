import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackTikTokEvent } from "@/lib/tiktok-tracking";

function usePixCountdown(expiresAt?: string) {
  const target = useMemo(() => {
    // Always use 30 minutes from now regardless of API expiration
    return Date.now() + 30 * 60 * 1000;
  }, [expiresAt]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Math.max(0, Math.floor((target - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const PixPayment = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pixData = JSON.parse(sessionStorage.getItem("pixData") || "{}");
  const orderData = JSON.parse(sessionStorage.getItem("orderData") || "{}");
  const transactionId = pixData?.id || pixData?.transactionId || "";

  // Poll payment status every 5s and redirect to upsell when paid
  const checkPaymentStatus = useCallback(async () => {
    if (!transactionId) return;
    try {
      const { data, error } = await supabase.functions.invoke("check-pix-status", {
        body: { transactionId },
      });
      if (!error && data?.paid) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        const purchaseValue = orderData?.product?.total || pixData?.amount / 100 || 87.60;
        
        // TikTok tracking: CompletePayment via Pixel + Events API
        trackTikTokEvent({
          event: "CompletePayment",
          properties: {
            content_id: "mesa-dobravel",
            value: purchaseValue,
            currency: "BRL",
          },
        });
        
        navigate("/obrigado");
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [transactionId, navigate]);

  useEffect(() => {
    if (!transactionId) return;
    pollingRef.current = setInterval(checkPaymentStatus, 5000);
    checkPaymentStatus();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [transactionId, checkPaymentStatus]);

  // AddPaymentInfo event on mount
  useEffect(() => {
    trackTikTokEvent({
      event: "AddPaymentInfo",
      properties: {
        content_id: "mesa-dobravel",
        value: total,
        currency: "BRL",
      },
    });
  }, []);

  const pixInfo = pixData?.pix || pixData?.pixQrCode || {};
  const qrCode = pixInfo?.qrcode || pixInfo?.qr_code || pixData?.pix_qr_code || "";
  const pixCode = pixInfo?.qrcode || pixInfo?.qr_code || pixData?.pix_qr_code || "";

  const total = orderData?.product?.total || pixData?.amount / 100 || 87.60;
  const expiresAt = pixInfo?.expirationDate || pixInfo?.expiresAt || pixInfo?.expires_at || pixData?.date_expiration;

  const timer = usePixCountdown(expiresAt);

  const now = new Date();
  const deadline = new Date(now.getTime() + 30 * 60 * 1000);
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const deadlineStr = `${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}, ${deadline.getDate()} de ${meses[deadline.getMonth()]} ${deadline.getFullYear()}`;

  const handleCopy = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
    }
  };

  const qrImageUrl = qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode)}`
    : "";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #f0f2f8 0%, #fdf0f2 50%, #f8f8fa 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-border/40 px-4 py-3.5">
        <div className="mx-auto max-w-[480px] flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-foreground hover:opacity-70 transition-opacity">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-bold text-[15px] tracking-tight">Código do pagamento</p>
          </div>
          <div className="w-5" />
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4">
        {/* Payment Status Card */}
        <div
          className="mt-5 rounded-2xl p-6"
          style={{
            background: "linear-gradient(180deg, #dfe3f0 0%, #f0e8f0 60%, #fce8ec 100%)",
          }}
        >
          <h1 className="text-[22px] font-extrabold leading-tight text-foreground tracking-tight">
            Aguardando o pagamento
          </h1>
          <p className="text-[28px] font-black mt-1 text-foreground tracking-tight">
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="text-sm text-muted-foreground">Vence em</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-3 py-1 text-xs font-bold text-white shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              {timer}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Prazo <strong className="text-foreground">{deadlineStr}</strong>
          </p>
        </div>

        {/* QR Code Card */}
        <div className="mt-5 rounded-2xl bg-white border border-border/30 p-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">💠</span>
            <span className="font-bold text-sm tracking-tight">PIX</span>
          </div>

          <div className="flex justify-center mb-5">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Code PIX" className="w-60 h-60 rounded-lg" />
            ) : (
              <div className="w-60 h-60 flex items-center justify-center bg-muted/30 rounded-lg animate-pulse">
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}
          </div>

          {pixCode && (
            <p className="text-[13px] font-mono text-foreground/80 leading-relaxed break-all mb-5 px-1">
              {pixCode.length > 50 ? pixCode.slice(0, 50) + "..." : pixCode}
            </p>
          )}

          <Button
            onClick={handleCopy}
            disabled={!pixCode}
            className="w-full font-bold text-[15px] py-4 h-auto rounded-2xl shadow-md transition-all active:scale-[0.98] text-white"
            style={{
              background: copied
                ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)"
                : "linear-gradient(135deg, #e8687a 0%, #d4556a 100%)",
            }}
          >
            {copied ? (
              <><Check className="mr-2 h-4 w-4" /> Copiado!</>
            ) : (
              <><Copy className="mr-2 h-4 w-4" /> Copiar</>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <p className="mt-5 text-xs text-muted-foreground text-center leading-relaxed px-2">
          Para acessar esta página no app, abra <strong className="text-foreground">Loja</strong> &gt; <strong className="text-foreground">Pedidos</strong> &gt; <strong className="text-foreground">Sem pagamento</strong> &gt;
          <span className="text-[#e8687a] font-semibold"> Visualizar o código</span>
        </p>

        {/* How to pay */}
        <div className="mt-6 rounded-2xl bg-white border border-border/30 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
          <h3 className="font-bold text-sm mb-2 tracking-tight">Como fazer pagamentos com PIX?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copie o código de pagamento acima, selecione Pix no seu app de internet ou de banco e cole o código.
          </p>
        </div>

        {/* Warning */}
        <div className="mt-4 mb-10 rounded-2xl bg-[#fef9ee] border border-[#f5dea0] p-5 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
          <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-[#c9952a]" /> Atenção:
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Os bancos reforçaram a segurança do Pix e podem exibir avisos preventivos. Não se preocupe, sua transação está protegida.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixPayment;
