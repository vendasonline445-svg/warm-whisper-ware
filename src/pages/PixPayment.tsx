import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PIX_CODE = "00020101021226940014br.gov.bcb.pix2572qrs.payhubr.com.br/v2/cobf85d3a1b-4e5c-4d32-bf2d-c83f7a4e8d9252040000530398654058760.005802BR5925MESALAR COMERCIO LTDA6008SAO PAULO62070503***63041B2F";

function usePixCountdown() {
  const [seconds, setSeconds] = useState(600); // 10 min
  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:00`;
}

// Simple QR Code generator using canvas
const QRCodeDisplay = ({ value }: { value: string }) => {
  return (
    <div className="flex flex-col items-center">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(value)}`}
        alt="QR Code PIX"
        className="w-56 h-56"
      />
    </div>
  );
};

const PixPayment = () => {
  const navigate = useNavigate();
  const timer = usePixCountdown();
  const [copied, setCopied] = useState(false);

  const orderData = JSON.parse(sessionStorage.getItem("orderData") || "{}");
  const total = orderData?.product?.total || 87.60;

  const now = new Date();
  const deadline = new Date(now.getTime() + 10 * 60 * 1000);
  const deadlineStr = `${String(deadline.getHours()).padStart(2, "0")}:${String(deadline.getMinutes()).padStart(2, "0")}, ${deadline.getDate()} de ${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][deadline.getMonth()]} ${deadline.getFullYear()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(PIX_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            <QRCodeDisplay value={PIX_CODE} />
          </div>

          <p className="text-xs font-mono text-foreground leading-relaxed break-all mb-4">
            {PIX_CODE.slice(0, 50)}...
          </p>

          <Button
            onClick={handleCopy}
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
