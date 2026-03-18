import { useEffect } from "react";

const JesusPage = () => {
  useEffect(() => {
    document.title = "A História de Jesus Cristo — Fé, Esperança e Amor";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Conheça a história de Jesus Cristo, seus ensinamentos de amor, esperança e fé que transformaram o mundo. Um conteúdo inspirador para todos.");
  }, []);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#2d2a26]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#e8e4df] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">✝️</span>
          <h1 className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>
            Fé & Reflexão
          </h1>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <p className="text-sm uppercase tracking-widest text-[#8a7f72] mb-4">Artigo • Leitura de 5 min</p>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-4" style={{ fontFamily: "'Georgia', serif" }}>
          A História de Jesus Cristo: <br className="hidden md:block" />
          Amor, Esperança e Transformação
        </h2>
        <p className="text-[#6b6560] text-lg max-w-xl mx-auto">
          Uma reflexão sobre os ensinamentos que impactaram bilhões de pessoas ao redor do mundo.
        </p>
      </section>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 pb-16">
        <div className="prose prose-lg max-w-none" style={{ fontFamily: "'Georgia', serif", lineHeight: 1.9 }}>
          
          <section className="mb-10">
            <h3 className="text-xl font-bold text-[#3d3832] mb-3">Quem foi Jesus Cristo?</h3>
            <p className="text-[#4a453f] mb-4">
              Jesus de Nazaré é uma das figuras mais influentes da história da humanidade. Nascido em Belém, na região da Judeia, 
              há mais de dois mil anos, seus ensinamentos sobre amor, compaixão e perdão moldaram civilizações inteiras e continuam 
              a inspirar pessoas de todas as culturas e origens.
            </p>
            <p className="text-[#4a453f] mb-4">
              Independentemente de crenças pessoais, a mensagem de Jesus sobre tratar o próximo com dignidade e respeito 
              é universalmente reconhecida como um dos pilares éticos mais importantes da humanidade.
            </p>
          </section>

          <div className="border-l-4 border-[#c9b99a] pl-6 my-8 bg-[#f5f0e8] py-4 pr-4 rounded-r-lg">
            <p className="text-[#5a5347] italic text-lg">
              "Amarás o teu próximo como a ti mesmo."
            </p>
            <span className="text-sm text-[#8a7f72] mt-2 block">— Mateus 22:39</span>
          </div>

          <section className="mb-10">
            <h3 className="text-xl font-bold text-[#3d3832] mb-3">Ensinamentos que Transformam</h3>
            <p className="text-[#4a453f] mb-4">
              Os ensinamentos de Jesus são centrados em valores que transcendem o tempo: o amor incondicional, 
              a importância do perdão, a busca pela paz interior e a solidariedade com os mais necessitados.
            </p>
            <p className="text-[#4a453f] mb-4">
              Ele falava por meio de parábolas — histórias simples com significados profundos — para que pessoas 
              de todas as condições pudessem compreender sua mensagem. A Parábola do Bom Samaritano, por exemplo, 
              ensina sobre compaixão além das fronteiras sociais e culturais.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-xl font-bold text-[#3d3832] mb-3">O Poder do Perdão</h3>
            <p className="text-[#4a453f] mb-4">
              Um dos ensinamentos mais revolucionários de Jesus foi sobre o perdão. Em uma época marcada pela lei de "olho por olho", 
              ele propôs uma nova forma de viver: perdoar não apenas uma vez, mas setenta vezes sete — ou seja, sempre.
            </p>
            <p className="text-[#4a453f] mb-4">
              Estudos modernos de psicologia confirmam que o perdão é uma das práticas mais poderosas para a saúde mental. 
              Pessoas que praticam o perdão regularmente apresentam menores níveis de estresse, ansiedade e depressão.
            </p>
          </section>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-[#e8e4df] my-8">
            <h4 className="font-bold text-[#3d3832] mb-4 text-center">5 Lições de Jesus para o Dia a Dia</h4>
            <div className="space-y-3">
              {[
                { icon: "❤️", title: "Ame sem condições", desc: "Pratique a empatia e a bondade com todos ao seu redor." },
                { icon: "🕊️", title: "Busque a paz", desc: "Seja um instrumento de reconciliação e harmonia." },
                { icon: "🤝", title: "Sirva ao próximo", desc: "A verdadeira grandeza está em servir os outros." },
                { icon: "🙏", title: "Perdoe sempre", desc: "Liberte-se do peso do rancor através do perdão." },
                { icon: "🌱", title: "Tenha esperança", desc: "Mesmo nos momentos difíceis, mantenha a fé em dias melhores." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#faf9f6] transition-colors">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-[#3d3832]">{item.title}</p>
                    <p className="text-sm text-[#6b6560]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <section className="mb-10">
            <h3 className="text-xl font-bold text-[#3d3832] mb-3">Esperança em Tempos Difíceis</h3>
            <p className="text-[#4a453f] mb-4">
              A mensagem de esperança de Jesus é especialmente relevante nos dias atuais. Em um mundo marcado por incertezas, 
              seus ensinamentos nos lembram que é possível encontrar paz interior, propósito e alegria mesmo em meio às adversidades.
            </p>
            <p className="text-[#4a453f] mb-4">
              A fé, segundo Jesus, não é apenas uma crença abstrata — é uma força transformadora que nos impulsiona a agir, 
              a cuidar uns dos outros e a construir um mundo mais justo e compassivo.
            </p>
          </section>

          <div className="border-l-4 border-[#c9b99a] pl-6 my-8 bg-[#f5f0e8] py-4 pr-4 rounded-r-lg">
            <p className="text-[#5a5347] italic text-lg">
              "Eu sou o caminho, a verdade e a vida."
            </p>
            <span className="text-sm text-[#8a7f72] mt-2 block">— João 14:6</span>
          </div>

          <section className="mb-10">
            <h3 className="text-xl font-bold text-[#3d3832] mb-3">Um Legado Eterno</h3>
            <p className="text-[#4a453f] mb-4">
              Mais de dois bilhões de pessoas em todo o mundo seguem os ensinamentos de Jesus Cristo. 
              Seu impacto na arte, na cultura, na ética e na legislação é imensurável. Hospitais, escolas e 
              organizações humanitárias foram fundados inspirados por sua mensagem de amor e serviço.
            </p>
            <p className="text-[#4a453f] mb-4">
              Independentemente de sua perspectiva pessoal, os valores ensinados por Jesus — amor, perdão, 
              esperança e compaixão — são princípios que podem transformar vidas e comunidades para melhor.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[#e8e4df] text-center">
          <p className="text-sm text-[#8a7f72] mb-2">
            Este conteúdo é de caráter informativo e educacional.
          </p>
          <p className="text-xs text-[#a89f94]">
            © {new Date().getFullYear()} Fé & Reflexão — Todos os direitos reservados.
          </p>
        </footer>
      </article>
    </div>
  );
};

export default JesusPage;
