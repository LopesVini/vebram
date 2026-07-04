import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

// Imagens de exemplo do Unsplash conforme solicitado
const projects = [
  {
    id: 1,
    title: "Residência Alphaville",
    category: "Projeto Completo",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop",
    desc: "Integração total entre arquitetura moderna e rigor estrutural em um terreno com declive acentuado."
  },
  {
    id: 2,
    title: "Casa Vila da Serra",
    category: "Projeto Estrutural",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
    desc: "Cálculo estrutural avançado para vãos livres de 12 metros, garantindo a estética desejada pelo cliente."
  },
  {
    id: 3,
    title: "Complexo Retiro das Pedras",
    category: "Compatibilização",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
    desc: "Compatibilização completa de projetos em uma área de preservação com rigorosas normas de prefeitura."
  },
  {
    id: 4,
    title: "Residência Pampulha",
    category: "Projeto Arquitetônico",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    desc: "Arquitetura contemporânea pensada para ventilação cruzada e eficiência energética."
  }
];

const Projetos = () => {
  useScrollToTop();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".project-card", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        delay: 0.2
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground antialiased selection:bg-accent/30 selection:text-accent-foreground">
      <Navbar />
      
      <main className="pt-28 pb-16 md:pt-40 md:pb-32 px-6 md:px-12 lg:px-24 min-h-[90vh]">
        <div className="max-w-7xl mx-auto" ref={containerRef}>
          <div className="mb-10 md:mb-16">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">Portfólio</span>
            <h1 className="font-sans font-extrabold text-4xl md:text-5xl lg:text-6xl mt-4 text-foreground leading-tight">
              Obras que assinam <br/>nossa precisão.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mt-6 max-w-2xl">
              Confira alguns de nossos projetos modelo (Imagens de exemplo). Mais do que estética, entregamos engenharia que funciona na vida real.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-12">
            {projects.map((project) => (
              <div key={project.id} className="project-card group cursor-pointer">
                <div className="relative overflow-hidden rounded-[2rem] aspect-[4/3] bg-surface mb-4 md:mb-6 border border-border">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-navy-dark/0 group-hover:bg-navy-dark/40 transition-colors duration-500 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out">
                      <ArrowUpRight size={28} />
                    </div>
                  </div>
                </div>
                
                <div className="px-2">
                  <span className="font-mono text-xs text-accent uppercase tracking-widest">{project.category}</span>
                  <h3 className="font-sans font-bold text-xl md:text-2xl text-foreground mt-2 group-hover:text-accent transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-muted-foreground mt-3 leading-relaxed">
                    {project.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Projetos;
