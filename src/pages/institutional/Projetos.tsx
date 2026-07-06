import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowUpRight, X, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    desc: "Integração total entre arquitetura moderna e rigor estrutural em um terreno com declive acentuado.",
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=2075&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=2070&auto=format&fit=crop"
    ],
    details: {
      clientName: "Roberto & Patrícia S.",
      testimonial: "A equipe da Vértice entregou o projeto completo de forma impecável. A compatibilização 3D BIM evitou qualquer surpresa no canteiro, gerando uma economia de cerca de 12% no custo de materiais de fundação e estrutura.",
      outcomeHighlight: "Obra concluída 15 dias antes do cronograma planejado devido à precisão do detalhamento executivo.",
      features: [
        "Área: 420m²",
        "Compatibilização BIM integrada",
        "Aproveitamento solar otimizado",
        "Estrutura sob declive acentuado"
      ]
    }
  },
  {
    id: 2,
    title: "Casa Vila da Serra",
    category: "Projeto Estrutural",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
    desc: "Cálculo estrutural avançado para vãos livres de 12 metros, garantindo a estética desejada pelo cliente.",
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=2069&auto=format&fit=crop"
    ],
    details: {
      clientName: "Construtora Horizonte",
      testimonial: "Dimensionar grandes vãos livres com segurança e sem encarecer a obra é o maior diferencial deles. O projeto estrutural dialogou perfeitamente com a proposta minimalista do arquiteto.",
      outcomeHighlight: "Economia de 18% no volume de concreto armado previsto inicialmente graças à otimização matemática das vigas.",
      features: [
        "Vãos livres de 12m",
        "Fundações profundas otimizadas",
        "Integração perfeita com esquadrias minimalistas",
        "Concreto aparente de alto desempenho"
      ]
    }
  },
  {
    id: 3,
    title: "Complexo Retiro das Pedras",
    category: "Compatibilização",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
    desc: "Compatibilização completa de projetos em uma área de preservação com rigorosas normas de prefeitura.",
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=2080&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?q=80&w=2070&auto=format&fit=crop"
    ],
    details: {
      clientName: "Cláudio & Heloísa M.",
      testimonial: "Aprovar uma obra complexa em área de preservação exige muito rigor técnico. Com a compatibilização BIM nativa, todas as concessionárias e órgãos municipais aprovaram o projeto sem qualquer pendência na primeira submissão.",
      outcomeHighlight: "Redução a zero (0%) de retrabalho ou reposicionamento de tubulações sanitárias no canteiro.",
      features: [
        "Compatibilização Hidro-Estrutural nativa",
        "Aprovação ágil em órgãos de preservação",
        "Sistemas ecológicos de tratamento de efluentes",
        "Detalhamento 3D de instalações subterrâneas"
      ]
    }
  },
  {
    id: 4,
    title: "Residência Pampulha",
    category: "Projeto Arquitetônico",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
    desc: "Arquitetura contemporânea pensada para ventilação cruzada e eficiência energética.",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?q=80&w=2072&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=2070&auto=format&fit=crop"
    ],
    details: {
      clientName: "Família Vasconcellos",
      testimonial: "O conforto térmico é incrível. Eles desenharam a residência aproveitando ao máximo a ventilação natural. Passamos o ano todo sem precisar ligar o ar-condicionado na sala e nos quartos, mesmo nos meses mais quentes.",
      outcomeHighlight: "Economia estimada de 30% na conta de energia residencial graças a estratégias de iluminação e conforto passivo.",
      features: [
        "Ventilação cruzada induzida",
        "Iluminação zenital",
        "Estética contemporânea com cobogós e brises",
        "Integração total interna-externa"
      ]
    }
  }
];

