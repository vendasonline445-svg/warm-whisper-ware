import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trackTikTokEvent } from "@/lib/tiktok-tracking";
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Check,
  Truck, Shield, Package, Clock, Zap, CheckCircle2, X,
  Store, MessageCircle, Share2, MoreHorizontal, Gift, Copy, Camera,
  CreditCard, Tag, ShieldCheck, Ticket,
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
  const touchEndX = useRef(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("180x60cm");
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitShown, setExitShown] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
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

  const openColorModal = () => {
    setSelectedColor(null);
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

  const nav = useNavigate();

  const handleCheckout = () => {
    if (!selectedColor) return;
    const params = new URLSearchParams(window.location.search);
    params.set("color", selectedColor);
    params.set("size", selectedSize);
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
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto max-w-[480px] flex items-center justify-between px-4 py-3">
          <X className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => { setExitModalOpen(true); setExitShown(true); }} />
          <div className="flex items-center gap-5">
            <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer" />
            <ShoppingCart className="h-5 w-5 text-muted-foreground cursor-pointer" />
            <MoreHorizontal className="h-5 w-5 text-muted-foreground cursor-pointer" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[480px]">
        {/* Product Gallery */}
        <section className="bg-card">
          <div
            className="relative aspect-[4/3] sm:aspect-[4/3] overflow-hidden bg-card cursor-pointer"
            onClick={openColorModal}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchMove={(e) => { touchEndX.current = e.touches[0].clientX; }}
            onTouchEnd={() => {
              const diff = touchStartX.current - touchEndX.current;
              if (Math.abs(diff) > 50) {
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
        <section className="bg-gradient-to-r from-primary to-[hsl(25,80%,55%)] px-4 py-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 fill-primary-foreground" />
            <span className="text-sm font-extrabold uppercase tracking-wider">Oferta Relâmpago</span>
            <div className="ml-auto flex items-center gap-1">
              {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-0.5 font-bold">:</span>}
                  <span className="rounded-md bg-primary-foreground/20 px-2 py-1 text-sm font-mono font-bold">{fmt(v)}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[2.2rem] font-black leading-none">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-base line-through opacity-60">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="rounded-md bg-primary-foreground/25 px-2.5 py-1 text-sm font-bold">-{DISCOUNT}%</span>
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
          <button className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <Store className="h-5 w-5" />
            <span>Loja</span>
          </button>
          <button className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </button>
        </div>
        <button onClick={openColorModal} className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-bold text-cta whitespace-nowrap">
          <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0 text-cta" />
          <span className="text-cta font-bold text-[11px]">Adicionar ao carrinho</span>
        </button>
        <Button onClick={openColorModal} className="flex-shrink-0 bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-[11px] py-2.5 px-4 h-auto rounded-lg uppercase tracking-wide whitespace-nowrap">
          COMPRAR AGORA
        </Button>
      </div>

      {/* Color Selection Modal - Bottom Sheet Style */}
      <Dialog open={colorModalOpen} onOpenChange={setColorModalOpen}>
        <DialogContent className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] max-w-full sm:max-w-md p-0 gap-0 rounded-t-2xl sm:rounded-2xl border-0 sm:border data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:slide-in-from-left-1/2">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <DialogTitle className="text-lg font-bold">Escolha a cor</DialogTitle>
            <DialogDescription className="sr-only">Selecione a cor da mesa</DialogDescription>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5">
            {[
              { id: "branca", name: "Branca", img: colorImages.branca },
              { id: "preta", name: "Preta", img: colorImages.preta },
            ].map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  selectedColor === color.id
                    ? "border-destructive bg-destructive/5 shadow-lg"
                    : "border-border hover:border-blue-500 hover:bg-blue-50"
                }`}
              >
                <div className="aspect-[4/3] bg-muted/30 p-3">
                  <img src={color.img} alt={color.name} className="h-full w-full object-contain" />
                </div>
                <p className="py-2.5 text-center text-sm font-medium">{color.name}</p>
              </button>
            ))}
          </div>
          <div className="px-5 pt-4 pb-6">
            <Button
              onClick={handleCheckout}
              disabled={!selectedColor}
              className="w-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground font-bold text-base py-4 h-auto rounded-2xl disabled:opacity-40 transition-colors data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground"
              data-active={!!selectedColor}
            >
              Comprar agora
            </Button>
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
    </div>
  );
};

export default Index;
