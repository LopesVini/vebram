import { useState, useId, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform, type Variants } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight, MessageSquare, Compass, Ruler, Blocks, CheckSquare, Home,
  Route, MonitorPlay, TrendingUp, Boxes, ListChecks, Sparkles, Send, Check,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

const EASE = [0.16, 1, 0.3, 1] as const;

// ── Process timeline data ─────────────────────────────────────────────────────

const timelineSteps = [
  {
    icon: MessageSquare,
    title: "Briefing & Orçamento",
    desc: "Entendemos suas necessidades, área do lote e desejos. Alinhamos expectativas e apresentamos uma proposta transparente.",
    isAction: true,
  },
  {
    icon: Compass,
    title: "Concepção & Viabilidade",
    desc: "Estudos preliminares e viabilidade normativa (Belo Horizonte, Nova Lima, etc). O conceito arquitetônico toma forma.",
  },
  {
    icon: Ruler,
    title: "Projeto Arquitetônico",
    desc: "Definição de plantas, cortes, fachadas e aprovação visual com o cliente.",
  },
  {
    icon: Blocks,
    title: "Projetos Complementares",
    desc: "Desenvolvimento técnico estrutural, elétrico e hidrossanitário em modelo BIM para zero retrabalho.",
  },
  {
    icon: CheckSquare,
    title: "Aprovação Municipal",
    desc: "Assinaturas, protocolo nas prefeituras e condução do processo burocrático até o alvará.",
  },
  {
    icon: Home,
    title: "Entrega Executiva",
    desc: "Pranchas prontas para obra. Tudo detalhado para que o construtor execute com precisão cirúrgica.",
  },
];

// ── View toggle ───────────────────────────────────────────────────────────────

type ViewKey = "timeline" | "portal";

const VIEWS: { key: ViewKey; icon: typeof Route; label: string; sub: string }[] = [
  { key: "timeline", icon: Route,       label: "Descobrir a Linha do Tempo", sub: "As 6 etapas do seu projeto" },
  { key: "portal",   icon: MonitorPlay, label: "Descobrir a Área do Cliente", sub: "O portal exclusivo do cliente" },
];

