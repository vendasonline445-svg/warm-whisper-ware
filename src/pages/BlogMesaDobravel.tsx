import { useState } from "react";
import { CheckCircle2, Star, Truck, ShieldCheck, Clock, Users, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

const benefits = [
  {
    icon: Sparkles,
    title: "Design Moderno e Elegante",
    text: "Com acabamento premium em MDF e estrutura tubular de aço carbono, a mesa dobrável se encaixa em qualquer ambiente — da cozinha ao escritório, do apartamento pequeno à área gourmet.",
  },
  {
    icon: Clock,
    title: "Monta e Desmonta em Segundos",
    text: "Sem ferramentas, sem complicação. O sistema de dobra rápida permite que você abra ou guarde a mesa em menos de 10 segundos. Ideal para quem precisa de praticidade no dia a dia.",
  },
  {
    icon: Users,
    title: "Para Toda a Família",
    text: "Com capacidade para até 4 pessoas confortavelmente, ela é perfeita para refeições em família, home office, estudos, jogos de tabuleiro ou receber visitas inesperadas.",
  },
  {
    icon: ShieldCheck,
    title: "Resistente e Durável",
    text: "A estrutura em aço carbono com pintura eletrostática garante resistência à corrosão e ao desgaste. O tampo em MDF laminado resiste a riscos e é fácil de limpar.",
  },
  {
    icon: Truck,
    title: "Frete Grátis para Todo o Brasil",
    text: "Receba diretamente na sua casa sem pagar nada a mais pelo envio. Entregamos para todas as regiões do país com rastreamento completo.",
  },
];

const useCases = [
  "Apartamentos compactos que precisam otimizar espaço",
  "Home office temporário ou permanente",
  "Mesa extra para receber visitas e amigos",
  "Área de estudos para crianças e adultos",
  "Uso em varandas, áreas gourmet e churrasqueiras",
  "Feiras, bazares e eventos ao ar livre",
  "Acampamentos e viagens de motorhome",
];

const specs = [
  { label: "Material do tampo", value: "MDF laminado de alta densidade" },
  { label: "Estrutura", value: "Aço carbono com pintura eletrostática" },
  { label: "Dimensões aberta", value: "80cm x 60cm x 74cm" },
  { label: "Dimensões dobrada", value: "80cm x 60cm x 4,5cm" },
  { label: "Peso", value: "Apenas 5,2 kg" },
  { label: "Capacidade", value: "Até 30 kg de carga" },
  { label: "Cores disponíveis", value: "Preto, Branco e Madeira Natural" },
];

export default function BlogMesaDobravel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <section className="space-y-4">
          <div className="rounded-2xl overflow-hidden aspect-video bg-muted">
            <img
              src="https://cdn.shopify.com/s/files/1/0783/5378/8945/files/mesa-dobravel-hero.jpg?v=1735000000"
              alt="Mesa dobrável portátil em ambiente moderno"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            Mesa Dobrável Portátil: O Móvel Que Está Transformando Pequenos Espaços em 2025
          </h1>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Publicado em 18 de Março, 2025</span>
            <span>·</span>
            <span>5 min de leitura</span>
          </div>
        </section>

        {/* Intro */}
        <section className="prose prose-sm max-w-none space-y-4">
          <p className="text-base leading-relaxed text-muted-foreground">
            Se você mora em apartamento pequeno, trabalha de casa ou simplesmente gosta de praticidade,
            já deve ter sentido a falta de uma mesa que <strong className="text-foreground">aparece quando você precisa e desaparece
            quando não precisa mais</strong>. É exatamente isso que a Mesa Dobrável Portátil oferece.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Com mais de <strong className="text-foreground">4.500 unidades vendidas</strong> nos últimos meses e uma nota média
            de <strong className="text-foreground">4.8 estrelas</strong>, ela se tornou o acessório favorito de quem busca funcionalidade
            sem abrir mão do estilo. Neste artigo, vamos te mostrar por que ela é tão especial.
          </p>
        </section>

        {/* Rating badge */}
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-4 border border-border">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-5 w-5 ${s <= 4 ? "text-amber-400 fill-amber-400" : "text-amber-400 fill-amber-400/50"}`} />
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold">4.8 de 5 estrelas</p>
            <p className="text-xs text-muted-foreground">Baseado em 847 avaliações verificadas</p>
          </div>
        </div>

        {/* Benefits */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold">5 Motivos Para Ter Uma Mesa Dobrável em Casa</h2>
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Para Quem é a Mesa Dobrável?</h2>
          <p className="text-sm text-muted-foreground">
            A versatilidade é o ponto forte desse produto. Confira algumas situações em que ela brilha:
          </p>
          <ul className="space-y-2.5">
            {useCases.map((u, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Specs */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Ficha Técnica</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            {specs.map((s, i) => (
              <div key={i} className={`flex justify-between px-4 py-3 text-sm ${i % 2 === 0 ? "bg-muted/30" : ""}`}>
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium text-right">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">O Que Nossos Clientes Dizem</h2>
          <div className="space-y-3">
            {[
              { name: "Camila R.", city: "São Paulo, SP", text: "Moro em um apartamento de 35m² e essa mesa foi a melhor coisa que comprei. Uso para comer, trabalhar e guardar quando preciso de espaço." },
              { name: "Roberto S.", city: "Belo Horizonte, MG", text: "Qualidade impressionante. Já tive mesas dobráveis antes, mas essa é de outro nível. Firme, bonita e super leve." },
              { name: "Ana Paula M.", city: "Curitiba, PR", text: "Comprei para usar na varanda nos fins de semana. Meus amigos sempre perguntam onde comprei. Recomendo demais!" },
            ].map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">"{t.text}"</p>
                <p className="text-xs font-medium">{t.name} <span className="text-muted-foreground font-normal">— {t.city}</span></p>
              </div>
            ))}
          </div>
        </section>

        {/* Conclusion */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Vale a Pena Comprar?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Se você busca um móvel que une <strong className="text-foreground">praticidade, design e durabilidade</strong>,
            a Mesa Dobrável Portátil é uma escolha certeira. Ela resolve um problema real — falta de espaço —
            sem comprometer a estética do seu ambiente.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Com milhares de clientes satisfeitos, frete grátis e uma qualidade que você sente logo na primeira vez
            que monta, essa mesa é um investimento inteligente para o seu lar.
          </p>
        </section>


        {/* Footer note */}
        <p className="text-xs text-center text-muted-foreground pb-8">
          © 2025 — Conteúdo informativo. Todos os direitos reservados.
        </p>
      </main>
    </div>
  );
}
