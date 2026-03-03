import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, MapPin, Star, Truck, Shield, Minus, Plus, ChevronRight, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRODUCT_PRICE = 87.60;
const OLD_PRICE = 210.00;
const DISCOUNT_PERCENT = 58;
const DISCOUNT_VALUE = 122.40;

function useCheckoutCountdown() {
  const [seconds, setSeconds] = useState(299); // 4:59
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
  const selectedColor = searchParams.get("color") || "branca";
  const selectedSize = searchParams.get("size") || "180x60cm";
  const timer = useCheckoutCountdown();

  const [quantity, setQuantity] = useState(1);
  const [shipping, setShipping] = useState("padrao");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", cep: "",
    uf: "", cidade: "", bairro: "", endereco: "",
    numero: "", complemento: "", cpf: "",
  });

  const colorLabel = selectedColor === "preta" ? "Preta" : "Branca";
  const colorImage = selectedColor === "preta"
    ? "https://mesa-dobravel-oferta.lovable.app/assets/mesa-preta-detalhes-DZr1TaUa.png"
    : "https://mesa-dobravel-oferta.lovable.app/assets/produto-1-CodPfocH.webp";

  const shippingCost = shipping === "express" ? 14.50 : 0;
  const total = PRODUCT_PRICE * quantity + shippingCost;

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

  const isFormValid = form.name && form.phone && form.email && form.cep &&
    form.uf && form.cidade && form.bairro && form.endereco &&
    form.numero && form.cpf.replace(/\D/g, "").length === 11;

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);

    // Store order data for PIX page
    const orderData = {
      customer: {
        name: form.name,
        email: form.email,
        phone: form.phone.replace(/\D/g, ""),
        cpf: form.cpf.replace(/\D/g, ""),
      },
      address: {
        cep: form.cep.replace(/\D/g, ""),
        uf: form.uf,
        cidade: form.cidade,
        bairro: form.bairro,
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
      },
      product: {
        color: selectedColor,
        size: selectedSize,
        quantity,
        price: PRODUCT_PRICE,
        total,
      },
      shipping: {
        type: shipping,
        cost: shippingCost,
      },
      trackingParameters: Object.fromEntries(
        new URLSearchParams(window.location.search).entries()
      ),
    };

    sessionStorage.setItem("orderData", JSON.stringify(orderData));

    // Simulate API call delay then navigate to PIX page
    setTimeout(() => {
      navigate("/pix");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-[140px]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-[720px] flex items-center gap-3">
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

      <div className="mx-auto max-w-[720px] px-4">
        {/* Address Section */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Endereço de envio
          </div>
          <span className="text-xs font-semibold text-cta cursor-pointer">+ Adicionar endereço</span>
        </div>

        {/* Form */}
        <div className="mt-4 space-y-3">
          <Input
            placeholder="Nome completo"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="rounded-lg border-border h-12 text-sm"
          />
          <div className="relative">
            <Input
              placeholder="Telefone com DDD"
              value={form.phone}
              onChange={(e) => updateField("phone", formatPhone(e.target.value))}
              className="rounded-lg border-border h-12 text-sm pl-12"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+55</span>
          </div>
          <Input
            placeholder="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="rounded-lg border-border h-12 text-sm"
          />
          <Input
            placeholder="CEP"
            value={form.cep}
            onChange={(e) => updateField("cep", formatCEP(e.target.value))}
            className="rounded-lg border-border h-12 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="UF"
              value={form.uf}
              onChange={(e) => updateField("uf", e.target.value.toUpperCase().slice(0, 2))}
              className="rounded-lg border-border h-12 text-sm"
            />
            <Input
              placeholder="Cidade"
              value={form.cidade}
              onChange={(e) => updateField("cidade", e.target.value)}
              className="rounded-lg border-border h-12 text-sm"
            />
          </div>
          <Input
            placeholder="Bairro"
            value={form.bairro}
            onChange={(e) => updateField("bairro", e.target.value)}
            className="rounded-lg border-border h-12 text-sm"
          />
          <Input
            placeholder="Endereço (rua, avenida...)"
            value={form.endereco}
            onChange={(e) => updateField("endereco", e.target.value)}
            className="rounded-lg border-border h-12 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Número"
              value={form.numero}
              onChange={(e) => updateField("numero", e.target.value)}
              className="rounded-lg border-border h-12 text-sm"
            />
            <Input
              placeholder="Complemento"
              value={form.complemento}
              onChange={(e) => updateField("complemento", e.target.value)}
              className="rounded-lg border-border h-12 text-sm"
            />
          </div>
          <Input
            placeholder="CPF (000.000.000-00)"
            value={form.cpf}
            onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
            className="rounded-lg border-border h-12 text-sm"
          />
        </div>

        {/* Divider dashed */}
        <div className="mt-6 border-t-2 border-dashed border-success" />

        {/* Product Info */}
        <div className="mt-4">
          <p className="font-bold text-sm">Fornecedor disponível</p>
          <p className="flex items-center gap-1 text-xs text-success mt-0.5">
            <Star className="h-3 w-3 fill-primary text-primary" /> Muito bem avaliado! 4.8/5,0
          </p>
        </div>

        <div className="mt-3 flex gap-3">
          <img src={colorImage} alt="Produto" className="h-20 w-20 rounded object-contain bg-muted/30 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium leading-snug">Mesa Dobrável Tipo Maleta 180x60cm...</p>
            <p className="text-xs text-muted-foreground">{colorLabel}, {selectedSize}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-badge-green/20 px-1.5 py-0.5 text-[10px] text-badge-green font-semibold">
              <Shield className="h-3 w-3" /> Devolução gratuita
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-bold text-cta">R$ {PRODUCT_PRICE.toFixed(2).replace(".", ",")} 🏷️</span>
              <span className="text-xs line-through text-muted-foreground">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
              <span className="text-xs font-semibold text-cta">-{DISCOUNT_PERCENT}%</span>
            </div>
          </div>
          <div className="flex items-center gap-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-l border text-foreground"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center border-y text-sm font-medium">{quantity}</div>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-r border text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Shipping Options */}
        <div className="mt-6">
          <p className="font-bold text-sm mb-3">Opções de envio</p>
          <div className="space-y-2">
            <button
              onClick={() => setShipping("padrao")}
              className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                shipping === "padrao" ? "border-cta bg-cta/5" : "border-border"
              }`}
            >
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                shipping === "padrao" ? "border-cta" : "border-muted-foreground"
              }`}>
                {shipping === "padrao" && <div className="h-2.5 w-2.5 rounded-full bg-cta" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">Envio Padrão</p>
                <p className="text-xs text-muted-foreground">3 a 7 dias úteis</p>
              </div>
              <span className="font-bold text-sm text-success">Grátis</span>
            </button>
            <button
              onClick={() => setShipping("express")}
              className={`w-full flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                shipping === "express" ? "border-cta bg-cta/5" : "border-border"
              }`}
            >
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                shipping === "express" ? "border-cta" : "border-muted-foreground"
              }`}>
                {shipping === "express" && <div className="h-2.5 w-2.5 rounded-full bg-cta" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">TikTok Express</p>
                <p className="text-xs text-muted-foreground">1 a 3 dias úteis</p>
              </div>
              <span className="font-bold text-sm">R$ 14,50</span>
            </button>
          </div>
        </div>

        {/* Discount */}
        <div className="mt-4 flex items-center justify-between py-3 border-t">
          <div className="flex items-center gap-2 text-sm">
            <span>🏷️</span>
            <span className="font-bold">Desconto especial</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-cta">- R$ {DISCOUNT_VALUE.toFixed(2).replace(".", ",")}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Order Summary */}
        <div className="mt-2 border-t pt-4">
          <p className="font-bold text-sm mb-3">Resumo do pedido</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal do produto ({quantity}x)</span>
              <span>R$ {(PRODUCT_PRICE * quantity).toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de envio</span>
              <span className={shippingCost === 0 ? "text-success font-semibold" : ""}>
                {shippingCost === 0 ? "Grátis" : `R$ ${shippingCost.toFixed(2).replace(".", ",")}`}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-bold">Total</span>
              <div className="text-right">
                <span className="font-bold">R$ {total.toFixed(2).replace(".", ",")}</span>
                <p className="text-xs text-muted-foreground">Impostos inclusos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-4 border-t pt-4">
          <p className="font-bold text-sm mb-3">Forma de pagamento</p>
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <span className="text-lg">💠</span>
              <span className="font-medium text-sm">Pix</span>
            </div>
            <div className="h-5 w-5 rounded-full border-2 border-cta flex items-center justify-center">
              <div className="h-2.5 w-2.5 rounded-full bg-cta" />
            </div>
          </div>
        </div>

        {/* Terms */}
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Ao fazer um pedido, você concorda com os <strong className="text-foreground">Termos de uso e venda</strong> e
          reconhece que leu e concorda com a <strong className="text-foreground">Política de privacidade</strong>.
        </p>

        <p className="mt-3 text-xs text-success flex items-center gap-1">
          😊 Você está economizando R$ {DISCOUNT_VALUE.toFixed(2).replace(".", ",")} nesse pedido.
        </p>
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-[720px] px-4">
          <div className="flex items-center justify-between py-2">
            <span className="font-bold text-sm">Total (1 item)</span>
            <span className="font-bold text-lg text-cta">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-[hsl(350,55%,65%)] hover:bg-[hsl(350,55%,58%)] text-card font-bold text-base py-4 h-auto rounded-2xl mb-3 disabled:opacity-50"
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