function ViewToggle({ active, onChange, baseId }: { active: ViewKey; onChange: (v: ViewKey) => void; baseId: string }) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    onChange(active === "timeline" ? "portal" : "timeline");
  }

  return (
    <div
      role="tablist"
      aria-label="Escolha o que descobrir"
      onKeyDown={handleKey}
      className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto"
    >
      {VIEWS.map((v) => {
        const Icon = v.icon;
        const isActive = active === v.key;
        return (
          <button
            key={v.key}
            role="tab"
            id={`${baseId}-tab-${v.key}`}
            aria-selected={isActive}
            aria-controls={`${baseId}-panel-${v.key}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(v.key)}
            className={`group relative flex-1 flex items-center gap-4 text-left rounded-[1.5rem] border-2 px-6 py-5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              isActive
                ? "bg-navy-dark border-navy-dark shadow-xl shadow-navy/20 -translate-y-0.5"
                : "bg-surface-elevated border-border hover:border-accent/60 hover:-translate-y-0.5 hover:shadow-lg"
            }`}
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                isActive ? "bg-accent text-accent-foreground" : "bg-accent/10 text-accent group-hover:bg-accent/15"
              }`}
            >
              <Icon size={22} strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className={`block font-sans font-bold text-base sm:text-lg leading-tight ${isActive ? "text-white" : "text-navy"}`}>
                {v.label}
              </span>
              <span className={`block text-sm mt-0.5 ${isActive ? "text-white/70" : "text-navy-light"}`}>
                {v.sub}
              </span>
            </span>
            <ArrowRight
              size={20}
              className={`ml-auto shrink-0 transition-all duration-300 ${
                isActive ? "text-accent translate-x-0 opacity-100" : "text-muted-foreground -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

// ── Timeline view ─────────────────────────────────────────────────────────────

function TimelineView({ reduce }: { reduce: boolean | null }) {
  const railRef = useRef<HTMLDivElement>(null);
  // Progresso da linha azul atado ao scroll: preenche conforme a seção passa pela viewport.
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start 0.8", "end 0.55"] });
  const headTop = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: reduce ? 0 : 0.1 } },
  };

  return (
    <div ref={railRef} className="max-w-5xl mx-auto relative">
      {/* Center rail */}
      <div className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-border transform md:-translate-x-1/2 hidden sm:block" />
      {/* Linha de progresso que segue o scroll para baixo */}
      <motion.div
        className="absolute left-[28px] md:left-1/2 top-0 bottom-0 w-[2px] bg-accent origin-top transform md:-translate-x-1/2 hidden sm:block shadow-[0_0_15px_hsl(var(--accent)/0.6)]"
        style={{ scaleY: reduce ? 1 : scrollYProgress }}
      />
      {/* Cabeça luminosa que desce junto com o progresso */}
      {!reduce && (
        <motion.span
          aria-hidden="true"
          className="absolute left-[28px] md:left-1/2 w-3.5 h-3.5 rounded-full bg-accent -translate-x-1/2 -translate-y-1/2 hidden sm:block z-20 shadow-[0_0_16px_4px_hsl(var(--accent)/0.7)]"
          style={{ top: headTop }}
        />
      )}

      <motion.ol
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-12 md:space-y-24 list-none"
      >
        {timelineSteps.map((step, i) => {
          const isEven = i % 2 === 0;
          const Icon = step.icon;
          const item: Variants = {
            hidden: { opacity: 0, x: reduce ? 0 : isEven ? -48 : 48 },
            show: { opacity: 1, x: 0, transition: { duration: reduce ? 0 : 0.7, ease: EASE } },
          };
          return (
            <motion.li
              key={step.title}
              variants={item}
              className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
            >
              {/* Node */}
              <span className="absolute left-[16px] md:left-1/2 w-6 h-6 rounded-full bg-background border-4 border-accent transform -translate-x-1/2 mt-6 md:mt-0 z-10 hidden sm:block shadow-[0_0_10px_hsl(var(--accent)/0.3)]">
                <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" style={{ animationDuration: "2.6s" }} />
              </span>

              <div className={`w-full md:w-1/2 pt-6 sm:pt-0 ${isEven ? "md:pr-16 text-left md:text-right" : "md:pl-16 text-left"}`}>
                <div className="bg-surface border border-border p-8 rounded-[2rem] shadow-xl hover:border-accent/50 hover:shadow-2xl transition-all duration-300">
                  <div className={`flex items-center gap-4 mb-4 ${isEven ? "md:flex-row-reverse" : ""}`}>
                    <span className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                      <Icon size={24} />
                    </span>
                    <div className={isEven ? "md:text-right" : ""}>
                      <p className="font-mono text-xs text-accent mb-0.5">Etapa {String(i + 1).padStart(2, "0")}</p>
                      <h3 className="font-sans font-bold text-2xl text-foreground leading-tight text-balance">{step.title}</h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-lg leading-relaxed text-pretty">{step.desc}</p>

                  {step.isAction && (
                    <div className={`mt-6 flex ${isEven ? "md:justify-end" : "justify-start"}`}>
                      <Link
                        to="/orcamento"
                        className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform"
                      >
                        Solicitar Orçamento Agora <ArrowRight size={18} />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ol>
    </div>
  );
}

// ── Portal mockups ────────────────────────────────────────────────────────────

function BrowserChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
      </span>
      <span className="mx-auto flex items-center gap-1.5 text-[11px] font-mono text-white/45 bg-white/[0.04] rounded-md px-3 py-1 max-w-[70%] truncate">
        {label}
      </span>
    </div>
  );
}

function BlueprintMini({ reduce }: { reduce: boolean | null }) {
  const lines = [0, 1, 2, 3];
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden="true">
      <rect x="14" y="12" width="132" height="66" rx="4" fill="none" stroke="hsl(var(--accent))" strokeOpacity="0.35" strokeWidth="1.5" />
      {lines.map((i) => (
        <motion.line
          key={i}
          x1="26" y1={26 + i * 13} x2={26 + (i % 2 === 0 ? 78 : 52)} y2={26 + i * 13}
          stroke="hsl(var(--accent))" strokeWidth="1.6" strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0.7 : 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          transition={reduce ? { duration: 0 } : { duration: 1.6, delay: 0.3 + i * 0.2, ease: EASE, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.4 }}
        />
      ))}
      <motion.circle
        r="3" fill="hsl(var(--accent))"
        initial={{ cx: 26, cy: 26 }}
        animate={reduce ? { cx: 26, cy: 26 } : { cx: [26, 104, 104, 26], cy: [26, 26, 65, 65] }}
        transition={reduce ? { duration: 0 } : { duration: 5, repeat: Infinity, ease: "linear" }}
      />
    </svg>
  );
}

const DASH_MARCOS = [
  { name: "Briefing", state: "done" },
  { name: "Estudo Preliminar", state: "done" },
  { name: "Anteprojeto", state: "active" },
  { name: "Executivo", state: "pending" },
  { name: "Compatibilização", state: "pending" },
  { name: "Entrega + ART", state: "pending" },
] as const;

function DashboardMock({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="rounded-[1.25rem] overflow-hidden bg-gradient-to-br from-navy-dark to-navy border border-white/10 shadow-inner">
      <BrowserChrome label="portal.vertice.eng · Projeto Barraco" />
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-white/50 text-[11px] font-mono">OLÁ, MARINA</p>
            <p className="text-white font-bold text-lg leading-tight">Residência Barraco</p>
          </div>
          <span className="text-[10px] font-bold font-mono px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            ● EM ANDAMENTO
          </span>
        </div>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-white/60 text-[11px] font-mono tracking-wide">PROGRESSO DO PROJETO</span>
            <span className="text-white font-bold text-2xl tabular-nums">68<span className="text-accent text-base">%</span></span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent to-blue-400"
              initial={{ width: reduce ? "68%" : "0%" }}
              animate={{ width: "68%" }}
              transition={{ duration: reduce ? 0 : 1.2, ease: EASE, delay: 0.2 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4">
          {/* Marcos rail */}
          <ul className="space-y-2">
            {DASH_MARCOS.map((m) => (
              <li key={m.name} className="flex items-center gap-2.5">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    m.state === "done" ? "bg-green-500" : m.state === "active" ? "bg-accent" : "bg-white/15"
                  }`}
                >
                  {m.state === "done" && <Check size={10} className="text-white" strokeWidth={3.5} />}
                  {m.state === "active" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </span>
                <span className={`text-xs ${m.state === "pending" ? "text-white/40" : "text-white/85"}`}>{m.name}</span>
                {m.state === "active" && (
                  <span className="ml-auto text-[9px] font-mono text-accent">← FASE ATUAL</span>
                )}
              </li>
            ))}
          </ul>

          {/* Mini animated blueprint */}
          <div className="w-28 sm:w-32 rounded-xl bg-black/30 border border-white/10 p-2 self-start">
            <BlueprintMini reduce={reduce} />
            <p className="text-[9px] font-mono text-white/35 text-center mt-1">FASE ATUAL</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BimMock({ reduce }: { reduce: boolean | null }) {
  return (
    <div className="rounded-[1.25rem] overflow-hidden bg-navy-dark border border-white/10 h-full flex flex-col">
      <BrowserChrome label="modelo_barraco.ifc" />
      <div className="relative flex-1 min-h-[220px] overflow-hidden">
        {/* grid floor */}
        <svg viewBox="0 0 300 220" className="absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="bimglow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.12" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="300" height="220" fill="url(#bimglow)" />
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`h${i}`} x1="20" y1={150 + i * 14} x2="280" y2={150 + i * 14} stroke="hsl(var(--accent))" strokeOpacity="0.12" strokeWidth="1" />
          ))}

          {/* rotating wireframe house */}
          <motion.g
            style={{ transformOrigin: "150px 118px" }}
            initial={{ rotate: 0 }}
            animate={{ rotate: reduce ? 0 : 360 }}
            transition={reduce ? { duration: 0 } : { duration: 26, repeat: Infinity, ease: "linear" }}
            fill="none" stroke="hsl(var(--accent))" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
          >
            {/* front face */}
            <polyline points="112,150 178,150 178,104 112,104 112,150" strokeOpacity="0.9" />
            {/* back face (depth) */}
            <polyline points="138,135 204,135 204,89 138,89 138,135" strokeOpacity="0.4" />
            {/* connectors */}
            <line x1="112" y1="150" x2="138" y2="135" strokeOpacity="0.4" />
            <line x1="178" y1="150" x2="204" y2="135" strokeOpacity="0.4" />
            <line x1="112" y1="104" x2="138" y2="89" strokeOpacity="0.4" />
            <line x1="178" y1="104" x2="204" y2="89" strokeOpacity="0.4" />
            {/* roof */}
            <polyline points="112,104 145,80 178,104" strokeOpacity="0.9" />
            <polyline points="138,89 171,65 204,89" strokeOpacity="0.4" />
            <line x1="145" y1="80" x2="171" y2="65" strokeOpacity="0.55" />
            {/* door */}
            <polyline points="136,150 136,124 154,124 154,150" strokeOpacity="0.7" />
          </motion.g>

          {/* orbit dot */}
          <motion.circle
            r="3" fill="hsl(var(--accent))"
            style={{ transformOrigin: "150px 118px" }}
            initial={{ rotate: 0 }}
            animate={{ rotate: reduce ? 0 : 360 }}
            transition={reduce ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: "linear" }}
            cx="150" cy="60"
          />
        </svg>

        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25">IFC · WebGL</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-white/50">Arraste para girar</span>
          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">R$ 0 · SEM LICENÇA</span>
        </div>
      </div>
    </div>
  );
}

