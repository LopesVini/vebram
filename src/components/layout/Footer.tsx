import { Link } from "react-router-dom";
import { Mail, Phone, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-navy-dark text-white rounded-t-[4rem] pt-20 pb-10 px-6 md:px-12 lg:px-24 mt-[-4rem] relative z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 border-b border-white/10 pb-16">
          <div className="col-span-1">
            <h2 className="font-sans font-bold text-3xl tracking-tight text-white mb-4">VERTICE</h2>
            <p className="text-white/50 text-sm font-sans leading-relaxed max-w-xs">
              Engenharia residencial completa e integrada. Projetos arquitetônicos, elétricos, hidrossanitários e estruturais para a Região Metropolitana de Belo Horizonte.
            </p>
            <div className="text-white/40 font-mono mt-6 flex flex-col gap-3">
              <a href="mailto:verticeprojetos7@gmail.com" className="hover:text-accent transition-colors text-xs flex items-center gap-2">
                <Mail size={14} /> verticeprojetos7@gmail.com
              </a>
              <a href="tel:31985981606" className="hover:text-accent transition-colors text-xs flex items-center gap-2">
                <Phone size={14} /> (31) 98598-1606
              </a>
              <a href="https://instagram.com/projetos.vertice" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors text-xs flex items-center gap-2">
                <Instagram size={14} /> @projetos.vertice
              </a>
            </div>
          </div>

          <div className="col-span-1 flex flex-col gap-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-accent mb-2">Navegação</h3>
            <Link to="/servicos" className="text-white/70 hover:text-white transition-colors text-sm">Serviços</Link>
            <Link to="/projetos" className="text-white/70 hover:text-white transition-colors text-sm">Portfólio</Link>
            <Link to="/processo" className="text-white/70 hover:text-white transition-colors text-sm">Processo</Link>
            <Link to="/orcamento" className="text-white/70 hover:text-white transition-colors text-sm">Orçamento</Link>
          </div>

          <div className="col-span-1 flex flex-col gap-4">
            <h3 className="font-mono text-xs uppercase tracking-widest text-accent mb-2">Atuação</h3>
            <span className="text-white/70 text-sm">Belo Horizonte</span>
            <span className="text-white/70 text-sm">Nova Lima</span>
            <span className="text-white/70 text-sm">Contagem</span>
            <span className="text-white/70 text-sm">Região Metropolitana de BH</span>
            
            <div className="mt-6 flex items-center gap-2 bg-black/20 self-start px-3 py-1.5 rounded-full border border-white/5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
              <span className="font-mono text-xs text-white/70 uppercase tracking-wider">Sistema Operacional</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs font-sans">
            © {new Date().getFullYear()} Vertice Engenharia. Todos os direitos reservados.
          </p>
          <div className="flex gap-4 text-white/30 text-xs font-sans">
            <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
