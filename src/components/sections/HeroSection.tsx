import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Link } from "react-router-dom";

const HERO_BG = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop";

const HeroSection = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-elem", {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.2
      });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={container}
      className="relative h-[100dvh] w-full overflow-hidden flex items-end pb-24 md:pb-32 px-6 md:px-12 lg:px-24"
    >
      {/* Background Image & Gradient */}
      <div className="absolute inset-0 z-0">
        <img 
          src={HERO_BG} 
          alt="Arquitetura de precisão" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-transparent"></div>
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Content bottom-left third */}
      <div className="relative z-10 max-w-4xl">
        <div className="flex flex-col gap-2 md:gap-0">
          <h1 className="hero-elem font-sans font-extrabold text-4xl md:text-5xl lg:text-6xl tracking-tight text-white uppercase leading-none">
            Engenharia residencial com
          </h1>
          <h2 className="hero-elem font-drama italic text-7xl md:text-8xl lg:text-[10rem] text-accent leading-[0.8] mt-2 md:-mt-2">
            Precisão.
          </h2>
        </div>

        <p className="hero-elem mt-8 max-w-xl text-lg md:text-xl text-white/80 font-sans font-light leading-relaxed">
          Projetos arquitetônicos, elétricos, hidrossanitários e estruturais — integrados desde a concepção, compatibilizados entre si e alinhados às normas do seu município na RMBH.
        </p>

        <div className="hero-elem mt-4 flex items-center gap-3">
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
            Especialistas
          </span>
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
            Multidisciplinar
          </span>
          <span className="font-mono text-xs text-white/40 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full hidden sm:block">
            RMBH
          </span>
        </div>

        <div className="hero-elem mt-10">
          <Link
            to="/orcamento"
            className="inline-flex relative overflow-hidden bg-accent text-accent-foreground px-10 py-5 rounded-full text-lg font-bold shadow-2xl shadow-accent/20 hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group"
          >
            <span className="relative z-10">Solicitar Orçamento</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] rounded-full"></div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
