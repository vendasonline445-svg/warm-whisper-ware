import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trackTikTokEvent } from "@/lib/tiktok-tracking";
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Check,
  Truck, Shield, Package, Clock, Zap, CheckCircle2, X,
  Store, MessageCircle, Share2, MoreHorizontal, Gift, Copy, Camera, MapPin,
  CreditCard, Tag, ShieldCheck, Ticket, Flag, ChevronRight, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const PRODUCT_ID = "mesa-dobravel-180x60";
const PRICE = 87.60;
const OLD_PRICE = 199.90;
const DISCOUNT = 56;

const productImages = [
  "/images/mesa-branca-principal.webp",
  "/images/mesa-preta-principal.webp",
  "/images/desc-tamanho.webp",
  "/images/desc-superficie3d.webp",
  "/images/desc-portatil.webp",
  "/images/desc-espaco.webp",
  "/images/desc-transporte.webp",
];

const colorImages = {
  branca: "/images/mesa-branca-popup.webp",
  preta: "/images/mesa-preta-popup.webp",
};

const sizes = ["120x60cm", "150x60cm", "180x60cm", "240x60cm"];

const reviews = [
  {
    name: "Carla S.",
    avatar: "/images/avatar-carla.webp",
    text: "A mesa é bem grande, boa demais! Espaçosa e super prática — montei em segundos e usei para o churrasco com a família toda. Muito resistente, suporta bastante peso sem tremer!",
    rating: 5,
    photos: ["/images/review-carla-1.webp", "/images/review-carla-2.webp"],
  },
  {
    name: "Patrícia F.",
    avatar: "/images/avatar-patricia.webp",
    text: "Ela é muito prática. Material bom, custo muito bom. Amei, pretendo comprar outra!",
    rating: 5,
    photos: ["/images/review-patricia-1.webp", "/images/review-patricia-2.webp"],
  },
  {
    name: "Raquel M.",
    avatar: "/images/avatar-raquel.webp",
    text: "Ela é linda, bem resistente. Me surpreendi com a qualidade, vou usar muito! Chegou no dia certinho.",
    rating: 5,
    photos: ["/images/review-raquel-1.webp", "/images/review-raquel-2.webp", "/images/review-raquel-3.webp"],
  },
  {
    name: "Karine Porto",
    avatar: "/images/avatar-karine.webp",
    text: "Muito boa, bem reforçada. Veio bem embalada na caixa, sem avarias. Gostei muito da mesa!",
    rating: 5,
    photos: ["/images/review-karine-1.webp", "/images/review-karine-2.webp", "/images/review-karine-3.webp"],
  },
  {
    name: "Juliana P.",
    avatar: "/images/avatar-juliana.webp",
    text: "Adorei a minha compra! Chegou no prazo, veio bem embalada. A mesa é linda e muito resistente. Ideal para quem tem pouco espaço, ela é bem fácil para montar. Gosteiii muitoooooo! 😍",
    rating: 5,
    photos: ["/images/review-juliana-1.webp", "/images/review-juliana-2.webp"],
  },
];

const faqs = [
  { q: "Qual o peso que a mesa suporta?", a: "A mesa suporta até 100kg de peso distribuído sobre o tampo, com total segurança e estabilidade." },
  { q: "De que material é feita?", a: "Tampo em HDPE (plástico de alta densidade) e estrutura em aço tubular com pintura epóxi anticorrosiva." },
  { q: "Como funciona o sistema de maleta?", a: "A mesa dobra ao meio e possui uma alça ergonômica, transformando-se em uma maleta compacta fácil de transportar." },
  { q: "Posso usar ao ar livre na chuva?", a: "Sim! O material HDPE é resistente a sol, chuva e umidade. A estrutura possui pintura anticorrosiva." },
  { q: "Qual o prazo de entrega?", a: "Receba em 5 a 8 dias úteis após confirmação do pagamento. Pedidos até 14h são despachados no mesmo dia." },
  { q: "Tem garantia?", a: "Sim! 1 ano de garantia contra defeitos de fabricação." },
];

function useCountdown() {
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
  return time;
}

const fmt = (n: number) => String(n).padStart(2, "0");

