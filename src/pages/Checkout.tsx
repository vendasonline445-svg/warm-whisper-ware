import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, MapPin, Star, Truck, Shield, Minus, Plus, ChevronRight, Check, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRODUCT_PRICE = 87.60;
const OLD_PRICE = 210.00;
const BASE_DISCOUNT_VALUE = 122.40;

function useCheckoutCountdown() {
  const [seconds, setSeconds] = useState(299);
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

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedColor = searchParams.get("color") || searchParams.get("cor") || "branca";
  const selectedSize = searchParams.get("size") || searchParams.get("tamanho") || "180x60cm";
  const couponParam = searchParams.get("cupom") || searchParams.get("coupon") || "";
  const hasCoupon = couponParam.toUpperCase() === "VOLTA25";
  const couponDiscount = hasCoupon ? 0.25 : 0;
  const timer = useCheckoutCountdown();

  const [quantity, setQuantity] = useState(1);
  const [shipping, setShipping] = useState("padrao");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressOpen, setAddressOpen] = useState(true);
  const [cpfError, setCpfError] = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", email: "", cep: "",
    uf: "", cidade: "", bairro: "", endereco: "",
    numero: "", complemento: "", cpf: "",
  });

  const colorLabel = selectedColor === "preta" ? "Preta" : "Branca";
  const colorImage = selectedColor === "preta"
    ? "/images/mesa-preta-popup.png"
    : "/images/mesa-branca-popup.png";

  const shippingCost = shipping === "express" ? 14.50 : 0;
  const subtotal = PRODUCT_PRICE * quantity;
  const couponAmount = hasCoupon ? Math.round(subtotal * couponDiscount * 100) / 100 : 0;
  const total = subtotal - couponAmount + shippingCost;
  const totalSavings = BASE_DISCOUNT_VALUE + couponAmount;

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatCPF = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const validateCPF = (cpf: string): boolean => {
    const nums = cpf.replace(/\D/g, "");
    if (nums.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(nums)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(nums[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(nums[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(nums[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(nums[10]);
  };

  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  };

  const formatCEP = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  };

  const [cepLoading, setCepLoading] = useState(false);

  const buscarCEP = async (cep: string) => {
    const nums = cep.replace(/\D/g, "");
    if (nums.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${nums}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          uf: data.uf || "",
        }));
      }
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    } finally {
      setCepLoading(false);
    }
  };

  const isAddressComplete = form.cep && form.uf && form.cidade && form.bairro && form.endereco && form.numero;
  const isCpfValid = validateCPF(form.cpf);

  useEffect(() => {
    if (isAddressComplete && form.name && form.phone && form.email && isCpfValid) {
      setAddressOpen(false);
    }
  }, [form.cpf, isAddressComplete, isCpfValid]);

  useEffect(() => {
    const nums = form.cpf.replace(/\D/g, "");
    if (nums.length === 11 && !validateCPF(form.cpf)) {
      setCpfError("CPF inválido. Verifique os dígitos.");
    } else {
      setCpfError("");
    }
  }, [form.cpf]);

  const isFormValid = form.name && form.phone && form.email && form.cep &&
    form.uf && form.cidade && form.bairro && form.endereco &&
    form.numero && isCpfValid;

  const canSubmit = !!isFormValid;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const totalAmountInCents = Math.round(total * 100);

      const payload = {
        amount: totalAmountInCents,
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone.replace(/\D/g, ""),
          cpf: form.cpf.replace(/\D/g, ""),
        },
        items: [
          {
            id: "mesa-dobravel",
            title: `Mesa Dobrável ${colorLabel} ${selectedSize}`,
            unitPrice: Math.round((subtotal - couponAmount) * 100),
            quantity,
            tangible: true,
          },
        ],
        shipping: {
          name: form.name,
          address: {
            street: form.endereco,
            streetNumber: form.numero,
            neighborhood: form.bairro,
            city: form.cidade,
            state: form.uf,
            zipcode: form.cep.replace(/\D/g, ""),
            country: "br",
          },
          fee: Math.round(shippingCost * 100),
        },
        metadata: JSON.stringify({
          color: selectedColor,
          size: selectedSize,
          coupon: hasCoupon ? "VOLTA25" : null,
          couponDiscount: couponAmount,
          tracking: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
        }),
      };

      console.log("Sending PIX payload:", JSON.stringify(payload));
      const { data, error } = await supabase.functions.invoke("create-pix", {
        body: payload,
      });

      console.log("PIX response data:", JSON.stringify(data));
      console.log("PIX response error:", error);

      if (error || !data || data?.error) {
        const errMsg = data?.details?.message || data?.error || error?.message || "Tente novamente.";
        console.error("Edge function error:", error, data);
        toast({ title: "Erro ao gerar PIX", description: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg), variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      sessionStorage.setItem("pixData", JSON.stringify(data));
      sessionStorage.setItem("orderData", JSON.stringify({
        customer: payload.customer,
        product: { color: selectedColor, size: selectedSize, quantity, price: PRODUCT_PRICE, total, coupon: hasCoupon ? "VOLTA25" : null, couponDiscount: couponAmount },
        shipping: { type: shipping, cost: shippingCost },
      }));

      navigate("/pix");
    } catch (err) {
      console.error("Submit error:", err);
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-[140px]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-[480px] flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center">
            <p className="font-bold text-sm">Resumo do pedido</p>
            <p className="text-xs text-success flex items-center justify-center gap-1">
              <Shield className="h-3 w-3" /> Seus dados estão seguros conosco
            </p>
          </div>
          <div className="w-5" />
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4">
        {/* Address Section - Collapsible */}
        <button
          onClick={() => setAddressOpen((v) => !v)}
          className="mt-4 w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Endereço de envio
          </div>
          {isAddressComplete ? (
            <span className="flex items-center gap-1 text-xs text-success font-semibold">
              <Check className="h-3.5 w-3.5" /> {form.endereco.length > 20 ? form.endereco.slice(0, 20) + "..." : form.endereco}
            </span>
          ) : (
            <span className="text-xs font-semibold text-cta">+ Adicionar endereço</span>
          )}
        </button>

        {/* Form */}
        {addressOpen && (
        <div className="mt-4 space-y-3">
          <Input placeholder="Nome completo" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
          <div className="relative">
            <Input placeholder="Telefone com DDD" value={form.phone} onChange={(e) => updateField("phone", formatPhone(e.target.value))} className="rounded-lg border-border h-12 text-sm pl-12" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+55</span>
          </div>
          <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
          <div className="relative">
            <Input placeholder="CEP" value={form.cep} onChange={(e) => { const formatted = formatCEP(e.target.value); updateField("cep", formatted); const nums = formatted.replace(/\D/g, ""); if (nums.length === 8) buscarCEP(nums); }} className="rounded-lg border-border h-12 text-sm" />
            {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Buscando...</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="UF" value={form.uf} readOnly={!!form.uf && !cepLoading} onChange={(e) => updateField("uf", e.target.value.toUpperCase().slice(0, 2))} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
            <Input placeholder="Cidade" value={form.cidade} readOnly={!!form.cidade && !cepLoading} onChange={(e) => updateField("cidade", e.target.value)} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
          </div>
          <Input placeholder="Bairro" value={form.bairro} readOnly={!!form.bairro && !cepLoading} onChange={(e) => updateField("bairro", e.target.value)} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
          <Input placeholder="Endereço (rua, avenida...)" value={form.endereco} readOnly={!!form.endereco && !cepLoading} onChange={(e) => updateField("endereco", e.target.value)} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Número" value={form.numero} onChange={(e) => updateField("numero", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
            <Input placeholder="Complemento" value={form.complemento} onChange={(e) => updateField("complemento", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
          </div>
          <div>
            <Input placeholder="CPF (000.000.000-00)" value={form.cpf} onChange={(e) => updateField("cpf", formatCPF(e.target.value))} className={`rounded-lg border-border h-12 text-sm ${cpfError ? "border-destructive" : ""}`} />
            {cpfError && <p className="text-xs text-destructive mt-1 font-medium">{cpfError}</p>}
          </div>
        </div>
        )}

        {/* Divider */}
        <div className="mt-6 border-t-2 border-dashed border-success" />
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-[480px] px-4">
          <div className="flex items-center justify-between py-2">
            <span className="font-bold text-sm">Total (1 item)</span>
            <span className="font-bold text-lg text-cta">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className={`w-full font-bold text-base py-4 h-auto rounded-2xl mb-3 text-card transition-all duration-300 ${
              canSubmit && !isSubmitting
                ? "bg-[hsl(350,60%,55%)] hover:bg-[hsl(350,60%,48%)] shadow-lg shadow-[hsl(350,60%,55%)]/30 scale-[1.01]"
                : "bg-[hsl(350,30%,75%)] opacity-60 cursor-not-allowed"
            }`}
          >
            <div className="text-center">
              <span>{isSubmitting ? "Processando..." : "Fazer pedido"}</span>
              <p className="text-xs font-normal opacity-80 mt-0.5">O cupom expira em {timer}</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
