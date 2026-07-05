import { Navigate, Outlet, NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/data/useAuth";
import { useNotifications, timeAgo } from "@/hooks/data/useNotifications";
import { Loader2, LogOut, LayoutDashboard, Briefcase, Users, Search, Bell, Settings, Sun, Moon, UserCircle, CheckCheck, Plus, UserPlus, ArrowRight, Command, Rss, CalendarDays, BarChart3, Gauge, Contact, KanbanSquare, ListChecks, SlidersHorizontal } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";
import VerticeLogo from "@/components/layout/VerticeLogo";
import FloatingChat from "@/components/chat/FloatingChat";
import MobileTabBar from "@/components/layout/MobileTabBar";
import { LightboxProvider } from "@/components/hq/thevertice/shared";
import { CrmCompanyProvider } from "@/hooks/data/useCrmCompany";
import CompanySwitcher from "@/components/hq/crm/CompanySwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Command palette ───────────────────────────────────────────────────────────

interface Cmd {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  path: string;
  category: string;
  keywords: string[];
}

const COMMANDS: Cmd[] = [
  { id: "dashboard",   label: "Dashboard",      desc: "Área principal do sistema",       icon: LayoutDashboard, path: "/hq",              category: "Navegar",  keywords: ["home","início","inicio","painel","principal","dashboard"] },
  { id: "projects",    label: "Ver Projetos",    desc: "Lista de todos os projetos",      icon: Briefcase,       path: "/hq/projects",     category: "Navegar",  keywords: ["projetos","obras","ver projetos","listar"] },
  { id: "clients",     label: "Ver Clientes",    desc: "Lista de todos os clientes",      icon: Users,           path: "/hq/clients",      category: "Navegar",  keywords: ["clientes","contatos","empresa","ver clientes"] },
  { id: "feed",        label: "Mural",           desc: "Feed interno da equipe",          icon: Rss,             path: "/hq/feed",         category: "VEBRAM", keywords: ["mural","feed","publicações","publicacoes","posts","vebram"] },
  { id: "calendar",    label: "Calendário",      desc: "Disponibilidade da equipe",       icon: CalendarDays,    path: "/hq/calendar",     category: "VEBRAM", keywords: ["calendário","calendario","agenda","disponibilidade","férias","ferias","vebram"] },
  { id: "polls",       label: "Enquetes",        desc: "Decisões e votações da equipe",    icon: BarChart3,       path: "/hq/polls",        category: "VEBRAM", keywords: ["enquetes","votação","votacao","poll","decisões","decisoes","vebram"] },
  { id: "members",     label: "Membros",         desc: "Sócios e equipe da rede",         icon: Users,           path: "/hq/members",      category: "VEBRAM", keywords: ["membros","equipe","sócios","socios","time","members","vebram"] },
  { id: "profile",     label: "Meu Perfil",      desc: "Configurações da sua conta",      icon: UserCircle,      path: "/hq/profile",      category: "Navegar",  keywords: ["perfil","conta","configurações","settings","profile"] },
  { id: "new-project", label: "Criar Projeto",   desc: "Abrir formulário de novo projeto",icon: Plus,            path: "/hq/projects?new=1", category: "Ações",  keywords: ["criar projeto","novo projeto","adicionar projeto","new project","add project"] },
  { id: "new-client",  label: "Criar Cliente",   desc: "Cadastrar um novo cliente",       icon: UserPlus,        path: "/hq/clients?new=1",  category: "Ações",  keywords: ["criar cliente","novo cliente","adicionar cliente","cadastrar cliente","new client"] },
  { id: "crm",          label: "CRM",             desc: "Painel do CRM",                   icon: Gauge,             path: "/hq/crm",          category: "CRM", keywords: ["crm","funil","vendas","pipeline","leads","painel crm"] },
  { id: "crm-leads",    label: "Leads",           desc: "Clientes e leads do CRM",         icon: Contact,           path: "/hq/crm/leads",    category: "CRM", keywords: ["leads","clientes","prospecção","prospeccao","contatos crm"] },
  { id: "crm-pipeline", label: "Pipeline",        desc: "Funil de vendas (Kanban)",        icon: KanbanSquare,      path: "/hq/crm/pipeline", category: "CRM", keywords: ["pipeline","funil","kanban","etapas","negócios","negocios"] },
  { id: "crm-tasks",    label: "Tarefas do CRM",  desc: "Follow-ups e próximas ações",     icon: ListChecks,        path: "/hq/crm/tasks",    category: "CRM", keywords: ["tarefas","follow-up","followup","próximas ações","proximas acoes","lembretes"] },
  { id: "crm-settings", label: "Config. do CRM",  desc: "Etapas e regras de automação",    icon: SlidersHorizontal, path: "/hq/crm/settings", category: "CRM", keywords: ["configurações crm","configuracoes crm","etapas","regras","automação","automacao"] },
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function filterCommands(q: string): Cmd[] {
  if (!q.trim()) return COMMANDS;
  const n = normalize(q);
  return COMMANDS.filter(c =>
    normalize(c.label).includes(n) ||
    normalize(c.desc).includes(n) ||
    c.keywords.some(k => normalize(k).includes(n))
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const results = filterCommands(query);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIdx(0); }, [query]);

  const execute = useCallback((cmd: Cmd) => {
    navigate(cmd.path);
    onClose();
  }, [navigate, onClose]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && results[activeIdx]) execute(results[activeIdx]);
    else if (e.key === "Escape") onClose();
  }

  const categories = [...new Set(results.map(c => c.category))];

  return (
    <div className="absolute right-0 top-12 w-96 bg-white dark:bg-navy-light border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-white/5">
        <Search className="w-4 h-4 text-zinc-400 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Buscar ou digitar um comando..."
          className="flex-1 bg-transparent text-sm text-navy dark:text-white placeholder:text-zinc-400 outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white">
            <span className="text-xs">✕</span>
          </button>
        )}
        <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
      </div>

      <div className="max-h-80 overflow-y-auto py-2">
        {results.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-6">Nenhum resultado para "{query}"</p>
        )}
        {categories.map(cat => (
          <div key={cat}>
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500">{cat.toUpperCase()}</p>
            {results.filter(c => c.category === cat).map(cmd => {
              const idx = results.indexOf(cmd);
              const Icon = cmd.icon;
              const isActive = idx === activeIdx;
              return (
                <button
                  key={cmd.id}
                  onClick={() => execute(cmd)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                    isActive ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-zinc-50 dark:hover:bg-white/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400"
                  }`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isActive ? "text-blue-600 dark:text-blue-400" : "text-navy dark:text-white"}`}>
                      {cmd.label}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{cmd.desc}</p>
                  </div>
                  <ArrowRight size={13} className={`shrink-0 transition-opacity ${isActive ? "opacity-100 text-blue-500" : "opacity-0"}`} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-zinc-100 dark:border-white/5 flex gap-4 text-[10px] text-zinc-400">
        <span className="flex items-center gap-1"><kbd className="bg-zinc-100 dark:bg-white/5 px-1 rounded font-mono">↑↓</kbd> navegar</span>
        <span className="flex items-center gap-1"><kbd className="bg-zinc-100 dark:bg-white/5 px-1 rounded font-mono">↵</kbd> executar</span>
        <span className="flex items-center gap-1"><kbd className="bg-zinc-100 dark:bg-white/5 px-1 rounded font-mono">ESC</kbd> fechar</span>
      </div>
    </div>
  );
}

export default function HqLayout() {
  const { session, loading, isAdmin, signOut, displayName } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [showPalette, setShowPalette] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Notificações reais (ex.: cliente comentou numa atualização),
  // vindas do banco com chegada ao vivo via Realtime.
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) setShowPalette(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowPalette(v => !v); }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#0A0A0A] flex flex-col items-center justify-center transition-colors">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-zinc-500 font-mono text-sm tracking-widest animate-pulse">
          INICIANDO SESSÃO HQ...
        </p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Acesso ao HQ é decidido pelo CARGO (profiles.role), não pelo texto do e-mail.
  if (!isAdmin) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <CrmCompanyProvider>
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-navy-dark text-navy dark:text-white flex transition-colors duration-300 font-sans">

      {/* Sidebar - Reference Image Style */}
      <aside className="hidden lg:flex lg:w-[260px] bg-white dark:bg-navy-light/60 flex-col h-screen sticky top-0 z-40 transition-all duration-300 border-r border-transparent dark:border-white/5 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
        
        {/* Logo */}
        <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8">
          <VerticeLogo className="w-9 h-9 shrink-0" />
          <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-navy dark:text-white">
            VEBRAM QG
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 flex flex-col gap-2 px-4">
          <p className="hidden lg:block text-xs font-bold text-zinc-400 mb-2 px-4">MAIN MENU</p>
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" to="/hq" end />
          <NavItem icon={<Briefcase size={20} />} label="Projetos" to="/hq/projects" />
          <NavItem icon={<Users size={20} />} label="Clientes" to="/hq/clients" />

          <p className="hidden lg:block text-xs font-bold text-zinc-400 mb-2 mt-4 px-4">VEBRAM</p>
          <NavItem icon={<Rss size={20} />} label="Mural" to="/hq/feed" />
          <NavItem icon={<CalendarDays size={20} />} label="Calendário" to="/hq/calendar" />
          <NavItem icon={<BarChart3 size={20} />} label="Enquetes" to="/hq/polls" />
          <NavItem icon={<Users size={20} />} label="Membros" to="/hq/members" />

          <p className="hidden lg:block text-xs font-bold text-zinc-400 mb-2 mt-4 px-4">CRM</p>
          <NavItem icon={<Gauge size={20} />} label="Painel CRM" to="/hq/crm" end />
          <NavItem icon={<Contact size={20} />} label="Leads" to="/hq/crm/leads" />
          <NavItem icon={<KanbanSquare size={20} />} label="Pipeline" to="/hq/crm/pipeline" />
          <NavItem icon={<ListChecks size={20} />} label="Tarefas" to="/hq/crm/tasks" />
          <NavItem icon={<SlidersHorizontal size={20} />} label="Config" to="/hq/crm/settings" />
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto flex flex-col gap-4 p-4">
          {/* Theme Toggle - Pill Style */}
          <div className="flex items-center justify-center lg:justify-start">
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-14 h-8 rounded-full bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 transition-colors duration-300 focus:outline-none flex items-center"
              aria-label="Toggle Theme"
            >
              <div 
                className={`absolute w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 shadow-sm ${
                  theme === "dark" 
                    ? "translate-x-7 bg-navy-light text-white" 
                    : "translate-x-1 bg-white text-navy border border-zinc-200"
                }`}
              >
                {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
              </div>
            </button>
            <span className="hidden lg:block ml-3 text-sm font-medium text-zinc-500">
              Tema {theme === "dark" ? "Escuro" : "Claro"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        
        {/* Top Header */}
        <header className="h-14 px-3 lg:h-24 lg:px-8 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-navy-dark/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-zinc-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-navy dark:text-white leading-tight truncate">Olá, {displayName}</h2>
              <p className="hidden lg:block text-xs text-zinc-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {location.pathname.startsWith("/hq/crm") && <CompanySwitcher />}
            {/* Command Palette trigger */}
            <div ref={paletteRef} className="hidden md:block relative">
              <button
                onClick={() => setShowPalette(v => !v)}
                className="flex items-center gap-2.5 w-64 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-full pl-3.5 pr-3 py-2 text-sm text-zinc-400 hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors shadow-sm group"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left text-sm">Buscar projetos, clientes...</span>
                <kbd className="flex items-center gap-0.5 text-[10px] bg-zinc-100 dark:bg-white/5 px-1.5 py-0.5 rounded font-mono text-zinc-400">
                  <Command size={9} />K
                </kbd>
              </button>
              {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
            </div>

            {/* Bell / Notificações */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowBell((v) => !v)}
                className="w-9 h-9 lg:w-10 lg:h-10 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-full flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white transition-colors shadow-sm relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-navy-dark" />
                )}
              </button>

              {showBell && (
                <div className="fixed inset-x-3 top-16 w-auto lg:absolute lg:inset-x-auto lg:right-0 lg:top-12 lg:w-80 bg-white dark:bg-navy-light border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/5">
                    <span className="font-bold text-sm text-navy dark:text-white">Notificações</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-semibold">
                        <CheckCheck size={13} /> Marcar todas como lidas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-white/5">
                    {notifications.length === 0 && (
                      <p className="text-xs text-zinc-400 text-center py-8 px-4">
                        Nenhuma notificação por aqui ainda.
                      </p>
                    )}
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 ${!n.read_at ? "bg-blue-50/50 dark:bg-blue-500/5" : ""}`}
                      >
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.read_at ? "bg-zinc-300 dark:bg-zinc-600" : "bg-blue-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate ${n.read_at ? "text-zinc-500 dark:text-zinc-400" : "text-navy dark:text-white"}`}>{n.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-zinc-400 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 lg:w-10 lg:h-10 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-full flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white transition-colors shadow-sm">
                  <Settings size={18} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-navy border-zinc-200 dark:border-white/10 text-navy dark:text-white rounded-xl shadow-2xl">
                <DropdownMenuLabel className="font-mono text-xs text-zinc-500">Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10" />
                <DropdownMenuItem asChild className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10">
                  <Link to="/hq/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-white/10" />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 dark:text-red-400 hover:bg-red-500/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair do sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="px-3 py-4 pb-24 lg:p-8 flex-1">
          <LightboxProvider>
            <Outlet />
          </LightboxProvider>
        </div>
      </main>

      <MobileTabBar
        tabs={[
          { icon: <LayoutDashboard size={20} />, label: "Painel", to: "/hq", end: true },
          { icon: <Rss size={20} />, label: "Mural", to: "/hq/feed" },
          { icon: <CalendarDays size={20} />, label: "Agenda", to: "/hq/calendar" },
          { icon: <BarChart3 size={20} />, label: "Enquetes", to: "/hq/polls" },
          { icon: <Gauge size={20} />, label: "CRM", to: "/hq/crm", end: true },
        ]}
      />

      <FloatingChat />
    </div>
    </CrmCompanyProvider>
  );
}

function NavItem({ icon, label, to, end }: { icon: React.ReactNode; label: string; to: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `w-full flex items-center justify-center lg:justify-start p-3 lg:px-4 rounded-xl transition-all duration-200 group ${
          isActive
            ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30"
            : "text-zinc-500 dark:text-zinc-400 hover:text-navy dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`${isActive ? "text-white" : ""}`}>
            {icon}
          </div>
          <span className="hidden lg:block ml-3 text-sm font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