const Projetos = () => {
  useScrollToTop();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for gallery modal
  const [selectedProject, setSelectedProject] = useState<typeof projects[0] | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

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

  // Prevent scroll when modal is open
  useEffect(() => {
    if (selectedProject) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedProject]);

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedProject(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openProjectDetails = (project: typeof projects[0]) => {
    setSelectedProject(project);
    setActiveImageIndex(0);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProject) return;
    setActiveImageIndex((prev) => (prev + 1) % selectedProject.images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProject) return;
    setActiveImageIndex((prev) => (prev - 1 + selectedProject.images.length) % selectedProject.images.length);
  };

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
              Confira alguns de nossos projetos modelo. Clique em qualquer projeto para ver mais fotos reais dos resultados finais e depoimentos de nossos clientes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-12">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="project-card group cursor-pointer"
                onClick={() => openProjectDetails(project)}
              >
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

      {/* Gallery & Showcase Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 lg:p-10">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-6xl h-[90vh] md:h-5/6 lg:aspect-[16/9] lg:h-auto bg-zinc-950 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row z-10"
            >
              {/* Left / Top Side: Main Image Viewer */}
              <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden h-[45vh] md:h-full group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImageIndex}
                    src={selectedProject.images[activeImageIndex]}
                    alt={`${selectedProject.title} - Foto ${activeImageIndex + 1}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full object-cover select-none"
                  />
                </AnimatePresence>

                {/* Left Arrow */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:outline-none"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft size={24} />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 hover:bg-black/70 border border-white/10 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:outline-none"
                  aria-label="Próxima foto"
                >
                  <ChevronRight size={24} />
                </button>

                {/* Counter Badge */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm border border-white/10 text-white font-mono text-xs px-3 py-1.5 rounded-full select-none">
                  {activeImageIndex + 1} / {selectedProject.images.length}
                </div>
              </div>

              {/* Right / Bottom Side: Project Info & Quality Highlights */}
              <div className="w-full md:w-[400px] lg:w-[460px] shrink-0 border-t md:border-t-0 md:border-l border-zinc-800 p-6 md:p-8 flex flex-col justify-between bg-zinc-900/40 overflow-y-auto h-[45vh] md:h-full text-left">
                
                {/* Header & Description */}
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="font-mono text-[10px] text-accent uppercase tracking-widest font-bold">
                        {selectedProject.category}
                      </span>
                      <h2 className="font-sans font-black text-2xl text-white mt-1">
                        {selectedProject.title}
                      </h2>
                    </div>
                    
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="p-2 rounded-full bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Fechar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p className="text-zinc-400 text-sm mt-4 leading-relaxed font-sans">
                    {selectedProject.desc}
                  </p>

                  {/* Highlights section (Quality focused) */}
                  <div className="mt-6 pt-5 border-t border-zinc-800">
                    <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent flex items-center gap-1.5 mb-3">
                      <Sparkles size={12} className="text-accent" />
                      Resultado Final & Qualidade
                    </h4>
                    
                    <div className="bg-accent/5 border border-accent/15 rounded-2xl p-4 mb-4">
                      <span className="block text-[10px] font-bold font-mono text-accent uppercase tracking-wider mb-1">
                        Destaque da Entrega
                      </span>
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        {selectedProject.details.outcomeHighlight}
                      </p>
                    </div>

                    {/* Testimonial */}
                    <div className="relative pl-4 border-l-2 border-accent/40 italic text-zinc-300 text-xs leading-relaxed my-4">
                      <span className="absolute -left-1 -top-2 text-3xl font-serif text-accent/20 select-none">“</span>
                      {selectedProject.details.testimonial}
                      <span className="block not-italic text-[10px] font-mono text-zinc-500 font-bold tracking-widest mt-2 uppercase">
                        — Cliente: {selectedProject.details.clientName}
                      </span>
                    </div>

                    {/* Technical details list */}
                    <ul className="space-y-2 mt-4 text-[11px] text-zinc-400 font-sans">
                      {selectedProject.details.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-accent shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Thumbnails list */}
                <div className="mt-8 pt-5 border-t border-zinc-800">
                  <span className="block text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider mb-3">
                    Mais Fotos do Projeto
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {selectedProject.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`relative aspect-video w-20 rounded-lg overflow-hidden border shrink-0 transition-all ${
                          idx === activeImageIndex
                            ? "border-accent ring-2 ring-accent/30 scale-[1.03]"
                            : "border-zinc-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-cover select-none"
                        />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Projetos;
