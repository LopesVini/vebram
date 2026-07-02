import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BG_TEXTURE = "https://images.unsplash.com/photo-1502672260266-1c1c65b936f3?q=80&w=2000&auto=format&fit=crop";

const Philosophy = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".parallax-bg", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        y: 150,
        ease: "none"
      });

      const reveals = gsap.utils.toArray<HTMLElement>(".reveal-text");
      reveals.forEach(text => {
        gsap.from(text, {
          scrollTrigger: {
            trigger: text,
            start: "top 80%",
          },
          y: 40,
          opacity: 0,
          duration: 1,
          ease: "power3.out"
        });
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="philosophy" ref={sectionRef} className="relative py-40 overflow-hidden bg-navy-dark text-white">
      {/* Parallax Background */}
      <div className="absolute inset-0 -top-[100px] -bottom-[100px] z-0 parallax-bg opacity-10">
        <img 
          src={BG_TEXTURE} 
          alt="Textura arquitetônica" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 lg:px-24 flex flex-col gap-24">
        
        <div>
          <p className="reveal-text text-white/50 text-xl md:text-2xl font-sans tracking-wide mb-4">
            A maioria das consultorias foca em: entregar disciplinas isoladas.
          </p>
          <h2 className="reveal-text font-drama italic text-5xl md:text-7xl leading-tight">
            Nós focamos em: <span className="text-accent not-italic font-sans font-bold block mt-2">Integração Total.</span>
          </h2>
        </div>

        <div className="md:ml-auto md:text-right">
          <p className="reveal-text text-white/50 text-xl md:text-2xl font-sans tracking-wide mb-4">
            A maioria do mercado foca em: projetos genéricos e processos manuais.
          </p>
          <h2 className="reveal-text font-drama italic text-5xl md:text-7xl leading-tight">
            Nós focamos em: <span className="text-accent not-italic font-sans font-bold block mt-2">Inovação Técnica.</span>
          </h2>
        </div>

        <div className="reveal-text text-center pt-8 border-t border-white/10">
          <p className="text-white/40 font-mono text-sm uppercase tracking-widest">
            Equipe de especialistas · Cada disciplina, um profissional dedicado
          </p>
        </div>

      </div>
    </section>
  );
};

export default Philosophy;
