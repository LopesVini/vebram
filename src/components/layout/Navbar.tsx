import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleHomeClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fechar o menu mobile sempre que a rota mudar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
      <nav
        className={cn(
          "w-full max-w-4xl rounded-[2rem] transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] flex items-center justify-between px-6 py-4",
          scrolled || location.pathname !== "/"
            ? "bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg"
            : "bg-transparent text-primary-foreground"
        )}
      >
        <button onClick={handleHomeClick} className="font-sans font-bold text-xl tracking-tight relative group text-foreground md:text-inherit bg-none border-none cursor-pointer">
          VERTICE
          <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-accent transition-all duration-300 group-hover:w-full"></span>
        </button>

        {/* Desktop Links */}
        <div className={cn(
          "hidden md:flex items-center gap-8 font-sans text-sm tracking-wide",
          scrolled || location.pathname !== "/" ? "text-foreground" : "text-primary-foreground"
        )}>
          <Link to="/servicos" className="hover:-translate-y-[1px] transition-transform">Serviços</Link>
          <Link to="/projetos" className="hover:-translate-y-[1px] transition-transform">Projetos</Link>
          <Link to="/processo" className="hover:-translate-y-[1px] transition-transform">Processo</Link>
        </div>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className={cn(
                "relative overflow-hidden border px-5 py-2 rounded-full text-sm font-bold shadow-md hover:scale-[1.03] transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
                scrolled || location.pathname !== "/"
                  ? "border-foreground/20 text-foreground hover:bg-foreground/5"
                  : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30"
              )}
            >
              Área do Cliente
            </Link>
            <Link
              to="/orcamento"
              className="relative overflow-hidden bg-accent text-accent-foreground px-6 py-2 rounded-full text-sm font-bold shadow-md shadow-accent/20 hover:scale-[1.03] transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group"
            >
              <span className="relative z-10">Iniciar Projeto</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] rounded-full"></div>
            </Link>
          </div>
          <button 
            className={cn("md:hidden", scrolled || location.pathname !== "/" ? "text-foreground" : "text-primary-foreground")}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-4 right-4 mt-2 p-4 bg-background/95 backdrop-blur-xl border border-border/50 rounded-[2rem] shadow-xl flex flex-col gap-4 md:hidden text-foreground">
          <Link to="/servicos" className="p-2 font-bold border-b border-border/50">Serviços</Link>
          <Link to="/projetos" className="p-2 font-bold border-b border-border/50">Projetos</Link>
          <Link to="/processo" className="p-2 font-bold border-b border-border/50">Processo</Link>
          <div className="flex flex-col gap-2 mt-2">
            <Link 
              to="/login" 
              className="p-3 text-center border border-foreground/20 text-foreground hover:bg-foreground/5 rounded-full font-bold transition-colors"
            >
              Área do Cliente
            </Link>
            <Link to="/orcamento" className="p-3 text-center bg-accent text-accent-foreground rounded-full font-bold">
              Iniciar Projeto
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