const Index = () => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const swiping = useRef(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("180x60cm");
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [colorModalClosing, setColorModalClosing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorModalMode, setColorModalMode] = useState<'cart' | 'buy'>('cart');
  const [modalQty, setModalQty] = useState(1);
  const [flyingDot, setFlyingDot] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitShown, setExitShown] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [reportStep, setReportStep] = useState<'menu' | 'reasons' | 'form' | 'done'>('menu');
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [cartClosing, setCartClosing] = useState(false);
  const [cartItem, setCartItem] = useState<{color: string; size: string; quantity: number} | null>(() => {
    try {
      const saved = localStorage.getItem('mesalar_cart');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const updateCart = (item: {color: string; size: string; quantity: number} | null) => {
    setCartItem(item);
    if (item) localStorage.setItem('mesalar_cart', JSON.stringify(item));
    else localStorage.removeItem('mesalar_cart');
  };

  const closeCart = () => {
    setCartClosing(true);
    setTimeout(() => { setCartOpen(false); setCartClosing(false); }, 300);
  };
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeClosing, setStoreClosing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClosing, setChatClosing] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'Olá! Como posso te ajudar com informações sobre a Mesa Dobrável Mesalar?' }
  ]);
  const [chatTyping, setChatTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping]);

  const closeStore = () => {
    setStoreClosing(true);
    setTimeout(() => { setStoreOpen(false); setStoreClosing(false); }, 300);
  };

  const closeChat = () => {
    setChatClosing(true);
    setTimeout(() => { setChatOpen(false); setChatClosing(false); }, 300);
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim() || chatTyping) return;
    const userMsg = text.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatTyping(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role === 'bot' ? 'assistant' as const : 'user' as const,
        content: m.text,
      }));
      history.push({ role: 'user', content: userMsg });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/product-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      const data = await resp.json();
      setChatTyping(false);

      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'bot', text: data.error || 'Desculpe, não consegui responder. Tente novamente!' }]);
      }
    } catch {
      setChatTyping(false);
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Erro de conexão. Tente novamente!' }]);
    }
  };

  const handleQuickQuestion = (faq: { q: string; a: string }) => {
    sendChatMessage(faq.q);
  };
  const countdown = useCountdown();

  // ViewContent event on mount
  useEffect(() => {
    trackTikTokEvent({
      event: "ViewContent",
      properties: {
        content_type: "product",
        content_id: "mesa-dobravel",
        content_name: "Mesa Dobrável 180x60cm",
        value: PRICE,
        currency: "BRL",
        contents: [{ content_id: "mesa-dobravel", quantity: 1 }],
      },
    });
  }, []);
  useEffect(() => {
    if (exitShown) return; // Stop intercepting once popup was shown

    // Desktop: detect mouse leaving viewport from the top (exit intent)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && e.relatedTarget === null) {
        setExitModalOpen(true);
        setExitShown(true);
      }
    };

    // Back button detection — wait before registering to avoid false triggers
    let popstateReady = false;
    const popstateReadyTimer = setTimeout(() => {
      popstateReady = true;
    }, 2000);

    const handlePopState = () => {
      if (!popstateReady) {
        window.history.pushState(null, "", window.location.href);
        return;
      }
      window.history.pushState(null, "", window.location.href);
      setExitModalOpen(true);
      setExitShown(true);
    };

    window.history.pushState(null, "", window.location.href);

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("popstate", handlePopState);
      clearTimeout(popstateReadyTimer);
    };
  }, [exitShown]);

  const openColorModal = (mode: 'cart' | 'buy') => {
    setSelectedColor(null);
    setModalQty(1);
    setColorModalMode(mode);
    setColorModalOpen(true);
    trackTikTokEvent({
      event: "AddToCart",
      properties: {
        content_type: "product",
        content_id: "mesa-dobravel",
        content_name: "Mesa Dobrável 180x60cm",
        value: PRICE,
        currency: "BRL",
        contents: [{ content_id: "mesa-dobravel", quantity: 1 }],
      },
    });
  };

  const closeColorModal = () => {
    setColorModalClosing(true);
    setTimeout(() => { setColorModalOpen(false); setColorModalClosing(false); }, 300);
  };

  const nav = useNavigate();

  const handleColorConfirm = () => {
    if (!selectedColor) return;

    if (colorModalMode === 'buy') {
      updateCart({ color: selectedColor, size: selectedSize, quantity: modalQty });
      const params = new URLSearchParams(window.location.search);
      params.set("color", selectedColor);
      params.set("size", selectedSize);
      params.set("qty", modalQty.toString());
      nav(`/checkout?${params.toString()}`);
    } else {
      // Add to cart mode - animate dot to cart icon
      updateCart({ color: selectedColor, size: selectedSize, quantity: (cartItem?.quantity || 0) + modalQty });
      closeColorModal();
      setTimeout(() => {
        setFlyingDot(true);
        setTimeout(() => setFlyingDot(false), 800);
      }, 350);
    }
  };

  const handleBuyNow = () => {
    if (cartItem) {
      const params = new URLSearchParams(window.location.search);
      params.set("color", cartItem.color);
      params.set("size", cartItem.size);
      nav(`/checkout?${params.toString()}`);
    } else {
      openColorModal('buy');
    }
  };

  const handleCartCheckout = () => {
    if (!cartItem) return;
    const params = new URLSearchParams(window.location.search);
    params.set("color", cartItem.color);
    params.set("size", cartItem.size);
    nav(`/checkout?${params.toString()}`);
  };

  const copyCoupon = () => {
    navigator.clipboard.writeText("VOLTA25");
    setCouponCopied(true);
    setTimeout(() => setCouponCopied(false), 2000);
  };

  const nextImage = () => setCurrentImage((p) => (p + 1) % productImages.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + productImages.length) % productImages.length);

  return (
    <div className="min-h-screen bg-white pb-[72px]">
      {/* Flying dot animation */}
      {flyingDot && (
        <div className="fixed z-[100] pointer-events-none" style={{
          animation: 'flyToCart 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
          left: '50%',
          bottom: '80px',
        }}>
          <div className="h-4 w-4 rounded-full bg-cta shadow-lg" />
        </div>
      )}
      <style>{`
        @keyframes flyToCart {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          40% { transform: translate(20vw, -40vh) scale(1.3); opacity: 1; }
          100% { transform: translate(35vw, -90vh) scale(0.3); opacity: 0; }
        }
      `}</style>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto max-w-[480px] flex items-center justify-between px-4 py-3">
          <X className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => { setExitModalOpen(true); setExitShown(true); }} />
          <div className="flex items-center gap-5">
            <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer" />
            <div className="relative cursor-pointer" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              {cartItem && (
                <span className="absolute -top-1.5 -right-1.5 bg-cta text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">{cartItem.quantity}</span>
              )}
            </div>
            <MoreHorizontal className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => { setReportStep('menu'); setReportMenuOpen(true); }} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[480px]">
        {/* Product Gallery */}
        <section className="bg-card">
          <div
            className="relative aspect-[4/3] sm:aspect-[4/3] overflow-hidden bg-card cursor-pointer"
            onClick={() => { if (!swiping.current) setZoomOpen(true); }}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swiping.current = false; }}
            onTouchMove={(e) => {
              const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
              const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
              if (dx > dy && dx > 10) { swiping.current = true; e.preventDefault(); }
              touchEndX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const diff = touchStartX.current - touchEndX.current;
              if (swiping.current && Math.abs(diff) > 50) {
                e.preventDefault();
                if (diff > 0) nextImage();
                else prevImage();
              }
            }}
          >
            <img
              src={productImages[currentImage]}
              alt="Mesa dobrável"
              className="h-full w-full object-contain transition-opacity duration-300"
            />
            <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5 text-foreground/70" />
            </button>
            <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm" aria-label="Próxima">
              <ChevronRight className="h-5 w-5 text-foreground/70" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-xs font-medium text-card">
              {currentImage + 1}/{productImages.length}
            </span>
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {productImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                  i === currentImage ? "border-cta" : "border-transparent"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* Price Banner */}
        <section className="bg-gradient-to-r from-primary to-[hsl(25,80%,55%)] px-4 py-5 text-primary-foreground relative">
          <div className="flex items-end gap-2">
            <span className="text-xl font-black leading-none">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-xs line-through opacity-60">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="rounded-md bg-white px-2 py-0.5 text-xs font-extrabold text-cta">-{DISCOUNT}%</span>
          </div>
          <div className="absolute bottom-2 right-4 text-right">
            <div className="flex items-center gap-1 justify-end mb-2">
              <Zap className="h-3 w-3 fill-primary-foreground" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Oferta Relâmpago</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[10px] font-semibold opacity-80">Termina em:</span>
              <div className="flex items-center gap-0.5">
                {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <span className="mx-0.5 text-[10px] font-bold">:</span>}
                    <span className="rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-mono font-bold">{fmt(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="px-4">
          {/* Installments */}
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>6x de <strong>R$ 18,57</strong> sem juros no cartão</span>
          </div>

          {/* Coupon badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-badge-green px-3 py-1 text-xs font-semibold text-badge-green-foreground">
            <Tag className="h-3.5 w-3.5" />
            Cupom Aplicado
          </div>

          {/* Title */}
          <h1
            className="mt-4 text-base font-bold leading-snug text-foreground cursor-pointer active:opacity-70"
            onClick={() => document.getElementById("buy-bar")?.scrollIntoView({ behavior: "smooth" })}
          >
            Mesa Dobrável Tipo Maleta Prática e Durável 180x60cm — Portátil, Resistente, Fácil de Montar e Guardar
          </h1>

          {/* Rating */}
          <div className="mt-2 flex items-center gap-1.5 text-sm">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="font-bold">4.8</span>
            <span className="text-muted-foreground">(207)</span>
            <span className="text-muted-foreground mx-0.5">•</span>
            <span className="text-muted-foreground">4.473 vendidos</span>
          </div>
          <p className="mt-1 text-xs font-medium text-cta">1.2K+ pessoas compraram nos últimos 3 dias</p>

          {/* Shipping */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border p-3">
            <span className="rounded bg-badge-green px-2.5 py-1 text-xs font-bold text-badge-green-foreground flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" /> Frete grátis
            </span>
            <div className="text-sm">
              <span>Receba em <strong>5 - 8 dias úteis</strong></span>
              <div className="text-xs text-muted-foreground">
                Taxa de envio: <span className="line-through">R$ 29,90</span>{" "}
                <span className="font-semibold text-success">Grátis</span>
              </div>
            </div>
          </div>

          {/* Customer Protection */}
          <div className="mt-4 rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-sm">Proteção do cliente</span>
              </div>
              <span className="text-xs font-bold text-success">100% Protegido</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <span>Devolução gratuita em até 7 dias</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <span>Reembolso automático por danos</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-success flex-shrink-0" />
                <span>Pagamento seguro e criptografado</span>
              </div>
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span>Cupom por atraso na entrega</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-success/10 p-3 text-center">
              <p className="text-xs text-foreground/80">
                Sua compra é <strong className="text-success">100% protegida</strong>. Garantimos devolução do valor integral caso o produto não corresponda à descrição.
              </p>
            </div>
          </div>
        </div>

        {/* Gray Divider */}
        <div className="mt-4 h-2 bg-muted/60" />

        <div className="px-4">
          {/* Size Selection */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Tamanho</p>
              <span className="text-muted-foreground text-sm">23 disponíveis</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const available = s === "180x60cm";
                return (
                  <button
                    key={s}
                    onClick={() => available && setSelectedSize(s)}
                    disabled={!available}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                      selectedSize === s
                        ? "border-cta bg-cta/5 text-cta"
                        : available
                          ? "border-border text-foreground hover:border-foreground/40"
                          : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Gray Divider */}
        <div className="mt-4 h-2 bg-muted/60" />

        <div className="px-4">
          {/* Reviews */}
          <section className="mt-4">
            <h2 className="text-base font-bold mb-1">Avaliações dos clientes (207)</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-black">4.8</span>
              <span className="text-muted-foreground text-sm">/5</span>
              <div className="flex gap-0.5 ml-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>

            <div className="divide-y">
              {reviews.map((r, idx) => (
                <div key={idx} className="py-5 first:pt-0">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={r.avatar} alt={r.name} className="h-10 w-10 rounded-full object-cover" />
                    <span className="font-semibold text-sm">{r.name}</span>
                  </div>
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{r.text}</p>
                  {r.photos.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {r.photos.map((p, i) => (
                        <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Review Filters */}
            <div className="flex items-center gap-4 pt-4 border-t text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> Inclui imagens (52)</span>
              <span className="flex items-center gap-1">5 <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> (155)</span>
              <span className="flex items-center gap-1">4 <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> (22)</span>
            </div>
          </section>

          {/* Store Info */}
          <section className="mt-6 border-y py-5">
            <div className="flex items-center gap-3">
              <img src="/images/logo-mesalar.webp" alt="MesaLar" className="h-10 w-10 rounded-lg object-contain" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-badge-green px-2 py-0.5 text-[10px] font-semibold text-badge-green-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Loja Verificada
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">• 706 produtos • 100% recomenda</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Confiança:</span>
              <div className="h-3 flex-1 rounded-full overflow-hidden" style={{ background: 'linear-gradient(90deg, hsl(0, 80%, 50%) 0%, hsl(25, 90%, 50%) 50%, hsl(40, 90%, 50%) 100%)' }}>
              </div>
              <span className="font-bold text-success">100%</span>
            </div>
          </section>

          {/* Product Description */}
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Descrição do produto</h2>
            <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                A <strong>Mesa Dobrável Tipo Maleta 180x60cm da MesaLar</strong> é 2 em 1: Mesa de apoio com a portabilidade de uma maleta. Você pode montar, usar e guardar em segundos, sem nenhuma ferramenta! A capacidade total de 180cm permite acomodar até 8 pessoas confortavelmente.
              </p>
              <img src="/images/desc-maleta.webp" alt="Mesa dobrável tipo maleta" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ LEVE E PORTÁTIL:</strong> Design compacto tipo maleta com alça embutida. Fecha como uma mala e cabe em qualquer canto. Leve para camping, festas, feiras ou simplesmente guarde em casa sem ocupar espaço.</p>
              <img src="/images/desc-montagem.webp" alt="Monte em apenas 6 passos" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ MONTAGEM INSTANTÂNEA:</strong> Monte e desmonte em menos de 30 segundos, sem ferramentas! São apenas 6 passos simples — qualquer pessoa consegue montar sozinha, sem esforço.</p>
              <img src="/images/desc-qualidade.webp" alt="Detalhes de qualidade" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ CONSTRUÇÃO REFORÇADA:</strong> Alça de transporte ergonômica, trava de segurança que impede dobramentos acidentais e tampo em HDPE com espessura larga. Material profissional que dura anos.</p>
              <img src="/images/desc-pes.webp" alt="Pés antiderrapantes" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ PÉS ANTIDERRAPANTES:</strong> Borrachas nos pés que protegem seu piso contra riscos e garantem estabilidade total. A mesa não escorrega nem se move durante o uso, mesmo em superfícies lisas.</p>
              <img src="/images/desc-dimensoes.webp" alt="Dimensões e capacidade" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ LEVE E RESISTENTE:</strong> Pesa apenas 11kg mas suporta até 150kg de peso distribuído! Estrutura em aço tubular com pintura anticorrosiva. Acomoda até 8 pessoas com conforto.</p>
              <img src="/images/desc-versatilidade.webp" alt="Versatilidade de ocasiões" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ PARA TODAS AS OCASIÕES:</strong> Acampamentos, piqueniques, garagem, festas, cozinha, escritório, bazares, churrascos — essa mesa se adapta a qualquer situação. Use dentro ou fora de casa com a mesma praticidade e resistência.</p>
            </div>
          </section>

          {/* Specs */}
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Especificações Técnicas:</h2>
            <ul className="space-y-1.5 text-sm text-foreground/90 list-disc pl-5">
              <li><strong>Dimensões aberta:</strong> 180 x 60 x 74 cm</li>
              <li><strong>Dimensões fechada:</strong> 90 x 60 x 9 cm</li>
              <li><strong>Peso:</strong> aproximadamente 8 kg</li>
              <li><strong>Material do tampo:</strong> HDPE (plástico de alta densidade)</li>
              <li><strong>Estrutura:</strong> Aço tubular com pintura epóxi anticorrosiva</li>
              <li><strong>Capacidade:</strong> suporta até 100 kg</li>
              <li><strong>Cor:</strong> Branco / Cinza Escuro</li>
              <li><strong>Pés:</strong> Antiderrapantes em borracha</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              <strong>GARANTIA DE 1 ANO:</strong> A MesaLar é a escolha de milhares de consumidores. Com mais de 4.000 unidades vendidas e nota 4.8 de satisfação, a MesaLar é sinônimo de qualidade e confiança. MesaLar, a escolha inteligente!
            </p>
          </section>

          {/* Shipping Details */}
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Envio e Entrega</h2>
            <div className="space-y-0">
              {/* Frete Grátis - highlighted */}
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
                <Truck className="h-5 w-5 mt-0.5 flex-shrink-0 text-cta" />
                <div>
                  <p className="font-semibold text-sm">Frete Grátis para todo o Brasil!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Economize <strong>R$ 29,90</strong> no frete — promoção por tempo limitado.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <Clock className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-sm">Prazo de entrega</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Receba em <strong>5 a 8 dias úteis</strong> após confirmação do pagamento. Pedidos feitos até 14h são despachados no mesmo dia.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <Package className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-sm">Rastreamento completo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Acompanhe seu pedido em tempo real pelo código de rastreio enviado por e-mail e WhatsApp logo após o despacho.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <Shield className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-sm">Entrega garantida</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Entrega garantida e segurada pelos Correios®. Em caso de extravio ou dano no transporte, reenviamos o produto ou devolvemos o valor integral sem custo.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold text-muted-foreground mt-0.5 flex-shrink-0">BR</span>
                <p className="text-xs text-muted-foreground">
                  Envio rápido, seguro e com rastreamento para <strong className="text-foreground">todos os estados do Brasil</strong>. Aproveite essa oferta e leve a praticidade da Mesa Dobrável para o seu dia a dia!
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-6 mb-6">
            <h2 className="text-base font-bold mb-3">Perguntas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-semibold">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t pt-8 pb-24">
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-destructive" /> Compre
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Mais vendidos</li>
                  <li>Novidades</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-destructive" /> Sobre
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Sobre nós</li>
                  <li>Carreiras</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-destructive" /> Suporte
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Central de Ajuda</li>
                  <li>Contato</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-destructive" /> Política & Legal
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><a href="/politica-de-privacidade" className="hover:underline">Política de privacidade</a></li>
                  <li><a href="/termos-de-uso" className="hover:underline">Termos de uso</a></li>
                </ul>
              </div>
            </div>
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              <p>© 2025 MesaLar.</p>
              <p className="mt-1">
                <a href="/politica-de-privacidade" className="text-destructive hover:underline">Política de privacidade</a>
                <span className="mx-1">·</span>
                <a href="/termos-de-uso" className="text-destructive hover:underline">Termos de uso</a>
              </p>
            </div>
          </footer>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div id="buy-bar" className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 py-2 flex items-center gap-1.5">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setStoreOpen(true)} className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <Store className="h-5 w-5" />
            <span>Loja</span>
          </button>
          <button onClick={() => setChatOpen(true)} className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </button>
        </div>
        <button onClick={() => openColorModal('cart')} className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-bold text-cta whitespace-nowrap">
          <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0 text-cta" />
          <span className="text-cta font-bold text-[11px]">Adicionar ao carrinho</span>
        </button>
        <Button onClick={handleBuyNow} className="flex-shrink-0 bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-[11px] py-2.5 px-4 h-auto rounded-lg uppercase tracking-wide whitespace-nowrap">
          COMPRAR AGORA
        </Button>
      </div>

      {/* Color Selection Modal - Bottom Sheet */}
      {colorModalOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeColorModal}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${colorModalClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div
            className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl transition-transform duration-300 mx-auto sm:max-w-md ${colorModalClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Close button */}
            <button
              onClick={closeColorModal}
              className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="px-5 pt-2 pb-3">
              <p className="text-base font-bold">Selecione as opções</p>
            </div>

            {/* Product header */}
            <div className="flex items-center gap-3 px-5 pb-4">
              <img src="/images/mesa-branca-popup.webp" alt="Mesa Dobrável" className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1" />
              <div>
                <p className="font-bold text-sm">Mesa Dobrável Portátil Mesalar</p>
                <p className="text-cta font-extrabold text-lg">R$ {PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground line-through">R$ {OLD_PRICE.toFixed(2).replace('.', ',')}</p>
                <span className="inline-block mt-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5">Economize {DISCOUNT}%</span>
              </div>
            </div>

            {/* Color selection */}
            <div className="px-5 pb-4">
              <p className="text-sm font-semibold mb-2">Cor: {selectedColor === 'preta' ? 'Preta' : selectedColor === 'branca' ? 'Branca' : 'Selecione'}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "branca", name: "Branca", img: colorImages.branca },
                  { id: "preta", name: "Preta", img: colorImages.preta },
                ].map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`rounded-2xl border-2 overflow-hidden transition-all relative ${
                      selectedColor === color.id
                        ? "border-cta bg-cta/5 shadow-lg"
                        : "border-border hover:border-cta/50"
                    }`}
                  >
                    {selectedColor === color.id && (
                      <div className="absolute top-2 right-2 bg-cta rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className="aspect-[4/3] bg-muted/30 p-3">
                      <img src={color.img} alt={color.name} className="h-full w-full object-contain" />
                    </div>
                    <p className="py-2 text-center text-sm font-medium">{color.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity selector */}
            <div className="px-5 pb-4">
              <p className="text-sm font-semibold mb-2">Quantidade:</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalQty(q => Math.max(1, q - 1))}
                  className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center text-lg font-bold hover:border-cta/50 transition-colors"
                >−</button>
                <span className="text-base font-bold w-6 text-center">{modalQty}</span>
                <button
                  onClick={() => setModalQty(q => q + 1)}
                  className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center text-lg font-bold hover:border-cta/50 transition-colors"
                >+</button>
                <span className="ml-auto text-cta font-extrabold text-lg">R$ {(PRICE * modalQty).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Confirm button */}
            <div className="px-5 pb-6">
              <button
                onClick={handleColorConfirm}
                disabled={!selectedColor}
                className={`w-full font-bold text-base py-4 rounded-2xl transition-all ${
                  selectedColor
                    ? 'bg-cta text-white hover:bg-cta-hover'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {colorModalMode === 'buy' ? `Comprar agora - R$ ${(PRICE * modalQty).toFixed(2).replace('.', ',')}` : `Adicionar ao carrinho - R$ ${(PRICE * modalQty).toFixed(2).replace('.', ',')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 border-0 bg-transparent shadow-none [&>button]:text-white [&>button]:bg-foreground/50 [&>button]:rounded-full">
          <DialogDescription className="sr-only">Imagem ampliada do produto</DialogDescription>
          <DialogTitle className="sr-only">Imagem do produto</DialogTitle>
          <div
            className="relative"
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swiping.current = false; }}
            onTouchMove={(e) => {
              const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
              const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
              if (dx > dy && dx > 10) { swiping.current = true; e.preventDefault(); }
              touchEndX.current = e.touches[0].clientX;
            }}
            onTouchEnd={() => {
              const diff = touchStartX.current - touchEndX.current;
              if (swiping.current && Math.abs(diff) > 50) {
                if (diff > 0) nextImage();
                else prevImage();
              }
            }}
          >
            <img
              src={productImages[currentImage]}
              alt="Mesa dobrável ampliada"
              className="w-full h-auto rounded-lg"
            />
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center">
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-xs font-medium text-white">
              {currentImage + 1}/{productImages.length}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Intent Modal - VOLTA25 */}
      <Dialog open={exitModalOpen} onOpenChange={setExitModalOpen}>
        <DialogContent className="max-w-[88vw] sm:max-w-sm rounded-2xl p-5 text-center border-t-4 border-t-destructive">
          <DialogDescription className="sr-only">Cupom de desconto exclusivo</DialogDescription>
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-3">
              <Gift className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-lg font-bold mb-1">Ei, espera! 🎁</DialogTitle>
            <p className="text-xs text-muted-foreground mb-3">
              Preparamos um <strong className="text-destructive">desconto exclusivo</strong> pra você!
            </p>

            {/* Coupon Box */}
            <div className="w-full rounded-lg border-2 border-dashed border-coupon-border bg-coupon-bg p-3 mb-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Cupom de Desconto</p>
              <p className="text-2xl font-black tracking-wider text-destructive mb-0.5">VOLTA25</p>
              <p className="text-xs"><strong>25% OFF</strong> na sua compra</p>
              <p className="text-xs mt-1.5">⏳ Expira em <strong className="text-destructive">{fmt(countdown.m)}:{fmt(countdown.s)}</strong></p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${Math.max(5, ((countdown.m * 60 + countdown.s) / 300) * 100)}%` }} />
              </div>
            </div>

            {/* Color Selection */}
            <p className="text-xs font-bold mb-2">Escolha a cor e vá direto pro checkout:</p>
            <div className="grid grid-cols-2 gap-2.5 w-full mb-4">
              {[
                { id: "branca", name: "Branca", img: "/images/mesa-branca-popup.webp" },
                { id: "preta", name: "Preta", img: "/images/mesa-preta-popup.webp" },
              ].map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`rounded-lg border-2 overflow-hidden transition-all ${
                    selectedColor === color.id
                      ? "border-foreground shadow-lg"
                      : "border-border hover:border-blue-500 hover:bg-blue-50"
                  }`}
                >
                  <div className="aspect-[4/3] bg-background p-1.5">
                    <img src={color.img} alt={color.name} className="h-full w-full object-contain" />
                  </div>
                  <p className="py-1.5 text-center text-xs font-medium">{color.name}</p>
                </button>
              ))}
            </div>

            <Button
              onClick={() => {
                if (selectedColor) {
                  setExitModalOpen(false);
                  nav(`/checkout?cor=${selectedColor}&tamanho=180x60cm&cupom=VOLTA25`);
                }
              }}
              disabled={!selectedColor}
              className="w-full bg-muted text-muted-foreground hover:bg-cta hover:text-cta-foreground font-bold text-sm py-3 h-auto rounded-xl disabled:opacity-50 transition-colors data-[active=true]:bg-cta data-[active=true]:text-cta-foreground"
              data-active={!!selectedColor}
            >
              Aproveitar desconto 🔥
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2">Válido por tempo limitado. Não perca!</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Info Modal - Bottom Sheet */}
      {storeOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeStore}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${storeClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div
            className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto transition-transform duration-300 mx-auto sm:max-w-md ${storeClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Close button */}
            <button
              onClick={closeStore}
              className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-5 pt-2 pb-3 border-b">
              <p className="text-base font-bold">Informações da Loja</p>
            </div>
          <div className="px-5 py-4 space-y-5">
            {/* Store header */}
            <div className="flex items-center gap-3">
              <img src="/images/logo-mesalar.webp" alt="Mesalar" className="h-12 w-12 rounded-full object-contain border" />
              <div>
                <p className="font-bold text-sm">Mesalar</p>
                <p className="text-xs text-muted-foreground">Loja Oficial de Móveis</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs font-semibold">4.8 (15.234 avaliações)</span>
                </div>
              </div>
            </div>

            {/* Horário */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Horário de Atendimento</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Segunda - Sexta</span><span className="font-medium">09:00 - 18:00</span></div>
                <div className="flex justify-between"><span>Sábado</span><span className="font-medium">10:00 - 16:00</span></div>
                <div className="flex justify-between"><span>Domingo</span><span className="font-medium text-muted-foreground">Fechado</span></div>
              </div>
            </div>

            {/* Localização */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Localização</span>
              </div>
              <p className="text-sm text-muted-foreground">Av. Manoel Ribas, 2660 - Vista Alegre</p>
              <p className="text-sm text-muted-foreground">Curitiba - PR, 80810-345</p>
            </div>

            {/* Políticas */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Políticas da Loja</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">📦 Devolução Gratuita</p>
                  <p className="text-xs text-muted-foreground">7 dias para devolução sem custo adicional</p>
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">✅ Garantia Mesalar</p>
                  <p className="text-xs text-muted-foreground">1 ano de garantia contra defeitos de fabricação</p>
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">🚚 Frete Grátis</p>
                  <p className="text-xs text-muted-foreground">Entrega gratuita para todo o Brasil</p>
                </div>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">🔒 Pagamento Seguro</p>
                  <p className="text-xs text-muted-foreground">Transações protegidas e criptografadas</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t text-center">
              <div>
                <p className="text-lg font-black text-cta">2.4M</p>
                <p className="text-[10px] text-muted-foreground">Seguidores</p>
              </div>
              <div>
                <p className="text-lg font-black text-cta">52K</p>
                <p className="text-[10px] text-muted-foreground">Produtos</p>
              </div>
              <div>
                <p className="text-lg font-black text-cta">98%</p>
                <p className="text-[10px] text-muted-foreground">Satisfação</p>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Chat Modal - Bottom Sheet */}
      {chatOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeChat}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${chatClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div
            className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] flex flex-col transition-transform duration-300 mx-auto sm:max-w-md ${chatClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Close button */}
            <button
              onClick={closeChat}
              className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="px-5 pt-2 pb-3 border-b">
              <p className="text-base font-bold">Chat - Mesa Dobrável Mesalar</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px] max-h-[60vh]">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-cta text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick questions */}
            <div className="border-t px-4 py-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Perguntas rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {faqs.map((faq, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(faq)}
                    className="text-xs border border-border rounded-full px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
                  >
                    {faq.q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput); }} className="border-t px-4 py-3 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cta"
              />
              <button type="submit" disabled={chatTyping || !chatInput.trim()} className="bg-cta text-white rounded-full p-2.5 disabled:opacity-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cart - Bottom Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeCart}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${cartClosing ? 'opacity-0' : 'opacity-100 animate-in fade-in-0'}`} />
          <div
            className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl transition-transform duration-300 mx-auto sm:max-w-md ${cartClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <button
              onClick={closeCart}
              className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="px-5 pt-2 pb-3 border-b">
              <p className="text-base font-bold text-center">Carrinho de compras ({cartItem ? cartItem.quantity : 0})</p>
            </div>

            {!cartItem ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-bold text-foreground mb-1">Seu carrinho está vazio</p>
                <p className="text-sm text-muted-foreground text-center mb-6">Vamos preenchê-lo com seus produtos favoritos e ótimas ofertas!</p>
                <button onClick={closeCart} className="bg-cta text-white font-bold text-sm py-3 px-10 rounded-full hover:bg-cta-hover transition-colors">
                  Começar a comprar
                </button>
              </div>
            ) : (
              <div className="px-5 py-4">
                {/* Product in cart */}
                <div className="flex gap-3 pb-4 border-b">
                  <img
                    src={cartItem.color === 'preta' ? '/images/mesa-preta-popup.webp' : '/images/mesa-branca-popup.webp'}
                    alt="Mesa Dobrável"
                    className="h-20 w-20 rounded-lg object-contain border bg-muted/30 p-1 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">Mesa Dobrável Portátil Mesalar</p>
                    <p className="text-xs text-muted-foreground">Cor: {cartItem.color === 'preta' ? 'Preta' : 'Branca'} · {cartItem.size}</p>
                    <p className="text-cta font-extrabold text-base mt-1">R$ {(PRICE * cartItem.quantity).toFixed(2).replace('.', ',')}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => {
                          if (cartItem.quantity <= 1) { updateCart(null); }
                          else updateCart({ ...cartItem, quantity: cartItem.quantity - 1 });
                        }}
                        className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                      >
                        <span className="text-sm font-bold">−</span>
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateCart({ ...cartItem, quantity: cartItem.quantity + 1 })}
                        className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                      >
                        <span className="text-sm font-bold">+</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-lg font-extrabold text-cta">R$ {(PRICE * cartItem.quantity).toFixed(2).replace('.', ',')}</span>
                </div>

                {/* Checkout button */}
                <button
                  onClick={handleCartCheckout}
                  className="w-full bg-cta text-white font-bold text-base py-3.5 rounded-2xl mt-4 hover:bg-cta-hover transition-colors"
                >
                  Finalizar compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
