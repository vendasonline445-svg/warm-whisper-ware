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
  "https://mesa-dobravel-oferta.lovable.app/assets/produto-2-DPO39cuV.webp",
  "https://mesa-dobravel-oferta.lovable.app/assets/mesa-preta-detalhes-DZr1TaUa.png",
  "https://mesa-dobravel-oferta.lovable.app/assets/produto-5-CRqamHyQ.webp",
  "https://mesa-dobravel-oferta.lovable.app/assets/produto-1-CodPfocH.webp",
  "https://mesa-dobravel-oferta.lovable.app/assets/produto-3-CLF4fNEr.webp",
  "https://mesa-dobravel-oferta.lovable.app/assets/mesa-instalacao-DqBY8UsG.webp",
];

const colorImages = {
  branca: "https://mesa-dobravel-oferta.lovable.app/assets/produto-1-CodPfocH.webp",
  preta: "https://mesa-dobravel-oferta.lovable.app/assets/mesa-preta-detalhes-DZr1TaUa.png",
};

const sizes = ["120x60cm", "150x60cm", "180x60cm", "240x60cm"];

const reviews = [
  {
    name: "Carla S.",
    avatar: "https://mesa-dobravel-oferta.lovable.app/assets/avatar-carla-aeMpPbWr.png",
    text: "A mesa é bem grande, boa demais! Espaçosa e super prática — montei em segundos e usei para o churrasco com a família toda. Muito resistente, suporta bastante peso sem tremer!",
    rating: 5,
    photos: [
      "https://mesa-dobravel-oferta.lovable.app/assets/review-carla-1-CU1UsLFJ.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-carla-2-BrVkzVRE.png",
    ],
  },
  {
    name: "Patrícia F.",
    avatar: "https://mesa-dobravel-oferta.lovable.app/assets/avatar-patricia-new-COpXt4yW.png",
    text: "Ela é muito prática. Material bom, custo muito bom. Amei, pretendo comprar outra!",
    rating: 5,
    photos: [
      "https://mesa-dobravel-oferta.lovable.app/assets/review-patricia-1-BxwuYR10.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-patricia-2-D97d3Dqg.png",
    ],
  },
  {
    name: "Raquel M.",
    avatar: "https://mesa-dobravel-oferta.lovable.app/assets/avatar-raquel-BFyrtPYy.png",
    text: "Ela é linda, bem resistente. Me surpreendi com a qualidade, vou usar muito! Chegou no dia certinho.",
    rating: 5,
    photos: [
      "https://mesa-dobravel-oferta.lovable.app/assets/review-raquel-1-BWV94PY6.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-raquel-2-6JJykarJ.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-raquel-3-BxbMK-1E.png",
    ],
  },
  {
    name: "Karine Porto",
    avatar: "https://mesa-dobravel-oferta.lovable.app/assets/avatar-karine-BJKkhTJJ.png",
    text: "Muito boa, bem reforçada. Veio bem embalada na caixa, sem avarias. Gostei muito da mesa!",
    rating: 5,
    photos: [
      "https://mesa-dobravel-oferta.lovable.app/assets/review-karine-1-DyFAGtlb.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-karine-2-DGpHgBcM.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-karine-3-V4KjEUPz.png",
    ],
  },
  {
    name: "Juliana P.",
    avatar: "https://mesa-dobravel-oferta.lovable.app/assets/avatar-juliana-CgdpHBym.png",
    text: "Adorei a minha compra! Chegou no prazo, veio bem embalada. A mesa é linda e muito resistente. Ideal para quem tem pouco espaço, ela é bem fácil para montar. Gosteiii muitoooooo! 😍",
    rating: 5,
    photos: [
      "https://mesa-dobravel-oferta.lovable.app/assets/review-juliana-1-5GEzRZ41.png",
      "https://mesa-dobravel-oferta.lovable.app/assets/review-juliana-2-9iUjyThJ.png",
    ],
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
    <div className="min-h-screen bg-background pb-[72px]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3">
        <X className="h-5 w-5 text-muted-foreground cursor-pointer" />
        <div className="flex items-center gap-5">
          <Share2 className="h-5 w-5 text-muted-foreground cursor-pointer" />
          <ShoppingCart className="h-5 w-5 text-muted-foreground cursor-pointer" />
          <MoreHorizontal className="h-5 w-5 text-muted-foreground cursor-pointer" />
        </div>
      </header>

      <div className="mx-auto max-w-[720px]">
        {/* Product Gallery */}
        <section className="bg-card">
          <div className="relative aspect-square overflow-hidden bg-card">
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
              Tamanho<span className="text-muted-foreground font-normal ml-1">23 disponíveis</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSize(s)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                    selectedSize === s
                      ? "border-foreground bg-foreground text-card"
                      : "border-border text-foreground hover:border-foreground/40"
                  }`}
                >
                  {s}
                </button>
              ))}
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
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {reviews.map((r, idx) => (
                <div key={idx} className="rounded-xl border p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={r.avatar} alt={r.name} className="h-9 w-9 rounded-full object-cover" />
                    <span className="font-semibold text-sm">{r.name}</span>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">{r.text}</p>
                  {r.photos.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto">
                      {r.photos.map((p, i) => (
                        <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-lg object-cover flex-shrink-0" />
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-card">ML</div>
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
                A <strong>Mesa Dobrável Tipo Maleta 180x60cm da MesaLar</strong> é 2 em 1: Mesa de apoio com a portabilidade de uma maleta. Você pode montar, usar e guardar em segundos, sem nenhuma ferramenta!
              </p>
              <p className="font-bold uppercase text-foreground text-xs tracking-wide">SAIBA MAIS SOBRE A MESA DOBRÁVEL TIPO MALETA:</p>
              <p><strong>2 EM 1: MESA + MALETA:</strong> O modelo Maleta alia a tecnologia de dobra ao espaço e versatilidade de uma mesa tradicional.</p>
              <img src={productImages[0]} alt="Mesa dobrável" className="w-full rounded-xl" loading="lazy" />
              <p><strong>RESISTÊNCIA PROFISSIONAL:</strong> Tampo em HDPE e estrutura em aço tubular com pintura epóxi anticorrosiva, suportando até <strong>100kg de peso distribuído.</strong></p>
              <p><strong>DESIGN INTELIGENTE:</strong> Cantos arredondados, pés antiderrapantes e alça ergonômica para transporte confortável.</p>
              <img src={productImages[4]} alt="Detalhes técnicos" className="w-full rounded-xl" loading="lazy" />
              <p><strong>VERSÁTIL PARA TUDO:</strong> Camping, churrascos, feiras, eventos, festas, escritório temporário, bazares — essa mesa se adapta a qualquer situação.</p>
            </div>
          </section>

          {/* Specs */}
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Especificações Técnicas</h2>
            <div className="rounded-xl border overflow-hidden">
              {[
                ["Dimensões aberta", "180 x 60 x 74 cm"],
                ["Dimensões fechada", "90 x 60 x 9 cm"],
                ["Peso", "≈ 8 kg"],
                ["Material do tampo", "HDPE (alta densidade)"],
                ["Estrutura", "Aço tubular c/ epóxi"],
                ["Capacidade", "Até 100 kg"],
                ["Cor", "Branco / Cinza Escuro"],
                ["Pés", "Antiderrapantes"],
              ].map(([label, value], i) => (
                <div key={i} className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-muted/50" : ""}`}>
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping Details */}
          <section className="mt-6">
            <h2 className="text-base font-bold mb-3">Envio e Entrega</h2>
            <div className="space-y-3">
              {[
                { icon: Truck, color: "text-success", title: "Frete Grátis para todo o Brasil!", desc: "Economize R$ 29,90 no frete — promoção por tempo limitado." },
                { icon: Clock, color: "text-primary", title: "Prazo de entrega", desc: "Receba em 5 a 8 dias úteis. Pedidos até 14h são despachados no mesmo dia." },
                { icon: Shield, color: "text-success", title: "Entrega garantida", desc: "Segurada pelos Correios®. Extravio ou dano = reenvio ou reembolso." },
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
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-3 py-2.5 flex items-center gap-2 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3">
          <button className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5">
            <Store className="h-5 w-5" />
            <span>Loja</span>
          </button>
          <button className="flex flex-col items-center text-[10px] text-muted-foreground gap-0.5">
            <MessageCircle className="h-5 w-5" />
            <span>Chat</span>
          </button>
        </div>
        <button onClick={openColorModal} className="flex items-center gap-1.5 rounded-lg border border-cta px-3 py-2.5 text-sm font-semibold text-cta whitespace-nowrap">
          <ShoppingCart className="h-4 w-4" />
          Adicionar ao carrinho
        </button>
        <Button onClick={openColorModal} className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-sm py-2.5 h-auto rounded-lg uppercase tracking-wide">
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
