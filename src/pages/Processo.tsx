import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, Compass, Ruler, Blocks, CheckSquare, Home } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

gsap.registerPlugin(ScrollTrigger);

const timelineSteps = [
  {
    icon: MessageSquare,
    title: "Briefing & Orçamento",
    desc: "Entendemos suas necessidades, área do lote e desejos. Alinhamos expectativas e apresentamos uma proposta transparente.",
    isAction: true,
  },
  {
    icon: Compass,
    title: "Concepção & Viabilidade",
    desc: "Estudos preliminares e viabilidade normativa (Belo Horizonte, Nova Lima, etc). O conceito arquitetônico toma forma.",
  },
  {
    icon: Ruler,
    title: "Projeto Arquitetônico",
    desc: "Definição de plantas, cortes, fachadas e aprovação visual com o cliente.",
  },
  {
    icon: Blocks,
    title: "Projetos Complementares",
    desc: "Desenvolvimento técnico estrutural, elétrico e hidrossanitário em modelo BIM para zero retrabalho.",
  },
  {
    icon: CheckSquare,
    title: "Aprovação Municipal",
    desc: "Assinaturas, protocolo nas prefeituras e condução do processo burocrático até o alvará.",
  },
  {
    icon: Home,
    title: "Entrega Executiva",
    desc: "Pranchas prontas para obra. Tudo detalhado para que o construtor execute com precisão cirúrgica.",
  }
];

const Processo = () => {
  useScrollToTop();
  const lineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Anima a linha central crescendo
      gsap.from(".timeline-line", {
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 60%",
          end: "bottom 80%",
          scrub: true,
        },
        scaleY: 0,
        transformOrigin: "top center",
        ease: "none"
      });

      // Anima os itens surgindo
      gsap.utils.toArray<HTMLElement>(".timeline-item").forEach((item, i) => {
        gsap.from(item, {
          scrollTrigger: {
            trigger: item,
            start: "top 85%",
          },
          x: i % 2 === 0 ? -50 : 50,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out"
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground antialiased selection:bg-accent/30 selection:text-accent-foreground overflow-hidden">
      <Navbar />
      
      <main className="pt-40 pb-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto text-center mb-24">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">Nossa Metodologia</span>
          <h1 className="font-sans font-extrabold text-4xl md:text-5xl lg:text-6xl mt-4 text-foreground leading-tight">
            Linha do Tempo Vertice
          </h1>
          <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto">
            Acompanhe o caminho exato que seu projeto percorre: da primeira conversa até a entrega das pranchas executivas prontas para construir.
          </p>
        </div>

        <div className="max-w-5xl mx-auto relative" ref={containerRef}>
          {/* Linha Central */}
          <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-border transform md:-translate-x-1/2 hidden sm:block"></div>
          <div className="timeline-line absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-accent transform md:-translate-x-1/2 hidden sm:block shadow-[0_0_15px_rgba(var(--accent),0.5)]"></div>

          <div className="space-y-12 md:space-y-24">
            {timelineSteps.map((step, i) => {
              const isEven = i % 2 === 0;
              const Icon = step.icon;

              return (
                <div key={i} className={`timeline-item relative flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  
                  {/* Ponto na linha central */}
                  <div className="absolute left-[16px] md:left-1/2 w-6 h-6 rounded-full bg-background border-4 border-accent transform -translate-x-1/2 mt-6 md:mt-0 z-10 hidden sm:block shadow-[0_0_10px_rgba(var(--accent),0.3)]"></div>

                  {/* Conteúdo */}
                  <div className={`w-full md:w-1/2 pt-6 sm:pt-0 ${isEven ? 'md:pr-16 text-left md:text-right' : 'md:pl-16 text-left'}`}>
                    <div className="bg-surface border border-border p-8 rounded-[2rem] shadow-xl hover:border-accent/50 transition-colors">
                      <div className={`flex items-center gap-4 mb-4 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                          <Icon size={24} />
                        </div>
                        <h3 className="font-sans font-bold text-2xl text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {step.desc}
                      </p>

                      {step.isAction && (
                        <div className={`mt-6 flex ${isEven ? 'md:justify-end' : 'justify-start'}`}>
                          <Link 
                            to="/orcamento"
                            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform"
                          >
                            Solicitar Orçamento Agora <ArrowRight size={18} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Processo;
