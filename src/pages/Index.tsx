import { useState } from "react";
import { 
  ShieldCheck, Briefcase, Layers, Footprints, Star, 
  ChevronLeft, ChevronRight, ShoppingCart, Check, Truck, 
  Award, Users, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const PRODUCT_ID = "mesa-dobravel-180x60";
const PRODUCT_PRICE = 289.90;

const heroImages = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?w=800&h=600&fit=crop",
];

const features = [
  { icon: ShieldCheck, title: "Resistência", desc: "Suporta até 150kg com total segurança e estabilidade." },
  { icon: Briefcase, title: "Portabilidade", desc: "Dobra e vira maleta com alça. Leve para qualquer lugar." },
  { icon: Layers, title: "Material Premium", desc: "PEAD de alta densidade: resistente a impactos e intempéries." },
  { icon: Footprints, title: "Antiderrapante", desc: "Pés emborrachados que não riscam e não escorregam." },
];

const testimonials = [
  { name: "Carlos M.", text: "Perfeita para churrasco! Resiste a tudo e é fácil de guardar.", rating: 5, avatar: "CM" },
  { name: "Ana Paula S.", text: "Uso em feiras e eventos. A melhor mesa dobrável que já tive.", rating: 5, avatar: "AP" },
  { name: "Roberto L.", text: "Comprei 3 para o restaurante. Qualidade excelente pelo preço.", rating: 4, avatar: "RL" },
];

const faqs = [
  { q: "Qual o prazo de entrega?", a: "Enviamos em até 2 dias úteis. O prazo varia de 3 a 10 dias úteis dependendo da região." },
  { q: "Tem garantia?", a: "Sim! 12 meses de garantia contra defeitos de fabricação." },
  { q: "O frete é grátis?", a: "Frete grátis para todo o Brasil em compras acima de R$ 199,90." },
  { q: "Qual o peso da mesa?", a: "Apenas 12kg quando dobrada, fácil de transportar por uma pessoa." },
  { q: "Posso usar ao ar livre?", a: "Sim! O material PEAD é resistente a sol, chuva e umidade." },
];

const colorOptions = [
  { id: "branco", name: "Branco Clássico", hex: "#F5F5F0" },
  { id: "preto", name: "Preto Premium", hex: "#1A1A1A" },
];

const Index = () => {
  const [currentImage, setCurrentImage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const openModal = () => {
    setSelectedColor(null);
    setModalOpen(true);
  };

  const handleCheckout = () => {
    if (!selectedColor) return;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "checkout.php";
    const fields = { product_id: PRODUCT_ID, color: selectedColor, price: String(PRODUCT_PRICE) };
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

  const nextImage = () => setCurrentImage((p) => (p + 1) % heroImages.length);
  const prevImage = () => setCurrentImage((p) => (p - 1 + heroImages.length) % heroImages.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-accent" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">MesaPro</span>
          </div>
          <Button onClick={openModal} className="bg-cta text-cta-foreground hover:bg-cta-hover font-semibold">
            <ShoppingCart className="mr-2 h-4 w-4" /> Comprar Agora
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-24">
        <div className="container grid gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-6 text-primary-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-cta/20 px-4 py-1.5 text-sm font-medium text-cta-foreground">
              <Timer className="h-4 w-4" /> Oferta por tempo limitado
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Mesa Dobrável<br />Tipo Maleta
            </h1>
            <p className="text-lg text-primary-foreground/80 md:text-xl">
              180×60cm · Suporta 150kg · Dobra em segundos e vira uma maleta portátil. A solução definitiva para eventos, feiras e churrascos.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button onClick={openModal} size="lg" className="bg-cta text-cta-foreground hover:bg-cta-hover animate-pulse-glow text-lg font-bold px-8">
                Garantir Oferta — R$ {PRODUCT_PRICE.toFixed(2).replace(".", ",")}
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1"><Truck className="h-4 w-4" /> Frete Grátis</span>
              <span className="flex items-center gap-1"><Award className="h-4 w-4" /> Garantia 12 meses</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> +2.000 vendidos</span>
            </div>
          </div>

          {/* Carousel */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="overflow-hidden rounded-2xl shadow-2xl aspect-[4/3] bg-muted">
              <img
                src={heroImages[currentImage]}
                alt={`Mesa dobrável imagem ${currentImage + 1}`}
                className="h-full w-full object-cover transition-all duration-500"
              />
            </div>
            <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 shadow-lg hover:bg-card" aria-label="Imagem anterior">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-card/80 p-2 shadow-lg hover:bg-card" aria-label="Próxima imagem">
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${i === currentImage ? "bg-cta w-6" : "bg-card/60"}`}
                  aria-label={`Ir para imagem ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Por que escolher a <span className="text-accent">MesaPro</span>?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-card-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-secondary py-16 md:py-24">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            O que nossos clientes dizem
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < t.rating ? "fill-cta text-cta" : "text-muted"}`} />
                  ))}
                </div>
                <p className="mb-4 text-sm italic text-muted-foreground">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {t.avatar}
                  </div>
                  <span className="font-semibold text-card-foreground">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-12">
        <div className="container text-center text-primary-foreground">
          <h2 className="mb-4 text-3xl font-extrabold md:text-4xl">Pronto para transformar seus eventos?</h2>
          <p className="mb-6 text-lg text-primary-foreground/80">Últimas unidades com frete grátis. Não perca!</p>
          <Button onClick={openModal} size="lg" className="bg-cta text-cta-foreground hover:bg-cta-hover text-lg font-bold px-10 animate-pulse-glow">
            Garantir Minha Mesa — R$ {PRODUCT_PRICE.toFixed(2).replace(".", ",")}
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container max-w-2xl">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Perguntas Frequentes
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 MesaPro. Todos os direitos reservados.</p>
          <p className="mt-1">Mesa Dobrável Tipo Maleta 180×60cm</p>
        </div>
      </footer>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 p-3 backdrop-blur md:hidden">
        <Button onClick={openModal} className="w-full bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-base py-3 h-auto">
          <ShoppingCart className="mr-2 h-5 w-5" /> Comprar Agora — R$ {PRODUCT_PRICE.toFixed(2).replace(".", ",")}
        </Button>
      </div>

      {/* Color Selection Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Escolha a cor da sua mesa</DialogTitle>
            <DialogDescription>Selecione a cor desejada para finalizar a compra.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {colorOptions.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`flex items-center gap-4 rounded-lg border-2 p-4 transition-all ${
                  selectedColor === color.id
                    ? "border-accent bg-accent/5 shadow-md"
                    : "border-border hover:border-accent/50"
                }`}
              >
                <div
                  className="h-12 w-12 rounded-lg border shadow-inner"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-card-foreground">{color.name}</p>
                  <p className="flex items-center gap-1 text-sm text-success">
                    <Check className="h-3.5 w-3.5" /> Em Estoque
                  </p>
                </div>
                {selectedColor === color.id && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                    <Check className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <Button
            onClick={handleCheckout}
            disabled={!selectedColor}
            className="w-full bg-cta text-cta-foreground hover:bg-cta-hover font-bold text-base py-3 h-auto disabled:opacity-40"
          >
            Finalizar Compra — R$ {PRODUCT_PRICE.toFixed(2).replace(".", ",")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
