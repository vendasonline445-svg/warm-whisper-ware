import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { trackFunnelEvent } from "@/lib/tracking-hub";
import { getUrlWithUtm } from "@/utils/utm";
import { trackEvent, trackPageViewOnce } from "@/utils/track-event";
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Check, Trash2,
  Truck, Shield, Package, Clock, Zap, CheckCircle2, X,
  Store, MessageCircle, Share2, MoreHorizontal, Gift, Copy, Camera, MapPin,
  CreditCard, Tag, ShieldCheck, Ticket, Flag, Link, ChevronDown, ArrowLeft, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const PRODUCT_ID = "economizare-bloqueador";
const PRICE = 57.40;
const OLD_PRICE = 139.90;
const DISCOUNT = 59;
const INSTALLMENTS_VALUE = (PRICE / 6).toFixed(2).replace(".", ",");

const productImages = [
  "/images/eco/eco-produto-1.png",
  "/images/eco/eco-produto-2.jpg",
  "/images/eco/eco-produto-3.png",
  "/images/eco/eco-produto-tiktok.png",
  "/images/eco/eco-inovacao.png",
  "/images/eco/eco-sustentabilidade.png",
];

const reviews = [
  { name: "Maria Clara S.", text: "Instalei e minha conta de água já baixou no primeiro mês! Super fácil de colocar, qualquer pessoa consegue. Recomendo demais!", rating: 5, daysAgo: 1 },
  { name: "José Ricardo M.", text: "Produto excelente! Reduziu quase metade da minha conta. A instalação é simples e rápida, não precisa de encanador.", rating: 5, daysAgo: 2 },
  { name: "Ana Paula F.", text: "Comprei com receio mas funcionou de verdade! Economizei R$80 no primeiro mês. O produto é muito bem feito e veio bem embalado.", rating: 5, daysAgo: 1 },
  { name: "Carlos Eduardo B.", text: "Vi no Shark Tank e resolvi testar. Não me arrependo! A conta que era R$280 caiu pra R$180. Produto de qualidade.", rating: 5, daysAgo: 2 },
  { name: "Fernanda Lima", text: "Já é o terceiro que compro — coloquei na casa dos meus pais e na da sogra também. Todo mundo economizando! 💧", rating: 5, daysAgo: 1 },
  { name: "Roberto Alves", text: "Estava pagando absurdos de conta de água. Com o Economizare a diferença foi gritante. Instalação em 5 minutos!", rating: 5, daysAgo: 2 },
  { name: "Patricia Souza", text: "Produto incrível! A gente nem sabia que pagava pelo ar na tubulação. Agora pago só pela água mesmo. Nota 10!", rating: 5, daysAgo: 1 },
  { name: "Marcos Vinícius R.", text: "Entrega super rápida, veio bem protegido. Instalei sozinho seguindo o manual. Produto robusto e bem acabado.", rating: 5, daysAgo: 2 },
  { name: "Luciana Costa", text: "Minha conta reduziu de R$350 pra R$200! É impressionante como pagamos pelo ar que passa no hidrômetro. Recomendo!", rating: 5, daysAgo: 1 },
  { name: "André Santos", text: "Comprei pro meu comércio e a economia foi absurda. Já se pagou no primeiro mês. Vou comprar mais unidades!", rating: 5, daysAgo: 2 },
  { name: "Camila Oliveira", text: "Vi o produto no TikTok e não acreditei muito, mas resolvi testar. Resultado: conta 40% menor! Amei ❤️", rating: 5, daysAgo: 1 },
  { name: "Thiago Mendes", text: "Produto com certificação INMETRO, isso me deu confiança. E realmente funciona! Economia real e comprovada.", rating: 4, daysAgo: 2 },
  { name: "Débora Nascimento", text: "Instalação mega simples, sem precisar de ferramentas especiais. E o regulador de pressão é um diferencial enorme!", rating: 5, daysAgo: 1 },
  { name: "Rafael Pereira", text: "Já testei outros bloqueadores mas o Economizare é muito superior. O regulador integrado faz toda a diferença.", rating: 5, daysAgo: 2 },
  { name: "Sandra Martins", text: "Produto maravilhoso! Tem 1 ano de garantia e 5 anos de validade. Melhor investimento que fiz pra minha casa.", rating: 5, daysAgo: 1 },
];

function getReviewDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const months = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const faqs = [
  { q: "Como funciona o Economizare?", a: "O Eliminador de Ar impede que o ar presente na rede de abastecimento passe pelo seu hidrômetro e seja contabilizado como água, podendo reduzir sua conta em até 50%." },
  { q: "É seguro de usar?", a: "Sim! O produto foi atestado pelo SICAL do Brasil, laboratório acreditado pelo INMETRO. Possui marca e patente registrados junto ao INPI." },
  { q: "Como é a instalação?", a: "Instalação simples, sem obras ou intervenções estruturais. Qualquer pessoa consegue instalar seguindo o manual incluso." },
  { q: "Qual a garantia?", a: "1 ano de garantia total contra defeitos de fabricação e 5 anos de validade do produto." },
  { q: "Qual o prazo de entrega?", a: "Receba em 1 a 3 dias úteis após confirmação do pagamento. Frete grátis para todo o Brasil!" },
  { q: "Funciona em qualquer rede hidráulica?", a: "Sim! O Economizare é compatível com qualquer rede hidráulica residencial ou comercial. Possui regulagem de pressão integrada." },
];

function useCountdown() {
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
  return time;
}

const fmt = (n: number) => String(n).padStart(2, "0");

const EconomizareIndex = () => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const swiping = useRef(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [quantity, setQuantity] = useState(1);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exit2Open, setExit2Open] = useState(false);
  const [exitShown, setExitShown] = useState(false);
  const [exit2Shown, setExit2Shown] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeClosing, setStoreClosing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareClosing, setShareClosing] = useState(false);
  const [belowFoldReady, setBelowFoldReady] = useState(false);

  const countdown = useCountdown();
  const nav = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setBelowFoldReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    trackFunnelEvent({
      event: "view_content",
      value: PRICE,
      properties: {
        content_type: "product",
        content_id: PRODUCT_ID,
        content_name: "Economizare Bloqueador de Ar",
        contents: [{ content_id: PRODUCT_ID, quantity: 1 }],
      },
    });
    trackPageViewOnce("/economizare");
  }, []);

  useEffect(() => {
    const anyOpen = storeOpen || exitModalOpen || exit2Open;
    document.body.style.overflow = anyOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [storeOpen, exitModalOpen, exit2Open]);

  const fireCelebration = useCallback(() => {
    confetti({ particleCount: 40, spread: 70, origin: { y: 0.55 }, colors: ["#ff4c6a", "#ff9f43", "#ffd700", "#44bd32", "#00d2d3", "#e056fd"], gravity: 1.2 });
  }, []);

  useEffect(() => {
    if (exitShown) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && e.relatedTarget === null) {
        setExitModalOpen(true); setExitShown(true); fireCelebration();
      }
    };
    let popstateReady = false;
    const popstateReadyTimer = setTimeout(() => { popstateReady = true; }, 2000);
    const handlePopState = () => {
      if (!popstateReady) { window.history.pushState(null, "", window.location.href); return; }
      window.history.pushState(null, "", window.location.href);
      setExitModalOpen(true); setExitShown(true); fireCelebration();
    };
    window.history.pushState(null, "", window.location.href);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("popstate", handlePopState);
      clearTimeout(popstateReadyTimer);
    };
  }, [exitShown, fireCelebration]);

  const handleBuyNow = () => {
    trackFunnelEvent({ event: "click_buy" });
    trackFunnelEvent({
      event: "add_to_cart",
      value: PRICE * quantity,
      properties: {
        content_type: "product",
        content_id: PRODUCT_ID,
        content_name: "Economizare Bloqueador de Ar",
        contents: [{ content_id: PRODUCT_ID, quantity }],
      },
    });
    localStorage.setItem('eco_cart', JSON.stringify({ quantity }));
    nav(getUrlWithUtm(`/economizare/checkout`));
  };

  const nextImage = () => setCurrentImage((p) => (p + 1) % productImages.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + productImages.length) % productImages.length);

  const closeStore = () => { setStoreClosing(true); setTimeout(() => { setStoreOpen(false); setStoreClosing(false); }, 300); };

  return (
    <div className="min-h-screen bg-white pb-[72px]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto max-w-[480px] flex items-center gap-2 px-3 py-2.5">
          <ChevronLeft className="h-6 w-6 text-foreground cursor-pointer flex-shrink-0" onClick={() => { setExitModalOpen(true); setExitShown(true); fireCelebration(); }} />
          <div className="flex-1 mx-1">
            <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 pointer-events-none select-none">
              <Search className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/60">Pesquisar</span>
            </div>
          </div>
          <div className="flex items-center gap-5 flex-shrink-0">
            <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer" onClick={() => setShareOpen(true)} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[480px]">
        {/* Product Gallery */}
        <section className="bg-card">
          <div
            ref={galleryRef}
            className="relative aspect-[4/3] overflow-hidden bg-card cursor-grab active:cursor-grabbing"
            onDragStart={(e) => e.preventDefault()}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; touchEndX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swiping.current = false; setDragOffset(0); }}
            onTouchMove={(e) => {
              const dx = e.touches[0].clientX - touchStartX.current;
              const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
              touchEndX.current = e.touches[0].clientX;
              if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
                swiping.current = true;
                if (!isDragging) setIsDragging(true);
                e.preventDefault();
                const containerWidth = galleryRef.current?.offsetWidth || 1;
                const baseOffsetPx = -currentImage * containerWidth;
                const minOffsetPx = -((productImages.length - 1) * containerWidth);
                let nextOffsetPx = baseOffsetPx + dx;
                if (nextOffsetPx > 0) nextOffsetPx = nextOffsetPx * 0.25;
                else if (nextOffsetPx < minOffsetPx) nextOffsetPx = minOffsetPx + (nextOffsetPx - minOffsetPx) * 0.25;
                setDragOffset(nextOffsetPx - baseOffsetPx);
              }
            }}
            onTouchEnd={(e) => {
              setIsDragging(false);
              const endX = touchEndX.current || touchStartX.current;
              const diff = touchStartX.current - endX;
              const containerWidth = galleryRef.current?.offsetWidth || 300;
              if (swiping.current && Math.abs(diff) > containerWidth * 0.2) { e.preventDefault(); if (diff > 0) nextImage(); else prevImage(); }
              setDragOffset(0); swiping.current = false;
            }}
            onTouchCancel={() => { setIsDragging(false); setDragOffset(0); swiping.current = false; }}
          >
            <div
              className="flex h-full"
              style={{
                transform: `translateX(calc(-${currentImage * (100 / productImages.length)}% + ${dragOffset}px))`,
                transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                width: `${productImages.length * 100}%`,
              }}
            >
              {productImages.map((img, i) => (
                <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / productImages.length}%` }}>
                  <img src={img} alt={`Produto ${i + 1}`} className="h-full w-full select-none object-contain" loading={i <= 1 ? "eager" : "lazy"} draggable={false} />
                </div>
              ))}
            </div>
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5 text-foreground/70" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 backdrop-blur-sm" aria-label="Próxima">
              <ChevronRight className="h-5 w-5 text-foreground/70" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-1 text-xs font-medium text-card">
              {currentImage + 1}/{productImages.length}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto px-3 py-2">
            {productImages.map((img, i) => (
              <button key={i} onClick={() => setCurrentImage(i)} className={`h-[44px] w-[44px] flex-shrink-0 overflow-hidden rounded border-2 transition-all ${i === currentImage ? "border-cta" : "border-transparent"}`}>
                <img src={img} alt="" className="h-full w-full object-cover" loading="eager" />
              </button>
            ))}
          </div>
        </section>

        {/* Price Banner */}
        <section className="bg-gradient-to-r from-[#0f7b3f] to-[#1a9d5c] px-3 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black leading-none">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-[11px] line-through opacity-60">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-extrabold text-[#0f7b3f]">-{DISCOUNT}%</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end mb-1">
              <Zap className="h-3 w-3 fill-white" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-90">Oferta Relâmpago</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[10px] font-semibold opacity-80">Termina em:</span>
              <div className="flex items-center gap-0.5">
                {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <span className="mx-0.5 text-[10px] font-bold">:</span>}
                    <span className="rounded bg-white/20 px-1 py-0.5 text-[10px] font-mono font-bold">{fmt(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="px-3">
          {/* Installments */}
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-foreground">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>6x de <strong>R$ {INSTALLMENTS_VALUE}</strong> sem juros no cartão</span>
          </div>

          {/* Badge */}
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-badge-green px-2.5 py-0.5 text-[11px] font-semibold text-badge-green-foreground">
            <Tag className="h-3 w-3" />
            Flash Sale
          </div>

          {/* Title */}
          <h1 className="mt-3 text-[15px] font-bold leading-snug text-foreground">
            Bloqueador e Eliminador de Ar Economizare — Reduz a Conta de Água em até 50%
          </h1>

          {/* Rating */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px]">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="font-bold">4.5</span>
            <span className="text-muted-foreground">(231)</span>
            <span className="text-muted-foreground mx-0.5">•</span>
            <span className="text-muted-foreground">4.400 vendidos</span>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-cta">800+ pessoas compraram nos últimos 3 dias</p>

          {/* Certifications */}
          <div className="mt-3 flex items-center gap-3 rounded-xl border p-2.5">
            <img src="/images/eco/logo-sharktank.png" alt="Shark Tank" className="h-8 w-8 object-contain rounded" />
            <img src="/images/eco/logo-sical.png" alt="SICAL INMETRO" className="h-8 object-contain" />
            <div className="text-[11px] text-muted-foreground leading-tight">
              <strong className="text-foreground">Aprovado no Shark Tank Brasil</strong>
              <br />Testado e certificado pelo SICAL/INMETRO
            </div>
          </div>

          {/* Shipping */}
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border p-2.5">
            <span className="rounded bg-badge-green px-2 py-0.5 text-[11px] font-bold text-badge-green-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" /> Frete grátis
            </span>
            <div className="text-[13px]">
              <span>Receba em <strong>1 - 3 dias úteis</strong></span>
              <div className="text-[11px] text-muted-foreground">
                Taxa de envio: <span className="line-through">R$ 29,90</span>{" "}
                <span className="font-semibold text-success">Grátis</span>
              </div>
            </div>
          </div>

          {/* Customer Protection */}
          <div className="mt-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-[13px]">Proteção do cliente</span>
              </div>
              <span className="text-[11px] font-bold text-success">100% Protegido</span>
            </div>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" /><span>Garantia de satisfação por 1 ano</span></div>
              <div className="flex items-center gap-2.5"><CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" /><span>Reembolso automático por danos</span></div>
              <div className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-success flex-shrink-0" /><span>Pagamento seguro e criptografado</span></div>
              <div className="flex items-center gap-2.5"><Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" /><span>Cupom por atraso na entrega</span></div>
            </div>
          </div>
        </div>

        {/* Quantity Selection */}
        <div className="mt-4 h-2 bg-muted/60" />
        <div className="px-3 mt-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Quantidade</p>
            <span className="text-muted-foreground text-[13px]">47 disponíveis</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center text-lg font-bold hover:border-cta/50">−</button>
            <span className="text-base font-bold w-6 text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="h-9 w-9 rounded-xl border-2 border-border flex items-center justify-center text-lg font-bold hover:border-cta/50">+</button>
            <span className="ml-auto text-cta font-extrabold text-lg">R$ {(PRICE * quantity).toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="mt-4 h-2 bg-muted/60" />

        {belowFoldReady ? (<>
        <div className="px-3">
          {/* Reviews */}
          <section className="mt-3" itemScope itemType="https://schema.org/Product">
            <meta itemProp="name" content="Bloqueador e Eliminador de Ar Economizare" />
            <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
              <meta itemProp="ratingValue" content="4.5" />
              <meta itemProp="reviewCount" content="231" />
              <meta itemProp="bestRating" content="5" />
              <h2 className="text-[15px] font-bold mb-1">Avaliações dos clientes (<span itemProp="ratingCount">231</span>)</h2>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-black">4.5</span>
                <span className="text-muted-foreground text-[13px]">/5</span>
                <div className="flex gap-0.5 ml-1">
                  {[1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
                  <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="divide-y mt-4">
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r, idx) => (
                <div key={idx} className="py-4 first:pt-0" itemProp="review" itemScope itemType="https://schema.org/Review">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                      {r.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-[13px]" itemProp="author">{r.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{getReviewDate(r.daysAgo)}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-1.5">
                    {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground/90" itemProp="reviewBody">{r.text}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setShowAllReviews(prev => !prev)} className="w-full py-3 mt-2 text-sm font-semibold text-[#0f7b3f] border border-[#0f7b3f]/30 rounded-lg flex items-center justify-center gap-1.5">
              {showAllReviews ? "Mostrar menos avaliações" : "Ver todas as 231 avaliações"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllReviews ? "rotate-180" : ""}`} />
            </button>
          </section>

          {/* JSON-LD */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org", "@type": "Product",
            "name": "Bloqueador e Eliminador de Ar Economizare",
            "description": "Reduz a conta de água em até 50%. Aprovado pelo SICAL/INMETRO.",
            "brand": { "@type": "Brand", "name": "Economizare" },
            "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.5", "reviewCount": "231", "bestRating": "5" },
          })}} />

          {/* Store Info */}
          <section className="mt-6 border-y py-5 cursor-pointer active:bg-muted/50" onClick={() => setStoreOpen(true)}>
            <div className="flex items-center gap-3">
              <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-11 w-11 rounded-full object-contain border" />
              <div className="flex-1">
                <p className="font-bold text-[14px]">Economizare</p>
                <p className="text-[11px] text-muted-foreground">Loja Oficial</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-[12px] font-semibold">4.5</span>
                  <span className="text-[11px] text-muted-foreground">(231 avaliações)</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </section>

          {/* Product Description */}
          <section className="mt-5">
            <h2 className="text-[15px] font-bold mb-2">Descrição do produto</h2>
            <div className="space-y-3 text-[13px] leading-relaxed text-foreground/90">
              <p>O <strong>Eliminador de Ar ECONOMIZARE</strong> impede que o ar presente na rede de abastecimento passe pelo seu hidrômetro e contabilize o ar como se fosse água, podendo <strong>reduzir sua conta de água em até 50%!</strong></p>
              <img src="/images/eco/eco-produto-1.png" alt="Economizare produto" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ INSTALAÇÃO FACILITADA:</strong> Sem obras ou intervenções estruturais. Instale em minutos, sem precisar de encanador.</p>
              <p><strong>✅ REGULAGEM DE PRESSÃO:</strong> Único bloqueador de ar com regulador integrado, garantindo performance ideal em qualquer rede hidráulica.</p>
              <img src="/images/eco/eco-produto-3.png" alt="Economia de água" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ CERTIFICADO INMETRO:</strong> Tecnologia testada e aprovada pelo SICAL do Brasil, laboratório internacional acreditado pelo INMETRO.</p>
              <p><strong>✅ GARANTIA DE SATISFAÇÃO:</strong> Política de satisfação válida por até 1 ano. 5 anos de validade do produto.</p>
              <p><strong>✅ ECONOMIA REAL:</strong> Clientes reportam economia de R$ 50 a R$ 150 por mês na conta de água. O produto se paga no primeiro mês!</p>
            </div>
          </section>

          {/* Specs */}
          <section className="mt-5">
            <h2 className="text-[15px] font-bold mb-2">Especificações Técnicas</h2>
            <ul className="space-y-1 text-[13px] text-foreground/90 list-disc pl-5">
              <li><strong>Material:</strong> Polipropileno de alta resistência</li>
              <li><strong>Conexão:</strong> Rosca 3/4" (padrão brasileiro)</li>
              <li><strong>Pressão máxima:</strong> 10 bar</li>
              <li><strong>Garantia:</strong> 1 ano contra defeitos de fabricação</li>
              <li><strong>Validade:</strong> 5 anos</li>
              <li><strong>Certificação:</strong> SICAL/INMETRO (CRL 0163)</li>
              <li><strong>Patente:</strong> Registrada no INPI</li>
            </ul>
          </section>

          {/* Shipping */}
          <section className="mt-5">
            <h2 className="text-[15px] font-bold mb-2">Envio e Entrega</h2>
            <div className="space-y-0">
              <div className="flex items-start gap-2.5 rounded-xl bg-green-50 border border-green-200 p-3 mb-3">
                <Truck className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#0f7b3f]" />
                <div>
                  <p className="font-semibold text-[13px]">Frete Grátis para todo o Brasil!</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Promoção por tempo limitado.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3">
                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-[13px]">Prazo de entrega</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Receba em <strong>1 a 3 dias úteis</strong>.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-3">
                <Package className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-semibold text-[13px]">Rastreamento completo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Acompanhe em tempo real por e-mail e WhatsApp.</p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-5 mb-5">
            <h2 className="text-[15px] font-bold mb-2">Perguntas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-[13px] font-semibold">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-[13px] text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Footer */}
          <footer className="mt-8 border-t pt-6 pb-24">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 max-w-[280px] mx-auto mb-4">
              {[
                { icon: "🛡️", text: "Compra Segura" },
                { icon: "👤", text: "Proteção ao Cliente" },
                { icon: "💳", text: "Pagamento Seguro" },
                { icon: "🔒", text: "Criptografia SSL" },
                { icon: "📋", text: "LGPD" },
              ].map((item) => (
                <span key={item.text} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="text-[10px] opacity-60">{item.icon}</span>
                  {item.text}
                </span>
              ))}
            </div>
            <div className="text-center text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground text-[13px]">Economizare LTDA</p>
              <p>CNPJ: 26.682.422/0001-88</p>
              <p>contato@economizare.com</p>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
                ↑ Voltar ao topo
              </button>
            </div>
            <div className="mt-4 border-t pt-4 text-center text-[11px] text-muted-foreground">
              <p>© 2026 Economizare LTDA — CNPJ 26.682.422/0001-88 — Todos os direitos reservados</p>
            </div>
          </footer>
        </div>
        </>) : <div className="mt-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" /></div>}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center gap-1.5">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setStoreOpen(true)} className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[32px]">
            <Store className="h-5 w-5" />
            <span>Loja</span>
          </button>
        </div>
        <div className="flex-1" />
        <Button onClick={handleBuyNow} className="flex-shrink-0 bg-[#0f7b3f] text-white hover:bg-[#0d6b36] font-bold text-[11px] py-2.5 px-8 h-auto rounded-lg uppercase tracking-wide whitespace-nowrap">
          COMPRAR AGORA
        </Button>
      </div>

      {/* Store Info Modal */}
      {storeOpen && (
        <div className="fixed inset-0 z-[60]" onClick={closeStore}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${storeClosing ? 'opacity-0' : 'opacity-100'}`} />
          <div className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[85vh] overflow-y-auto transition-transform duration-300 mx-auto sm:max-w-md ${storeClosing ? 'translate-y-full' : 'animate-in slide-in-from-bottom'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={closeStore} className="absolute right-3 top-3 rounded-full bg-muted p-1.5"><X className="h-3.5 w-3.5" /></button>
            <div className="px-5 pt-2 pb-3 border-b"><p className="text-base font-bold">Informações da Loja</p></div>
            <div className="px-5 py-4 space-y-5">
              <div className="flex items-center gap-3">
                <img src="/images/eco/logo-economizare.png" alt="Economizare" className="h-12 w-12 rounded-full object-contain border" />
                <div>
                  <p className="font-bold text-sm">Economizare</p>
                  <p className="text-xs text-muted-foreground">Fabricação e Comércio de Peças</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold">4.5 (231 avaliações)</span>
                  </div>
                </div>
              </div>
              <div>
                <span className="font-semibold text-sm">Sobre a Economizare</span>
                <p className="text-sm text-muted-foreground mt-1">Desde 2013, a Economizare utiliza engenharia de precisão para levar economia real a lares e empresas de todo o Brasil. Produto aprovado no Shark Tank Brasil com investimento de João Apolinário.</p>
              </div>
              <div>
                <span className="font-semibold text-sm">Políticas</span>
                <div className="space-y-2 mt-2">
                  <p className="text-sm">📦 Frete grátis para todo o Brasil</p>
                  <p className="text-sm">✅ 1 ano de garantia</p>
                  <p className="text-sm">🔄 Satisfação garantida ou seu dinheiro de volta</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>Economizare LTDA</p>
                <p>CNPJ: 26.682.422/0001-88</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal - 25% OFF */}
      {exitModalOpen && (
        <div className="fixed inset-0 z-[60]" onClick={() => { setExitModalOpen(false); if (!exit2Shown) { setExit2Open(true); setExit2Shown(true); } }}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl mx-auto sm:max-w-md animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={() => { setExitModalOpen(false); if (!exit2Shown) { setExit2Open(true); setExit2Shown(true); } }} className="absolute right-3 top-3 rounded-full bg-muted p-1.5"><X className="h-3.5 w-3.5" /></button>
            <div className="px-5 pt-2 pb-3"><p className="text-base font-bold">Ei, espera! 🎁</p></div>
            <div className="mx-5 rounded-lg bg-green-50 p-3 mb-4 border border-green-300">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Cupom de Desconto</p>
              <p className="text-2xl font-black tracking-wider text-[#0f7b3f] mb-0.5">VOLTA25</p>
              <p className="text-xs"><strong>25% OFF</strong> na sua compra</p>
              <p className="text-xs mt-1.5">⏳ Expira em <strong className="text-destructive">{fmt(countdown.m)}:{fmt(countdown.s)}</strong></p>
            </div>
            <div className="flex items-center gap-3 px-5 pb-4">
              <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1" />
              <div>
                <p className="font-bold text-sm">Bloqueador de Ar Economizare</p>
                <p className="text-xs text-muted-foreground line-through">R$ {OLD_PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-xs text-muted-foreground line-through">R$ {PRICE.toFixed(2).replace('.', ',')}</p>
                <p className="text-[#0f7b3f] font-extrabold text-lg">R$ {(PRICE * 0.75).toFixed(2).replace('.', ',')}</p>
                <span className="inline-block mt-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5">+25% OFF com cupom</span>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => { localStorage.setItem('eco_cart', JSON.stringify({ quantity: 1 })); setExitModalOpen(false); nav(getUrlWithUtm(`/economizare/checkout?cupom=VOLTA25`)); }} className="w-full font-bold text-base py-4 rounded-2xl bg-[#0f7b3f] text-white hover:bg-[#0d6b36] animate-[bounce-soft_2s_ease-in-out_infinite]">
                Aproveitar desconto 🔥 - R$ {(PRICE * 0.75).toFixed(2).replace('.', ',')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Exit Modal - 50% OFF */}
      {exit2Open && (
        <div className="fixed inset-0 z-[60]" onClick={() => setExit2Open(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl mx-auto sm:max-w-md animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
            <button onClick={() => setExit2Open(false)} className="absolute right-3 top-3 rounded-full bg-muted p-1.5"><X className="h-3.5 w-3.5" /></button>
            <div className="px-5 pt-2 pb-3"><p className="text-base font-bold">Última chance! 🔥</p></div>
            <div className="mx-5 rounded-lg bg-destructive/5 p-3 mb-4 border border-destructive/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Oferta Final</p>
              <p className="text-2xl font-black tracking-wider text-destructive mb-0.5">ULTIMA50</p>
              <p className="text-xs"><strong>50% OFF</strong> — só agora!</p>
            </div>
            <div className="flex items-center gap-3 px-5 pb-4">
              <img src="/images/eco/eco-produto-1.png" alt="Economizare" className="h-16 w-16 rounded-lg object-contain border bg-muted/30 p-1" />
              <div>
                <p className="font-bold text-sm">Bloqueador de Ar Economizare</p>
                <p className="text-destructive font-extrabold text-lg">R$ {(PRICE * 0.50).toFixed(2).replace('.', ',')}</p>
                <span className="inline-block mt-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5">+50% OFF com cupom</span>
              </div>
            </div>
            <div className="px-5 pb-6">
              <button onClick={() => { localStorage.setItem('eco_cart', JSON.stringify({ quantity: 1 })); setExit2Open(false); nav(getUrlWithUtm(`/economizare/checkout?cupom=ULTIMA50`)); }} className="w-full font-bold text-base py-4 rounded-2xl bg-destructive text-white hover:bg-destructive/90">
                Garantir com 50% OFF 🔥 - R$ {(PRICE * 0.50).toFixed(2).replace('.', ',')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setShareClosing(true); setTimeout(() => { setShareOpen(false); setShareClosing(false); }, 300); }} />
          <div className={`relative w-full max-w-md bg-background rounded-t-2xl transition-transform duration-300 ${shareClosing ? 'translate-y-full' : 'translate-y-0'}`} style={{ animation: shareClosing ? undefined : 'slideUpShare 0.3s ease-out' }}>
            <style>{`@keyframes slideUpShare { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div className="flex justify-center pt-2.5 pb-1"><div className="w-8 h-[3px] rounded-full bg-border/60" /></div>
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="w-5" />
              <p className="text-[13px] font-medium">Enviar para</p>
              <button onClick={() => { setShareClosing(true); setTimeout(() => { setShareOpen(false); setShareClosing(false); }, 300); }}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </div>
            <div className="flex items-start justify-evenly px-3 pb-5 pt-1">
              {[
                { name: "Copiar\nlink", bg: "bg-muted-foreground", icon: <Link className="h-4 w-4 text-white" />, action: () => { navigator.clipboard.writeText(window.location.href); setCouponCopied(true); setTimeout(() => setCouponCopied(false), 2000); } },
                { name: "WhatsApp", bg: "bg-[#25D366]", icon: <MessageCircle className="h-4 w-4 text-white" />, action: () => window.open(`https://wa.me/?text=${encodeURIComponent('Olha esse produto que reduz a conta de água! ' + window.location.href)}`, '_blank') },
              ].map((item) => (
                <button key={item.name} onClick={item.action} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className={`h-10 w-10 rounded-full ${item.bg} flex items-center justify-center`}>{item.icon}</div>
                  <span className="text-[9px] text-muted-foreground text-center leading-tight whitespace-pre-line">{item.name}</span>
                </button>
              ))}
            </div>
            {couponCopied && <p className="text-center text-[10px] text-cta font-medium pb-2 -mt-2">Link copiado!</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomizareIndex;
