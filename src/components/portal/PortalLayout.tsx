import { Navigate, Outlet, NavLink, Link } from "react-router-dom";
import { useAuth } from "@/hooks/data/useAuth";
import { Loader2, LogOut, LayoutDashboard, Box, History, MoreVertical, User, UserCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import VerticeLogo from "@/components/layout/VerticeLogo";
import FloatingChat from "@/components/chat/FloatingChat";
import MobileTabBar from "@/components/layout/MobileTabBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PortalLayout() {
  const { session, loading, signOut, displayName } = useAuth();
  const { theme, setTheme } = useTheme();

  // Se estiver carregando a sessão, mostra um loader cinematográfico
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center transition-colors">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest animate-pulse">
          INICIANDO SESSÃO...
        </p>
      </div>
    );
  }

  // Se não estiver logado, redireciona pro login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-navy-dark text-navy dark:text-white flex transition-colors duration-300">
      {/* Sidebar minimalista */}
      <aside className="hidden lg:flex lg:w-64 border-r border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-navy/20 flex flex-col h-screen sticky top-0 backdrop-blur-xl z-40 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-zinc-200 dark:border-white/5">
          <VerticeLogo className="w-9 h-9 shrink-0" />
          <span className="hidden lg:block ml-3 font-sans font-bold tracking-widest uppercase text-navy dark:text-white">
            VEBRAM
          </span>
        </div>

        <nav className="flex-1 py-8 flex flex-col gap-4 px-4 lg:px-6">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" to="/portal" end />
          <NavItem icon={<Box />} label="Modelo BIM" to="/portal/bim" />
          <NavItem icon={<History />} label="Atualizações" to="/portal/updates" />
        </nav>

        <div className="mt-auto flex flex-col">
          {/* Theme Toggle Widget */}
          <div className="p-4 flex items-center justify-center lg:justify-start">
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-14 h-8 rounded-full bg-zinc-200 dark:bg-black/40 border border-zinc-300 dark:border-white/10 transition-colors duration-300 focus:outline-none flex items-center"
              aria-label="Toggle Theme"
            >
              <div 
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 shadow-sm ${
                  theme === "dark" 
                    ? "translate-x-7 bg-navy-light text-white" 
                    : "translate-x-1 bg-white text-navy"
                }`}
              >
                {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
              </div>
            </button>
            <span className="hidden lg:block ml-3 text-sm font-medium text-zinc-500">
              Tema {theme === "dark" ? "Escuro" : "Claro"}
            </span>
          </div>
          {/* User Profile Widget — toda a linha abre o menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors group outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-white dark:bg-navy-dark border border-zinc-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    <User className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="hidden lg:block text-left min-w-0">
                    <p className="text-sm font-bold font-sans tracking-tight text-navy dark:text-white leading-tight truncate">
                      {displayName.toUpperCase()}
                    </p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                      @VEBRAM_CORP
                    </p>
                  </div>
                </div>
                <MoreVertical className="hidden lg:block w-4 h-4 text-zinc-500 group-hover:text-navy dark:group-hover:text-white transition-colors shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 bg-white dark:bg-navy border-zinc-200 dark:border-white/10 text-navy dark:text-white rounded-xl shadow-2xl">
              <DropdownMenuLabel className="font-mono text-xs text-zinc-500 dark:text-zinc-400">Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10" />
              <DropdownMenuItem asChild className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 focus:bg-black/5 dark:focus:bg-white/10">
                <Link to="/portal/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10" />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-400/10 focus:bg-red-500/10 dark:focus:bg-red-400/10 focus:text-red-500 dark:focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair do sistema</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Header mobile: logo + tema (a sidebar some abaixo de lg) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 px-3 flex items-center justify-between bg-white/95 dark:bg-navy-dark/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <VerticeLogo className="w-7 h-7" />
          <span className="font-sans font-bold tracking-widest uppercase text-sm text-navy dark:text-white">
            VEBRAM
          </span>
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-500 hover:text-navy dark:hover:text-white transition-colors"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-3 pt-[4.5rem] pb-24 lg:p-8 w-full mx-auto relative z-10">
          <Outlet />
        </div>
      </main>

      <MobileTabBar
        tabs={[
          { icon: <LayoutDashboard size={20} />, label: "Início", to: "/portal", end: true },
          { icon: <Box size={20} />, label: "BIM", to: "/portal/bim" },
          { icon: <History size={20} />, label: "Novidades", to: "/portal/updates" },
          { icon: <UserCircle size={20} />, label: "Perfil", to: "/portal/profile" },
        ]}
      />

      <FloatingChat />
    </div>
  );
}

function NavItem({ icon, label, to, end }: { icon: React.ReactNode; label: string; to: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all duration-200 group ${
          isActive
            ? "bg-primary text-white font-bold shadow-lg shadow-primary/20"
            : "text-zinc-500 dark:text-zinc-400 hover:text-navy dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-white" : ""}`}>
            {icon}
          </div>
          <span className="hidden lg:block ml-3 text-sm font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
