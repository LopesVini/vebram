import { lazy, Suspense, useLayoutEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/data/useAuth";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
import Index from "./pages/institutional/Index";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/layout/ErrorBoundary";

// Code splitting: cada página vira um arquivo separado que o navegador
// só baixa quando a rota é visitada. Sem isso, quem abre a home baixava
// o site inteiro (inclusive o visualizador 3D, com three.js + web-ifc).
// A home (Index) continua no bundle principal para carregar na hora.
const Sobre = lazy(() => import("./pages/institutional/Sobre"));
const Servicos = lazy(() => import("./pages/institutional/Servicos"));
const Projetos = lazy(() => import("./pages/institutional/Projetos"));
const Processo = lazy(() => import("./pages/institutional/Processo"));
const Orcamento = lazy(() => import("./pages/institutional/Orcamento"));
const Contato = lazy(() => import("./pages/institutional/Contato"));
const ClientLogin = lazy(() => import("./pages/portal/ClientLogin"));
const PortalLayout = lazy(() => import("./components/portal/PortalLayout"));
const ProjectDashboard = lazy(() => import("./pages/portal/ProjectDashboard"));
const BimViewer = lazy(() => import("./pages/portal/BimViewer"));
const ProjectUpdates = lazy(() => import("./pages/portal/ProjectUpdates"));
const HqLayout = lazy(() => import("./components/hq/HqLayout"));
const HqDashboard = lazy(() => import("./pages/hq/HqDashboard"));
const HqProjects = lazy(() => import("./pages/hq/HqProjects"));
const HqClients = lazy(() => import("./pages/hq/HqClients"));
const HqFeed = lazy(() => import("./pages/hq/HqFeed"));
const HqCalendar = lazy(() => import("./pages/hq/HqCalendar"));
const HqPolls = lazy(() => import("./pages/hq/HqPolls"));
const HqMembers = lazy(() => import("./pages/hq/HqMembers"));
const Profile = lazy(() => import("./pages/Profile"));

// Tela mostrada por instantes enquanto o arquivo da rota é baixado
const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-navy-dark">
    <div className="w-8 h-8 border-2 border-zinc-300 dark:border-white/20 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

const queryClient = new QueryClient();

// Componente seguro para rolar para o topo
const RouteChangeHandler = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const prevHtml = document.documentElement.style.scrollBehavior;
    const prevBody = document.body.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const raf = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.documentElement.style.scrollBehavior = prevHtml;
      document.body.style.scrollBehavior = prevBody;
    });

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vertice-theme">
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* v7_startTransition: durante a navegação o React mantém a tela
            atual visível enquanto o código da próxima rota baixa, em vez de
            desmontar tudo e mostrar o fallback — elimina o "piscar" branco.
            O RouteFallback passa a aparecer só no primeiríssimo carregamento. */}
        <BrowserRouter future={{ v7_startTransition: true }}>
          <RouteChangeHandler />
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Rota Institucional */}
              <Route path="/" element={<Index />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/projetos" element={<Projetos />} />
              <Route path="/processo" element={<Processo />} />
              <Route path="/orcamento" element={<Orcamento />} />
              <Route path="/contato" element={<Contato />} />
              
              {/* Área do Cliente (SaaS) */}
              <Route path="/login" element={<ClientLogin />} />
              <Route path="/portal" element={<PortalLayout />}>
                <Route index element={<ProjectDashboard />} />
                <Route path="bim" element={<BimViewer />} />
                <Route path="updates" element={<ProjectUpdates />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Área Administrativa (HQ) */}
              <Route path="/hq" element={<HqLayout />}>
                <Route index element={<HqDashboard />} />
                <Route path="projects" element={<HqProjects />} />
                <Route path="clients" element={<HqClients />} />
                <Route path="feed" element={<HqFeed />} />
                <Route path="calendar" element={<HqCalendar />} />
                <Route path="polls" element={<HqPolls />} />
                <Route path="members" element={<HqMembers />} />
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* Catch-all - Erro 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