const DELIVERIES = [
  { title: "Contrato assinado", when: "09 mai", tone: "aprovado" },
  { title: "Estudo preliminar aprovado", when: "28 mai", tone: "revisao" },
  { title: "Anteprojeto em andamento", when: "21 jun", tone: "geral" },
  { title: "Fachada preliminar disponível", when: "28 jun", tone: "acao" },
] as const;

const DELIVERY_TONE: Record<string, { dot: string; chip: string; label: string }> = {
  aprovado: { dot: "bg-green-500", chip: "bg-green-500/10 text-green-600 border-green-500/20", label: "Aprovado" },
  revisao:  { dot: "bg-blue-500",  chip: "bg-blue-500/10 text-blue-600 border-blue-500/20",   label: "Em Revisão" },
  geral:    { dot: "bg-violet-500",chip: "bg-violet-500/10 text-violet-600 border-violet-500/20", label: "Registro" },
  acao:     { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Ação Requerida" },
};

function DeliveriesMock() {
  return (
    <div className="rounded-[1.25rem] overflow-hidden bg-surface-elevated border border-border h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
        <span className="bg-accent/15 text-accent px-2 py-0.5 rounded font-bold text-[10px] font-mono">[ LOG ]</span>
        <span className="font-sans font-bold text-sm text-navy">Registro de Entregas</span>
      </div>
      <ol className="relative p-5 pl-7 list-none">
        <span className="absolute left-[18px] top-6 bottom-6 w-[2px] bg-border" aria-hidden="true" />
        {DELIVERIES.map((d) => {
          const t = DELIVERY_TONE[d.tone];
          return (
            <li key={d.title} className="relative pl-5 pb-4 last:pb-0">
              <span className={`absolute -left-[5px] top-1 w-3 h-3 rounded-full ring-4 ring-surface-elevated ${t.dot}`} aria-hidden="true" />
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-sans font-bold text-sm text-navy leading-tight">{d.title}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${t.chip}`}>{t.label}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-muted-foreground font-mono">{d.when} · por Vértice</p>
                {d.tone === "acao" && (
                  <span className="text-[10px] font-bold text-white bg-amber-500 rounded px-2 py-0.5">Aprovar entrega</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="rounded-[1.25rem] overflow-hidden bg-surface-elevated border border-border h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white">
          <Sparkles size={15} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-surface" />
        </span>
        <div className="leading-tight">
          <p className="font-sans font-bold text-sm text-navy">Assistente Vértice</p>
          <p className="text-[11px] text-green-600 font-mono">online · equipe técnica</p>
        </div>
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="flex justify-end">
          <p className="max-w-[80%] bg-accent text-accent-foreground text-sm rounded-2xl rounded-br-md px-3.5 py-2 shadow-sm">
            Quando posso baixar as pranchas?
          </p>
        </div>
        <div className="flex justify-start">
          <p className="max-w-[85%] bg-muted text-navy text-sm rounded-2xl rounded-bl-md px-3.5 py-2">
            O projeto executivo está previsto para <strong>30/07</strong>. Assim que entregue, ele aparece aqui no seu portal, pronto para download. 📐
          </p>
        </div>
      </div>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
          <span className="text-sm text-muted-foreground flex-1">Escreva uma mensagem…</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Send size={13} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Portal view ───────────────────────────────────────────────────────────────

const PORTAL_FEATURES: { icon: typeof TrendingUp; title: string; desc: string }[] = [
  { icon: TrendingUp, title: "Progresso em tempo real", desc: "Porcentagem do projeto, cada marco e a fase atual — atualizado pela nossa equipe." },
  { icon: Boxes,      title: "Modelo 3D no navegador", desc: "Gire e explore o modelo BIM da sua casa. Sem instalar nada, sem licença paga." },
  { icon: ListChecks, title: "Registro de entregas",   desc: "Cada entrega vira um item na sua linha do tempo. Aprove direto por aqui." },
];

function PortalView({ reduce }: { reduce: boolean | null }) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: reduce ? 0 : 0.05 } },
  };
  const panel: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 28 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0 : 0.7, ease: EASE } },
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-sans font-extrabold text-3xl md:text-4xl text-foreground tracking-tight text-balance">
          Seu projeto, aberto na palma da mão
        </h2>
        <p className="text-muted-foreground text-lg mt-4 text-pretty">
          O acompanhamento que entregamos não existe em escritório nenhum da região. Espie o que você vê por dentro.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-6 gap-6"
      >
        {/* Row A — Dashboard hero + differentiator panel */}
        <motion.div variants={panel} className="lg:col-span-4 bg-surface border border-border rounded-[2rem] p-4 sm:p-5 shadow-2xl">
          <DashboardMock reduce={reduce} />
          <div className="px-2 pt-4">
            <h3 className="font-sans font-bold text-xl text-navy flex items-center gap-2">
              <TrendingUp size={20} className="text-accent" /> Progresso em tempo real
            </h3>
            <p className="text-muted-foreground mt-1.5 text-pretty">
              Nada de “e aí, como está meu projeto?”. A porcentagem, os marcos e a fase atual ficam sempre à vista.
            </p>
          </div>
        </motion.div>

        <motion.div variants={panel} className="lg:col-span-2 bg-navy-dark text-white rounded-[2rem] p-8 shadow-2xl flex flex-col">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/15 text-accent border border-accent/25 px-3 py-1 text-xs font-mono">
            <Sparkles size={13} /> O diferencial Vértice
          </span>
          <h3 className="font-sans font-bold text-2xl mt-4 leading-snug text-balance">
            Você nunca fica no escuro.
          </h3>
          <p className="text-white/70 mt-3 leading-relaxed text-pretty">
            Do briefing à entrega das pranchas, cada passo é acompanhado por um portal exclusivo — construído pela nossa própria engenharia.
          </p>
          <ul className="mt-6 space-y-3">
            {PORTAL_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-accent">
                    <Icon size={16} />
                  </span>
                  <span className="text-sm text-white/85 font-medium">{f.title}</span>
                </li>
              );
            })}
          </ul>
        </motion.div>

        {/* Row B — BIM + Deliveries */}
        <motion.div variants={panel} className="lg:col-span-3 bg-surface border border-border rounded-[2rem] p-4 sm:p-5 shadow-2xl flex flex-col">
          <div className="flex-1"><BimMock reduce={reduce} /></div>
          <div className="px-2 pt-4">
            <h3 className="font-sans font-bold text-xl text-navy flex items-center gap-2">
              <Boxes size={20} className="text-accent" /> Modelo 3D no navegador
            </h3>
            <p className="text-muted-foreground mt-1.5 text-pretty">
              Gire e explore o BIM da sua casa direto no site. Sem instalar nada, sem licença paga — custo zero para você.
            </p>
          </div>
        </motion.div>

        <motion.div variants={panel} className="lg:col-span-3 bg-surface border border-border rounded-[2rem] p-4 sm:p-5 shadow-2xl flex flex-col">
          <div className="flex-1"><DeliveriesMock /></div>
          <div className="px-2 pt-4">
            <h3 className="font-sans font-bold text-xl text-navy flex items-center gap-2">
              <ListChecks size={20} className="text-accent" /> Registro de entregas
            </h3>
            <p className="text-muted-foreground mt-1.5 text-pretty">
              Cada entrega entra na sua linha do tempo com status claro. Quando precisa da sua aprovação, é um clique.
            </p>
          </div>
        </motion.div>

        {/* Row C — Chat + CTA */}
        <motion.div variants={panel} className="lg:col-span-4 bg-surface border border-border rounded-[2rem] p-4 sm:p-5 shadow-2xl flex flex-col">
          <div className="flex-1"><ChatMock /></div>
          <div className="px-2 pt-4">
            <h3 className="font-sans font-bold text-xl text-navy flex items-center gap-2">
              <MessageSquare size={20} className="text-accent" /> Fale com a equipe
            </h3>
            <p className="text-muted-foreground mt-1.5 text-pretty">
              Dúvidas a qualquer hora. Assistente inteligente e time técnico no mesmo lugar — histórico salvo por projeto.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={panel}
          className="lg:col-span-2 rounded-[2rem] p-8 shadow-2xl flex flex-col justify-between text-white"
          style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--navy)), hsl(var(--accent)))" }}
        >
          <div>
            <h3 className="font-sans font-extrabold text-2xl leading-snug text-balance">
              Quer acompanhar seu projeto assim?
            </h3>
            <p className="text-white/80 mt-3 text-pretty">
              O portal é liberado para todo cliente com orçamento fechado. Comece pela conversa.
            </p>
          </div>
          <Link
            to="/orcamento"
            className="mt-6 inline-flex items-center justify-center gap-2 bg-white text-navy font-bold px-6 py-3 rounded-full hover:scale-[1.03] transition-transform"
          >
            Solicitar Orçamento <ArrowRight size={18} />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const Processo = () => {
  useScrollToTop();
  const reduce = useReducedMotion();
  const [view, setView] = useState<ViewKey>("timeline");
  const baseId = useId();

  return (
    <div className="bg-background min-h-screen text-foreground antialiased selection:bg-accent/30 selection:text-accent-foreground overflow-hidden">
      <Navbar />

      <main className="pt-40 pb-32 px-6 md:px-12 lg:px-24">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-14">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">Nossa Metodologia</span>
          <h1 className="font-sans font-extrabold text-4xl md:text-5xl lg:text-6xl mt-4 text-foreground leading-[1.05] tracking-tight text-balance">
            Um processo transparente.<br />Um portal que prova.
          </h1>
          <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto text-pretty">
            Conheça as 6 etapas que seu projeto percorre — e o portal exclusivo onde você acompanha cada uma delas em tempo real.
          </p>
        </div>

        {/* Toggle */}
        <div className="mb-16">
          <ViewToggle active={view} onChange={setView} baseId={baseId} />
        </div>

        {/* Panels */}
        <AnimatePresence mode="wait">
          <motion.section
            key={view}
            id={`${baseId}-panel-${view}`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${view}`}
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
          >
            {view === "timeline" ? <TimelineView reduce={reduce} /> : <PortalView reduce={reduce} />}
          </motion.section>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

export default Processo;
