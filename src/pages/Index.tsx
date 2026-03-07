import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Check,
  Truck, Shield, Package, Clock, Zap, CheckCircle2, X,
  Store, MessageCircle, Share2, MoreHorizontal, Gift, Copy,
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
  "/images/mesa-branca-principal.png",
  "/images/mesa-preta-principal.png",
  "/images/desc-tamanho.png",
  "/images/desc-superficie3d.png",
  "/images/desc-portatil.png",
  "/images/desc-espaco.png",
  "/images/desc-transporte.png",
];

const colorImages = {
  branca: "/images/produto-1.webp",
  preta: "/images/mesa-preta-detalhes.png",
};

const sizes = ["120x60cm", "150x60cm", "180x60cm", "240x60cm"];

const reviews = [
  {
    name: "Carla S.",
    avatar: "/images/avatar-carla.png",
    text: "A mesa é bem grande, boa demais! Espaçosa e super prática — montei em segundos e usei para o churrasco com a família toda. Muito resistente, suporta bastante peso sem tremer!",
    rating: 5,
    photos: ["/images/review-carla-1.png", "/images/review-carla-2.png"],
  },
  {
    name: "Patrícia F.",
    avatar: "/images/avatar-patricia.png",
    text: "Ela é muito prática. Material bom, custo muito bom. Amei, pretendo comprar outra!",
    rating: 5,
    photos: ["/images/review-patricia-1.png", "/images/review-patricia-2.png"],
  },
  {
    name: "Raquel M.",
    avatar: "/images/avatar-raquel.png",
    text: "Ela é linda, bem resistente. Me surpreendi com a qualidade, vou usar muito! Chegou no dia certinho.",
    rating: 5,
    photos: ["/images/review-raquel-1.png", "/images/review-raquel-2.png", "/images/review-raquel-3.png"],
  },
  {
    name: "Karine Porto",
    avatar: "/images/avatar-karine.png",
    text: "Muito boa, bem reforçada. Veio bem embalada na caixa, sem avarias. Gostei muito da mesa!",
    rating: 5,
    photos: ["/images/review-karine-1.png", "/images/review-karine-2.png", "/images/review-karine-3.png"],
  },
  {
    name: "Juliana P.",
    avatar: "/images/avatar-juliana.png",
    text: "Adorei a minha compra! Chegou no prazo, veio bem embalada. A mesa é linda e muito resistente. Ideal para quem tem pouco espaço, ela é bem fácil para montar. Gosteiii muitoooooo! 😍",
    rating: 5,
    photos: ["/images/review-juliana-1.png", "/images/review-juliana-2.png"],
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
  const [time, setTime] = useState({ h: 2, m: 42, s: 52 });
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
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState("180x60cm");
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitShown, setExitShown] = useState(false);
  const [couponCopied, setCouponCopied] = useState(false);
  const countdown = useCountdown();

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitShown) {
        setExitModalOpen(true);
        setExitShown(true);
      }
    };

    // Back button / popstate detection
    const handlePopState = () => {
      if (!exitShown) {
        window.history.pushState(null, "", window.location.href);
        setExitModalOpen(true);
        setExitShown(true);
      }
    };

    // Push initial state
    window.history.pushState(null, "", window.location.href);

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [exitShown]);

  const openColorModal = () => {
    setSelectedColor(null);
    setColorModalOpen(true);
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
          <X className="h-5 w-5 text-muted-foreground cursor-pointer" />
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
          <div className="relative aspect-[4/3] sm:aspect-[4/3] overflow-hidden bg-card">
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
        <section className="mx-4 mt-2 rounded-xl bg-gradient-to-r from-primary to-[hsl(15,90%,48%)] p-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Oferta Relâmpago</span>
            <div className="ml-auto flex items-center gap-1">
              {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-0.5 font-bold">:</span>}
                  <span className="rounded bg-primary-foreground/20 px-1.5 py-0.5 text-sm font-mono font-bold">{fmt(v)}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[2rem] font-black leading-none">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-base line-through opacity-60">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="rounded bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold">-{DISCOUNT}%</span>
          </div>
        </section>

        <div className="px-4">
          {/* Installments */}
          <div className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>6x de <strong>R$ 18,57</strong> sem juros no cartão</span>
          </div>

          {/* Coupon badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-badge-green px-3 py-1 text-xs font-semibold text-badge-green-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Cupom Aplicado
          </div>

          {/* Title */}
          <h1 className="mt-4 text-base font-bold leading-snug text-foreground">
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
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded bg-badge-green px-2 py-0.5 text-xs font-bold text-badge-green-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" /> Frete grátis
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
                <Shield className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-sm">Proteção do cliente</span>
              </div>
              <span className="text-xs font-bold text-success">100% Protegido</span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                "Devolução gratuita em até 7 dias",
                "Reembolso automático por danos",
                "Pagamento seguro e criptografado",
                "Cupom por atraso na entrega",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sua compra é <strong>100% protegida</strong>. Garantimos devolução do valor integral caso o produto não corresponda à descrição.
            </p>
          </div>

          {/* Size Selection */}
          <div className="mt-5">
            <p className="text-sm font-semibold mb-2">
              Tamanho<span className="text-muted-foreground font-normal ml-1">1 disponível</span>
            </p>
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
                        ? "border-primary bg-primary/10 text-primary"
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

          {/* Reviews */}
          <section className="mt-8">
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
          </section>

          {/* Store Info */}
          <section className="mt-6 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <img src="/images/logo-mesalar.png" alt="MesaLar" className="h-10 w-10 rounded-full object-cover" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm">MesaLar</span>
                  <span className="rounded bg-badge-green px-1.5 py-0.5 text-[10px] font-semibold text-badge-green-foreground">Loja Verificada</span>
                </div>
                <p className="text-xs text-muted-foreground">• 706 produtos • 100% recomenda</p>
              </div>
              <button className="rounded-full border px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted">+ Seguir</button>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Confiança:</span>
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-full rounded-full bg-success" />
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
              <img src="/images/desc-maleta.png" alt="Mesa dobrável tipo maleta" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ LEVE E PORTÁTIL:</strong> Design compacto tipo maleta com alça embutida. Fecha como uma mala e cabe em qualquer canto. Leve para camping, festas, feiras ou simplesmente guarde em casa sem ocupar espaço.</p>
              <img src="/images/desc-montagem.png" alt="Monte em apenas 6 passos" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ MONTAGEM INSTANTÂNEA:</strong> Monte e desmonte em menos de 30 segundos, sem ferramentas! São apenas 6 passos simples — qualquer pessoa consegue montar sozinha, sem esforço.</p>
              <img src="/images/desc-qualidade.png" alt="Detalhes de qualidade" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ CONSTRUÇÃO REFORÇADA:</strong> Alça de transporte ergonômica, trava de segurança que impede dobramentos acidentais e tampo em HDPE com espessura larga. Material profissional que dura anos.</p>
              <img src="/images/desc-pes.png" alt="Pés antiderrapantes" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ PÉS ANTIDERRAPANTES:</strong> Borrachas nos pés que protegem seu piso contra riscos e garantem estabilidade total. A mesa não escorrega nem se move durante o uso, mesmo em superfícies lisas.</p>
              <img src="/images/desc-dimensoes.png" alt="Dimensões e capacidade" className="w-full rounded-xl" loading="lazy" />
              <p><strong>✅ LEVE E RESISTENTE:</strong> Pesa apenas 11kg mas suporta até 150kg de peso distribuído! Estrutura em aço tubular com pintura anticorrosiva. Acomoda até 8 pessoas com conforto.</p>
              <img src="/images/desc-versatilidade.png" alt="Versatilidade de ocasiões" className="w-full rounded-xl" loading="lazy" />
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
            <div className="space-y-3">
              {[
                { icon: Truck, color: "text-success", title: "Frete Grátis para todo o Brasil!", desc: "Economize R$ 29,90 no frete — promoção por tempo limitado." },
                { icon: Clock, color: "text-primary", title: "Prazo de entrega", desc: "Receba em 5 a 8 dias úteis após confirmação do pagamento. Pedidos feitos até 14h são despachados no mesmo dia." },
                { icon: Package, color: "text-primary", title: "Rastreamento completo", desc: "Acompanhe seu pedido em tempo real pelo código de rastreio enviado por e-mail e WhatsApp logo após o despacho." },
                { icon: Shield, color: "text-success", title: "Entrega garantida", desc: "Entrega garantida e segurada pelos Correios®. Em caso de extravio ou dano no transporte, reenviamos o produto ou devolvemos o valor integral sem custo." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border p-4">
                  <item.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${item.color}`} />
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              Envio rápido, seguro e com rastreamento para <strong>todos os estados do Brasil</strong>. Aproveite essa oferta e leve a praticidade da Mesa Dobrável para o seu dia a dia!
            </p>
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
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-2 py-2 sm:px-3 sm:py-2.5 flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[28px]">
            <Store className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Loja</span>
          </button>
          <button className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5 min-w-[28px]">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Chat</span>
          </button>
        </div>
        <button onClick={openColorModal} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-cta px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-cta whitespace-nowrap">
          <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          Adicionar ao carrinho
        </button>
        <Button onClick={openColorModal} className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-xs sm:text-sm py-2.5 sm:py-3 h-auto rounded-lg uppercase tracking-wide">
          Comprar Agora
        </Button>
      </div>

      {/* Color Selection Modal - Slide from bottom like reference */}
      <Dialog open={colorModalOpen} onOpenChange={setColorModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <DialogTitle className="text-base font-bold">Escolha a cor</DialogTitle>
            <DialogDescription className="sr-only">Selecione a cor da mesa</DialogDescription>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {[
              { id: "branca", name: "Branca", img: colorImages.branca },
              { id: "preta", name: "Preta", img: colorImages.preta },
            ].map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  selectedColor === color.id
                    ? "border-foreground shadow-lg"
                    : "border-border hover:border-foreground/30"
                }`}
              >
                <div className="aspect-[4/3] bg-muted/30 p-2">
                  <img src={color.img} alt={color.name} className="h-full w-full object-contain" />
                </div>
                <p className="py-2.5 text-center text-sm font-medium">{color.name}</p>
              </button>
            ))}
          </div>
          <div className="px-4 pb-4">
            <Button
              onClick={handleCheckout}
              disabled={!selectedColor}
              className="w-full bg-muted text-muted-foreground hover:bg-cta hover:text-cta-foreground font-bold text-base py-3.5 h-auto rounded-xl disabled:opacity-50 transition-colors data-[active=true]:bg-cta data-[active=true]:text-cta-foreground"
              data-active={!!selectedColor}
            >
              Comprar agora
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exit Intent Modal - VOLTA25 */}
      <Dialog open={exitModalOpen} onOpenChange={setExitModalOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl p-6 text-center">
          <DialogDescription className="sr-only">Cupom de desconto exclusivo</DialogDescription>
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coupon-bg mb-4">
              <Gift className="h-8 w-8 text-coupon-text" />
            </div>
            <DialogTitle className="text-xl font-bold mb-2">Ei, espera! 🎁</DialogTitle>
            <p className="text-sm text-muted-foreground mb-5">
              Preparamos um <strong className="text-coupon-text">desconto exclusivo</strong> pra você não sair de mãos vazias!
            </p>

            {/* Coupon Box */}
            <div className="w-full rounded-xl border-2 border-dashed border-coupon-border bg-coupon-bg p-4 mb-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Cupom de Desconto</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-black tracking-wider text-foreground">VOLTA25</span>
                <button
                  onClick={copyCoupon}
                  className="flex items-center gap-1 text-sm font-semibold text-coupon-text hover:underline"
                >
                  <Copy className="h-4 w-4" />
                  {couponCopied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-sm mt-1"><strong>25% OFF</strong> na sua compra</p>
            </div>

            <Button
              onClick={() => {
                setExitModalOpen(false);
                openColorModal();
              }}
              className="w-full bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-base py-3.5 h-auto rounded-xl"
            >
              Aproveitar desconto 🔥
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Válido por tempo limitado. Não perca!</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
