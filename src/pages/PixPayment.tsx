import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

function usePixCountdown(expiresAt?: string) {
  const target = useMemo(() => {
    if (expiresAt) return new Date(expiresAt).getTime();
    return Date.now() + 10 * 60 * 1000;
  }, [expiresAt]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const diff = Math.max(0, Math.floor((target - now) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:00`;
}

const PixPayment = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Get data from sessionStorage
  const pixData = JSON.parse(sessionStorage.getItem("pixData") || "{}");
  const orderData = JSON.parse(sessionStorage.getItem("orderData") || "{}");

  // Extract PIX info from SkalePay response
  const pixInfo = pixData?.pix || pixData?.pixQrCode || {};
  const qrCode = pixInfo?.qrcode || pixInfo?.qr_code || pixData?.pix_qr_code || "";
  const pixCode = pixInfo?.qrcode || pixInfo?.qr_code || pixData?.pix_qr_code || "";

  const total = orderData?.product?.total || pixData?.amount / 100 || 87.60;
  const expiresAt = pixInfo?.expiresAt || pixInfo?.expires_at || pixData?.date_expiration;

  const timer = usePixCountdown(expiresAt);

  const now = new Date();
  const deadline = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + 10 * 60 * 1000);
  const deadlineStr = `${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}, ${deadline.getDate()} de ${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][deadline.getMonth()]} ${deadline.getFullYear()}`;

  const handleCopy = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // QR code image URL
  const qrImageUrl = qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-[720px] flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-bold text-sm">Código do pagamento</p>
          </div>
          <div className="w-5" />
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-4">
        {/* Payment Status */}
        <div className="mt-6 rounded-2xl bg-gradient-to-b from-[hsl(220,30%,92%)] to-card p-6">
          <h1 className="text-xl font-bold leading-tight">Aguardando o pagamento</h1>
          <p className="text-2xl font-black mt-1">R$ {total.toFixed(2).replace(".", ",")}</p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Vence em</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-0.5 text-xs font-bold text-success-foreground">
              🟢 {timer}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Prazo <strong>{deadlineStr}</strong>
          </p>
        </div>

        {/* QR Code Card */}
        <div className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💠</span>
            <span className="font-bold text-sm">PIX</span>
          </div>

          <div className="flex justify-center mb-4">
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Code PIX" className="w-56 h-56" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            )}
          </div>

          {pixCode && (
            <p className="text-xs font-mono text-foreground leading-relaxed break-all mb-4">
              {pixCode.length > 60 ? pixCode.slice(0, 60) + "..." : pixCode}
            </p>
          )}

          <Button
            onClick={handleCopy}
            disabled={!pixCode}
            className="w-full bg-[hsl(350,55%,65%)] hover:bg-[hsl(350,55%,58%)] text-card font-bold text-base py-3.5 h-auto rounded-2xl"
          >
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>

        {/* Instructions */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Para acessar esta página no app, abra <strong>Loja</strong> &gt; <strong>Pedidos</strong> &gt; <strong>Sem pagamento</strong> &gt;
          <span className="text-cta font-semibold"> Visualizar o código</span>
        </p>

        {/* How to pay */}
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <h3 className="font-bold text-sm mb-2">Como fazer pagamentos com PIX?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copie o código de pagamento acima, selecione Pix no seu app de internet ou de banco e cole o código.
          </p>
        </div>

        {/* Warning */}
        <div className="mt-4 mb-8 rounded-2xl border border-[hsl(45,80%,70%)] bg-[hsl(45,80%,95%)] p-5">
          <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-4 w-4 text-[hsl(45,80%,40%)]" /> Atenção:
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
