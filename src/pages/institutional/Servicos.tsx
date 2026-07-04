import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Layers, Zap, Droplets, HardHat } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

gsap.registerPlugin(ScrollTrigger);

/* ─── Card 1: Arquitetônico ─── */
const ArqCard = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".arq-layer", {
        rotateX: 60,
        rotateZ: 45,
        y: (i) => i * -20,
        opacity: (i) => 1 - (i * 0.2),
        duration: 2,
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
        ease: "power2.inOut"
      });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-surface border border-border rounded-[2rem] p-5 md:p-8 shadow-2xl h-auto min-h-[16rem] md:h-80 flex flex-col justify-between overflow-hidden" ref={container}>
      <div>
        <h3 className="font-sans font-bold text-2xl text-foreground">Projeto Arquitetônico</h3>
        <p className="text-muted-foreground text-sm mt-2">Concepção espacial e funcional, aliando estética à viabilidade técnica.</p>
      </div>
      
      <div className="relative h-40 w-full mt-4 flex items-center justify-center perspective-[1000px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="arq-layer absolute w-2/3 h-24 border-2 border-accent bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(var(--accent),0.2)]">
            <Layers className="text-accent/80" />
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Card 2: Estrutural ─── */
const EstCard = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".beam-horizontal", { scaleX: 1.2, duration: 1, repeat: -1, yoyo: true, ease: "power1.inOut", stagger: 0.1 });
      gsap.to(".beam-vertical", { scaleY: 1.2, duration: 1.5, repeat: -1, yoyo: true, ease: "power1.inOut", stagger: 0.1 });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-surface border border-border rounded-[2rem] p-5 md:p-8 shadow-2xl h-auto min-h-[16rem] md:h-80 flex flex-col justify-between" ref={container}>
      <div>
        <h3 className="font-sans font-bold text-2xl text-foreground">Projeto Estrutural</h3>
        <p className="text-muted-foreground text-sm mt-2">Dimensionamento seguro com profissional habilitado (CREA). Foco em economia e robustez.</p>
      </div>
      
      <div className="relative border border-border rounded-xl h-40 bg-navy-dark overflow-hidden flex flex-col justify-center items-center gap-4 mt-4">
        {/* Abstract structural grid */}
        <div className="w-3/4 h-2 beam-horizontal bg-foreground shadow-[0_0_5px_#fff]"></div>
        <div className="flex gap-12 h-16">
          <div className="w-2 h-full beam-vertical bg-foreground shadow-[0_0_5px_#fff]"></div>
          <div className="w-2 h-full beam-vertical bg-foreground shadow-[0_0_5px_#fff]"></div>
          <div className="w-2 h-full beam-vertical bg-foreground shadow-[0_0_5px_#fff]"></div>
        </div>
        <div className="w-3/4 h-2 beam-horizontal bg-foreground shadow-[0_0_5px_#fff]"></div>
        
        <HardHat size={16} className="absolute bottom-2 right-2 text-white/50" />
      </div>
    </div>
  );
};

/* ─── Card 3: Elétrico ─── */
const EletricoCard = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 });
      tl.to(".energy-node", { opacity: 1, duration: 0.2, stagger: 0.1 })
        .to(".energy-node", { opacity: 0.2, duration: 0.5, stagger: 0.1 }, "+=0.5");
        
      gsap.to(".circuit-line", { strokeDashoffset: -100, duration: 2, repeat: -1, ease: "linear" });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-surface border border-border rounded-[2rem] p-5 md:p-8 shadow-2xl h-auto min-h-[16rem] md:h-80 flex flex-col justify-between" ref={container}>
      <div>
        <h3 className="font-sans font-bold text-2xl text-foreground">Projeto Elétrico</h3>
        <p className="text-muted-foreground text-sm mt-2">Distribuição inteligente de cargas, iluminação e automação residencial.</p>
      </div>
      
      <div className="relative mt-4 border border-border rounded-xl h-40 overflow-hidden flex items-center justify-center bg-background">
        <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-50">
          <path d="M 20 50 L 60 50 L 80 20 L 120 80 L 140 50 L 180 50" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="10 5" className="circuit-line" />
        </svg>
        <div className="flex gap-16 relative z-10">
          <div className="energy-node opacity-20 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]"></div>
          <div className="energy-node opacity-20 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]"></div>
          <div className="energy-node opacity-20 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]"></div>
        </div>
        <Zap size={16} className="absolute bottom-2 right-2 text-accent" />
      </div>
    </div>
  );
};

/* ─── Card 4: Hidrossanitário ─── */
const HidroCard = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".water-level", { y: -20, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".flow-arrow", { y: 10, opacity: 0, duration: 1.5, repeat: -1, ease: "power1.in" });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-surface border border-border rounded-[2rem] p-5 md:p-8 shadow-2xl h-auto min-h-[16rem] md:h-80 flex flex-col justify-between" ref={container}>
      <div>
        <h3 className="font-sans font-bold text-2xl text-foreground">Projeto Hidrossanitário</h3>
        <p className="text-muted-foreground text-sm mt-2">Sistemas eficientes de abastecimento, esgoto e aproveitamento de água da chuva.</p>
      </div>
      
      <div className="relative mt-4 border border-border rounded-xl h-40 overflow-hidden flex justify-center items-end pb-4 bg-background">
        {/* Pipe structure */}
        <div className="w-16 h-32 border-x-4 border-b-4 border-muted-foreground/30 rounded-b-xl relative overflow-hidden flex justify-center">
          <div className="water-level absolute bottom-0 left-0 right-0 h-40 bg-accent/30 translate-y-20 rounded-t-full"></div>
          <div className="flow-arrow absolute top-4 text-accent">↓</div>
          <div className="flow-arrow absolute top-12 text-accent" style={{ animationDelay: "0.5s" }}>↓</div>
        </div>
        <Droplets size={16} className="absolute bottom-2 right-2 text-accent" />
      </div>
    </div>
  );
};


const Servicos = () => {
  useScrollToTop();
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".feature-card", {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.2
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground antialiased selection:bg-accent/30 selection:text-accent-foreground">
      <Navbar />
      
      <main className="pt-28 pb-16 md:pt-40 md:pb-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto" ref={sectionRef}>
          <div className="mb-10 md:mb-16 max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Nossas Disciplinas</span>
            <h1 className="font-sans font-extrabold text-4xl md:text-5xl lg:text-6xl mt-4 text-foreground leading-tight">
              Especialidades Vertice.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mt-6">
              Dominamos as 4 áreas fundamentais da engenharia residencial. A vantagem de fazer tudo no mesmo lugar é a ausência de retrabalho: o projeto arquitetônico já nasce compatibilizado com os projetos complementares.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            <div className="feature-card"><ArqCard /></div>
            <div className="feature-card"><EstCard /></div>
            <div className="feature-card"><EletricoCard /></div>
            <div className="feature-card"><HidroCard /></div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Servicos;
