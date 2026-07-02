import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import Philosophy from "@/components/sections/Philosophy";
import GetStarted from "@/components/sections/GetStarted";
import Footer from "@/components/layout/Footer";
import { ArrowRight, Layers, Ruler, Blocks } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

const Index = () => {
  useScrollToTop();

  return (
    <div className="bg-background min-h-screen text-foreground antialiased selection:bg-accent/30 selection:text-accent-foreground">
      <Navbar />
      <main>
        <HeroSection />
        
        {/* Expanded Navigation Section on Home */}
        <section className="py-32 px-6 md:px-12 lg:px-24 bg-background border-t border-border/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">Nossa Atuação</span>
              <h2 className="font-sans font-extrabold text-4xl md:text-5xl mt-4 text-foreground">
                Tudo que sua obra precisa.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Link to="/servicos" className="group relative bg-surface border border-border p-10 rounded-[2rem] hover:border-accent hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col justify-between min-h-[300px]">
                <div className="absolute -right-8 -top-8 text-foreground/5 group-hover:text-accent/10 transition-colors duration-500">
                  <Layers size={150} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-sans font-bold text-3xl mb-4 text-foreground group-hover:text-accent transition-colors">As 4 Disciplinas</h3>
                  <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                    Arquitetônico, Estrutural, Elétrico e Hidrossanitário desenvolvidos simultaneamente no mesmo escritório.
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-widest mt-auto">
                  Ver Serviços <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>

              <Link to="/processo" className="group relative bg-navy-dark border border-border p-10 rounded-[2rem] hover:border-accent hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col justify-between min-h-[300px] text-white">
                <div className="absolute -right-8 -top-8 text-white/5 group-hover:text-accent/10 transition-colors duration-500">
                  <Ruler size={150} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-sans font-bold text-3xl mb-4 text-white group-hover:text-accent transition-colors">Linha do Tempo</h3>
                  <p className="text-white/60 text-lg mb-8 leading-relaxed">
                    Acompanhe nosso processo desde o orçamento até a liberação do alvará na prefeitura e entrega executiva.
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-widest mt-auto">
                  Ver Metodologia <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>

              <Link to="/projetos" className="group relative bg-surface border border-border p-10 rounded-[2rem] hover:border-accent hover:shadow-2xl transition-all duration-500 overflow-hidden flex flex-col justify-between min-h-[300px]">
                <div className="absolute -right-8 -top-8 text-foreground/5 group-hover:text-accent/10 transition-colors duration-500">
                  <Blocks size={150} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-sans font-bold text-3xl mb-4 text-foreground group-hover:text-accent transition-colors">Nosso Portfólio</h3>
                  <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                    Modelos 3D, cálculos estruturais e compatibilização real aplicados em residências de alto padrão na RMBH.
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-widest mt-auto">
                  Ver Projetos <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        <Philosophy />
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
