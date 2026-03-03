import { useState, useEffect, useCallback } from "react";
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Check,
  Truck, Shield, Package, Clock, Zap, CheckCircle2, X,
  ChevronDown, Store, Heart, Share2, MoreHorizontal
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

const colorOptions = [
  { id: "branco", name: "Branco Clássico", hex: "#F5F5F0" },
  { id: "preto", name: "Preto Premium", hex: "#1A1A1A" },
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const countdown = useCountdown();

  const openModal = () => {
    setSelectedColor(null);
    setModalOpen(true);
  };

  const handleCheckout = () => {
    if (!selectedColor) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "checkout.php";
    const fields = { product_id: PRODUCT_ID, color: selectedColor, price: String(PRICE), size: selectedSize };
    Object.entries(fields).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = v;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const nextImage = () => setCurrentImage((p) => (p + 1) % productImages.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + productImages.length) % productImages.length);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-card px-4 py-3">
        <X className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-4">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </div>
      </header>

      <div className="container max-w-2xl">
        {/* Product Gallery */}
        <section className="relative bg-card">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={productImages[currentImage]}
              alt="Mesa dobrável"
              className="h-full w-full object-contain transition-all duration-300"
            />
            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-card/70 p-1.5 shadow" aria-label="Anterior">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-card/70 p-1.5 shadow" aria-label="Próxima">
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/60 px-2.5 py-0.5 text-xs font-medium text-card">
              {currentImage + 1}/{productImages.length}
            </span>
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto p-3">
            {productImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImage(i)}
                className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                  i === currentImage ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* Price Section */}
        <section className="mt-2 rounded-lg bg-gradient-to-r from-primary to-cta-hover p-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-wide">Oferta Relâmpago</span>
            <div className="ml-auto flex items-center gap-1 rounded bg-foreground/20 px-2 py-0.5 text-sm font-mono font-bold">
              <span>{fmt(countdown.h)}</span>:<span>{fmt(countdown.m)}</span>:<span>{fmt(countdown.s)}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-lg line-through opacity-70">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="rounded bg-foreground/20 px-2 py-0.5 text-sm font-bold">-{DISCOUNT}%</span>
          </div>
        </section>

        {/* Installments */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-card p-3 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span>6x de <strong className="text-foreground">R$ 18,57</strong> sem juros no cartão</span>
        </div>

        {/* Coupon badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-badge-green px-3 py-1 text-xs font-semibold text-badge-green-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Cupom Aplicado
        </div>

        {/* Title */}
        <h1 className="mt-4 text-lg font-bold leading-tight text-foreground">
          Mesa Dobrável Tipo Maleta Prática e Durável 180x60cm — Portátil, Resistente, Fácil de Montar e Guardar
        </h1>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-bold">4.8</span>
          <span className="text-muted-foreground">(207)</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">4.473 vendidos</span>
        </div>
        <p className="mt-1 text-xs font-medium text-primary">1.2K+ pessoas compraram nos últimos 3 dias</p>

        {/* Shipping */}
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-card p-3">
          <span className="rounded bg-badge-green px-2 py-0.5 text-xs font-bold text-badge-green-foreground">Frete grátis</span>
          <div className="text-sm">
            <span>Receba em <strong>5 - 8 dias úteis</strong></span>
            <div className="text-xs text-muted-foreground">
              Taxa de envio: <span className="line-through">R$ 29,90</span> <span className="font-semibold text-success">Grátis</span>
            </div>
          </div>
        </div>

        {/* Customer Protection */}
        <div className="mt-3 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-sm">Proteção do cliente</span>
            </div>
            <span className="text-xs font-bold text-success">100% Protegido</span>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span>Devolução gratuita em até 7 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span>Reembolso automático por danos</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span>Pagamento seguro e criptografado</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span>Cupom por atraso na entrega</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sua compra é <strong>100% protegida</strong>. Garantimos devolução do valor integral caso o produto não corresponda à descrição.
          </p>
        </div>

        {/* Size Selection */}
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2">Tamanho<span className="text-muted-foreground font-normal ml-1">23 disponíveis</span></p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                  selectedSize === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <section className="mt-8">
          <h2 className="text-lg font-bold mb-1">Avaliações dos clientes (207)</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-black">4.8</span>
            <span className="text-muted-foreground text-sm">/5</span>
            <div className="flex gap-0.5 ml-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
            </div>
          </div>

          <div className="space-y-4">
            {reviews.map((r, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <img src={r.avatar} alt={r.name} className="h-9 w-9 rounded-full object-cover" />
                  <span className="font-semibold text-sm">{r.name}</span>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">{r.text}</p>
                {r.photos.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {r.photos.map((p, i) => (
                      <img key={i} src={p} alt={`Foto ${i + 1}`} className="h-20 w-20 rounded-md object-cover flex-shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Store Info */}
        <section className="mt-6 rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">ML</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm">MesaLar</span>
                <span className="rounded bg-badge-green px-1.5 py-0.5 text-[10px] font-semibold text-badge-green-foreground">Loja Verificada</span>
              </div>
              <p className="text-xs text-muted-foreground">• 706 produtos • 100% recomenda</p>
            </div>
            <button className="ml-auto rounded-full border px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/5">+ Seguir</button>
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
          <h2 className="text-lg font-bold mb-3">Descrição do produto</h2>
          <div className="space-y-4 text-sm leading-relaxed text-foreground/90">
            <p>
              A <strong>Mesa Dobrável Tipo Maleta 180x60cm da MesaLar</strong> é 2 em 1: Mesa de apoio com a portabilidade de uma maleta. Você pode montar, usar e guardar em segundos, sem nenhuma ferramenta! A capacidade total de 180cm permite acomodar até 8 pessoas confortavelmente.
            </p>
            <p className="font-bold uppercase text-foreground">SAIBA MAIS SOBRE A MESA DOBRÁVEL TIPO MALETA:</p>
            <p><strong>2 EM 1: MESA + MALETA:</strong> A família de Mesas Dobráveis MesaLar continua crescendo! O modelo Maleta alia a tecnologia de dobra ao espaço e versatilidade de uma mesa tradicional.</p>
            <img src={productImages[0]} alt="Mesa dobrável" className="w-full rounded-lg" />
            <p><strong>RESISTÊNCIA PROFISSIONAL:</strong> Com tampo em HDPE (plástico de alta densidade) e estrutura em aço tubular com pintura epóxi anticorrosiva, a mesa suporta até <strong>100kg de peso distribuído.</strong></p>
            <p><strong>DESIGN INTELIGENTE:</strong> Cantos arredondados para maior segurança, pés antiderrapantes para estabilidade em qualquer superfície e alça ergonômica para transporte confortável.</p>
            <img src={productImages[4]} alt="Detalhes técnicos" className="w-full rounded-lg" />
            <p><strong>VERSÁTIL PARA TUDO:</strong> Camping, churrascos, feiras, eventos, festas, escritório temporário, área de trabalho, bazares, confraternizações — essa mesa se adapta a qualquer situação.</p>
          </div>
        </section>

        {/* Specs */}
        <section className="mt-6">
          <h2 className="text-lg font-bold mb-3">Especificações Técnicas</h2>
          <div className="rounded-lg border bg-card overflow-hidden">
            {[
              ["Dimensões aberta", "180 x 60 x 74 cm"],
              ["Dimensões fechada", "90 x 60 x 9 cm"],
              ["Peso", "≈ 8 kg"],
              ["Material do tampo", "HDPE (plástico de alta densidade)"],
              ["Estrutura", "Aço tubular c/ pintura epóxi"],
              ["Capacidade", "Até 100 kg"],
              ["Cor", "Branco / Cinza Escuro"],
              ["Pés", "Antiderrapantes em borracha"],
            ].map(([label, value], i) => (
              <div key={i} className={`flex justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-muted/50" : ""}`}>
                <span className="text-muted-foreground font-medium">{label}</span>
                <span className="font-semibold text-right">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Shipping Details */}
        <section className="mt-6">
          <h2 className="text-lg font-bold mb-3">Envio e Entrega</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <Truck className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Frete Grátis para todo o Brasil!</p>
                <p className="text-xs text-muted-foreground mt-0.5">Economize R$ 29,90 no frete — promoção por tempo limitado.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Prazo de entrega</p>
                <p className="text-xs text-muted-foreground mt-0.5">Receba em <strong>5 a 8 dias úteis</strong> após confirmação. Pedidos até 14h são despachados no mesmo dia.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <Shield className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Entrega garantida</p>
                <p className="text-xs text-muted-foreground mt-0.5">Entrega garantida e segurada pelos Correios®. Em caso de extravio ou dano, reenviamos ou devolvemos o valor integral.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-6 mb-8">
          <h2 className="text-lg font-bold mb-3">Perguntas Frequentes</h2>
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

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card px-4 py-3 flex items-center gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-4">
          <button className="flex flex-col items-center text-[10px] text-muted-foreground">
            <Store className="h-5 w-5" />
            Loja
          </button>
          <button className="flex flex-col items-center text-[10px] text-muted-foreground">
            <Heart className="h-5 w-5" />
            Chat
          </button>
        </div>
        <button onClick={openModal} className="flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary">
          <ShoppingCart className="h-4 w-4" />
          Adicionar ao carrinho
        </button>
        <Button onClick={openModal} className="flex-1 bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-sm py-2.5 h-auto rounded-lg">
          COMPRAR AGORA
        </Button>
      </div>

      {/* Color Selection Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Escolha a cor</DialogTitle>
            <DialogDescription>Selecione a cor desejada para finalizar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            {colorOptions.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`flex items-center gap-4 rounded-lg border-2 p-4 transition-all ${
                  selectedColor === color.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="h-12 w-12 rounded-lg border shadow-inner" style={{ backgroundColor: color.hex }} />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-card-foreground">{color.name}</p>
                  <p className="flex items-center gap-1 text-xs text-success">
                    <Check className="h-3.5 w-3.5" /> Em Estoque
                  </p>
                </div>
                {selectedColor === color.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-price">R$ {PRICE.toFixed(2).replace(".", ",")}</span>
            <span className="text-sm line-through text-price-old">R$ {OLD_PRICE.toFixed(2).replace(".", ",")}</span>
          </div>
          <Button
            onClick={handleCheckout}
            disabled={!selectedColor}
            className="w-full bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-base py-3 h-auto disabled:opacity-40 rounded-lg"
          >
            Finalizar Compra
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
