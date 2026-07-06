import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Layers, Zap, Droplets, HardHat, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

gsap.registerPlugin(ScrollTrigger);

/* ─── SCENE 1: Arquitetônico ─── */
const ArqScene = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".arq-layer", {
        rotateX: 60,
        rotateZ: 45,
        y: (i) => i * -20,
        opacity: (i) => 1 - (i * 0.2),
        duration: 2,
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
        ease: "power2.inOut"
      });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative border border-border/40 rounded-2xl h-full w-full bg-zinc-50 dark:bg-black/25 overflow-hidden flex items-center justify-center perspective-[1000px] min-h-[160px]" ref={container}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="arq-layer absolute w-2/3 h-24 border-2 border-accent bg-background/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.15)]">
          <Layers className="text-accent/80 w-6 h-6" />
        </div>
      ))}
    </div>
  );
};

/* ─── SCENE 2: Estrutural ─── */
const EstScene = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".beam-horizontal", { scaleX: 1.2, duration: 1, repeat: -1, yoyo: true, ease: "power1.inOut", stagger: 0.1 });
      gsap.to(".beam-vertical", { scaleY: 1.2, duration: 1.5, repeat: -1, yoyo: true, ease: "power1.inOut", stagger: 0.1 });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative border border-border/40 rounded-2xl h-full w-full bg-navy-dark overflow-hidden flex flex-col justify-center items-center gap-4 min-h-[160px]" ref={container}>
      <div className="w-3/4 h-2 beam-horizontal bg-foreground shadow-[0_0_5px_#fff]"></div>
      <div className="flex gap-12 h-16">
        <div className="w-2 h-full beam-vertical bg-foreground shadow-[0_0_5px_#fff]"></div>
        <div className="w-2 h-full beam-vertical bg-foreground shadow-[0_0_5px_#fff]"></div>
        <div className="w-2 h-full beam-vertical bg-foreground shadow-[0_0_5px_#fff]"></div>
      </div>
      <div className="w-3/4 h-2 beam-horizontal bg-foreground shadow-[0_0_5px_#fff]"></div>
      <HardHat size={16} className="absolute bottom-2 right-2 text-white/50" />
    </div>
  );
};

/* ─── SCENE 3: Elétrico ─── */
const EletricoScene = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 });
      tl.to(".energy-node", { opacity: 1, duration: 0.2, stagger: 0.1 })
        .to(".energy-node", { opacity: 0.2, duration: 0.5, stagger: 0.1 }, "+=0.5");
      gsap.to(".circuit-line", { strokeDashoffset: -100, duration: 2, repeat: -1, ease: "linear" });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative border border-border/40 rounded-2xl h-full w-full overflow-hidden flex items-center justify-center bg-zinc-50 dark:bg-black/25 min-h-[160px]" ref={container}>
      <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full opacity-50">
        <path d="M 20 50 L 60 50 L 80 20 L 120 80 L 140 50 L 180 50" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="10 5" className="circuit-line" />
      </svg>
      <div className="flex gap-16 relative z-10">
        <div className="energy-node opacity-20 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]"></div>
        <div className="energy-node opacity-20 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]"></div>
        <div className="energy-node opacity-20 w-4 h-4 rounded-full bg-accent shadow-[0_0_15px_hsl(var(--accent))]"></div>
      </div>
      <Zap size={16} className="absolute bottom-2 right-2 text-accent" />
    </div>
  );
};

/* ─── SCENE 4: Hidrossanitário ─── */
const HidroScene = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".water-level", { y: -20, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".flow-arrow", { y: 10, opacity: 0, duration: 1.5, repeat: -1, ease: "power1.in" });
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative border border-border/40 rounded-2xl h-full w-full overflow-hidden flex justify-center items-end pb-4 bg-zinc-50 dark:bg-black/25 min-h-[160px]" ref={container}>
      <div className="w-16 h-32 border-x-4 border-b-4 border-muted-foreground/30 rounded-b-xl relative overflow-hidden flex justify-center">
        <div className="water-level absolute bottom-0 left-0 right-0 h-40 bg-accent/30 translate-y-20 rounded-t-full"></div>
        <div className="flow-arrow absolute top-4 text-accent">↓</div>
        <div className="flow-arrow absolute top-12 text-accent" style={{ animationDelay: "0.5s" }}>↓</div>
      </div>
      <Droplets size={16} className="absolute bottom-2 right-2 text-accent" />
    </div>
  );
};

/* ─── ISOMETRIC 3D BIM — FLAT/SAAS MINIMALISTA ─── */

/**
 * Laje isométrica com cantos arredondados: um rect com rx rotacionado 45°
 * e achatado verticalmente (scale 1×0.5) vira um losango iso perfeito.
 * Duas cópias deslocadas dão a espessura (topo + lateral).
 */
const IsoSlab = ({
  cx,
  cy,
  w,
  rx = 12,
  topClass,
  sideClass,
}: {
  cx: number;
  cy: number;
  w: number;
  rx?: number;
  topClass: string;
  sideClass: string;
}) => (
  <g>
    <rect
      x={-w} y={-w} width={w * 2} height={w * 2} rx={rx}
      className={sideClass}
      transform={`translate(${cx} ${cy + 7}) scale(1 0.5) rotate(45)`}
    />
    <rect
      x={-w} y={-w} width={w * 2} height={w * 2} rx={rx}
      className={topClass} strokeWidth="1"
      transform={`translate(${cx} ${cy}) scale(1 0.5) rotate(45)`}
    />
  </g>
);

/* Caminhos 2.5D (segmentos verticais ou com inclinação isométrica ±0.5) */
const EST_COLS = "M 180 338 V 98 M 420 338 V 98 M 300 412 V 158 M 300 278 V 38";
const HID_MAIN = "M 300 84 L 300 120 L 240 150 L 240 210 L 300 240 L 300 310";
const HID_BRANCH = "M 240 210 L 195 232 L 195 290";
const HID_DRAIN = "M 300 310 L 355 337 L 355 375";
const ELE_MAIN = "M 428 345 L 428 255 L 363 222 L 363 155 L 303 125";
const ELE_BRANCH = "M 363 222 L 310 248";

const BimSvg = ({ layers }: { layers: { arq: boolean; est: boolean; ele: boolean; hid: boolean } }) => {
  return (
    <motion.svg
      viewBox="0 0 600 440"
      className="w-full h-full max-h-[380px] select-none overflow-visible"
      style={{ transformPerspective: 900 }}
      animate={{ rotateY: [-6, 6, -6], y: [0, -5, 0] }}
      transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <filter id="bimGlowF" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <style>{`
          @keyframes bimDashFlow { to { stroke-dashoffset: -24; } }
          .bim-dash-flow { animation: bimDashFlow 1.6s linear infinite; }
          @media (prefers-reduced-motion: reduce) { .bim-dash-flow { animation: none; } }
        `}</style>
      </defs>

      {/* Terreno + sombra projetada (sempre visíveis) */}
      <ellipse cx="300" cy="394" rx="200" ry="46" className="fill-black/10 dark:fill-black/40" />
      <IsoSlab
        cx={300} cy={352} w={120} rx={18}
        topClass="fill-zinc-100 dark:fill-zinc-900 stroke-zinc-300 dark:stroke-zinc-700"
        sideClass="fill-zinc-300 dark:fill-zinc-800"
      />
      <g className="text-zinc-300 dark:text-zinc-700" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 5">
        <line x1="140" y1="352" x2="460" y2="352" />
        <line x1="300" y1="272" x2="300" y2="432" />
      </g>

      <AnimatePresence>
        {/* ESTRUTURA — cinza/slate: pilares wireframe + lajes empilhadas */}
        {layers.est && (
          <motion.g
            key="structure"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.82 }}
            transition={{ type: "spring", stiffness: 160, damping: 19 }}
            style={{ transformOrigin: "300px 380px", transformBox: "view-box" }}
          >
            {/* Fundações */}
            {[[180, 338], [420, 338], [300, 412], [300, 278]].map(([fx, fy]) => (
              <IsoSlab
                key={`${fx}-${fy}`} cx={fx} cy={fy} w={15} rx={5}
                topClass="fill-slate-300 dark:fill-slate-600"
                sideClass="fill-slate-400 dark:fill-slate-700"
              />
            ))}

            {/* Pilares — traço duplo (halo + linha fina brilhante) */}
            <path d={EST_COLS} fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" opacity="0.18" />
            <path d={EST_COLS} fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-slate-400 dark:stroke-slate-400" />

            {/* Lajes com cantos arredondados */}
            <IsoSlab
              cx={300} cy={258} w={85} rx={12}
              topClass="fill-white dark:fill-zinc-800 stroke-slate-300 dark:stroke-slate-600"
              sideClass="fill-slate-200 dark:fill-slate-700"
            />
            <IsoSlab
              cx={300} cy={178} w={85} rx={12}
              topClass="fill-white dark:fill-zinc-800 stroke-slate-300 dark:stroke-slate-600"
              sideClass="fill-slate-200 dark:fill-slate-700"
            />
            <IsoSlab
              cx={300} cy={98} w={85} rx={12}
              topClass="fill-white dark:fill-zinc-800 stroke-slate-300 dark:stroke-slate-600"
              sideClass="fill-slate-200 dark:fill-slate-700"
            />
          </motion.g>
        )}

        {/* ARQUITETURA — fachadas de vidro translúcidas + montantes */}
        {layers.arq && (
          <motion.g
            key="architecture"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 170, damping: 20 }}
            style={{ transformOrigin: "300px 220px", transformBox: "view-box" }}
            stroke="#38bdf8" fill="#38bdf8" strokeLinejoin="round"
          >
            {/* Pavimento inferior */}
            <polygon points="180,258 300,318 300,238 180,178" fillOpacity="0.08" strokeOpacity="0.55" strokeWidth="1.2" />
            <polygon points="300,318 420,258 420,178 300,238" fillOpacity="0.08" strokeOpacity="0.55" strokeWidth="1.2" />
            {/* Pavimento superior */}
            <polygon points="180,178 300,238 300,158 180,98" fillOpacity="0.08" strokeOpacity="0.55" strokeWidth="1.2" />
            <polygon points="300,238 420,178 420,98 300,158" fillOpacity="0.08" strokeOpacity="0.55" strokeWidth="1.2" />

            {/* Montantes (esquadrias) */}
            <g fill="none" strokeOpacity="0.35" strokeWidth="0.8">
              <line x1="220" y1="278" x2="220" y2="198" />
              <line x1="260" y1="298" x2="260" y2="218" />
              <line x1="340" y1="298" x2="340" y2="218" />
              <line x1="380" y1="278" x2="380" y2="198" />
              <line x1="220" y1="198" x2="220" y2="118" />
              <line x1="260" y1="218" x2="260" y2="138" />
              <line x1="340" y1="218" x2="340" y2="138" />
              <line x1="380" y1="198" x2="380" y2="118" />
            </g>
          </motion.g>
        )}

        {/* HIDRÁULICA — azul: tubulação acende progressivamente + esferas de fluxo */}
        {layers.hid && (
          <motion.g
            key="hydraulics"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{ transformOrigin: "280px 200px", transformBox: "view-box" }}
          >
            {/* Caixa d'água na cobertura */}
            <path d="M 286 58 L 286 80 A 14 5.5 0 0 0 314 80 L 314 58" fill="#3b82f6" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="1.8" />
            <ellipse cx="300" cy="58" rx="14" ry="5.5" fill="#3b82f6" fillOpacity="0.35" stroke="#3b82f6" strokeWidth="1.8" />

            {/* Tubos base (apagados) */}
            <path d={HID_MAIN} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
            <path d={HID_BRANCH} fill="none" stroke="#3b82f6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />

            {/* Acendimento progressivo */}
            <motion.path
              d={HID_MAIN} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
            <motion.path
              d={HID_BRANCH} fill="none" stroke="#3b82f6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: 0.7, ease: "easeInOut" }}
            />

            {/* Dreno tracejado com fluxo contínuo */}
            <path d={HID_DRAIN} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="5 7" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" className="bim-dash-flow" />

            {/* Esferas de fluxo percorrendo os tubos */}
            <circle r="3.2" fill="#dbeafe" filter="url(#bimGlowF)">
              <animateMotion dur="3.2s" repeatCount="indefinite" path={HID_MAIN} />
            </circle>
            <circle r="2.6" fill="#dbeafe" filter="url(#bimGlowF)">
              <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite" path={HID_BRANCH} />
            </circle>
          </motion.g>
        )}

        {/* ELÉTRICA — laranja: conduítes acendem + esferas de corrente + luminárias */}
        {layers.ele && (
          <motion.g
            key="electrical"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{ transformOrigin: "380px 230px", transformBox: "view-box" }}
          >
            {/* Quadro de distribuição */}
            <rect x="421" y="337" width="14" height="19" rx="2.5" fill="#f97316" fillOpacity="0.9" />

            {/* Conduítes base (apagados) */}
            <path d={ELE_MAIN} fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
            <path d={ELE_BRANCH} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />

            {/* Acendimento progressivo */}
            <motion.path
              d={ELE_MAIN} fill="none" stroke="#f97316" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
            <motion.path
              d={ELE_BRANCH} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.9, ease: "easeInOut" }}
            />

            {/* Esferas de corrente */}
            <circle r="3" fill="#ffedd5" filter="url(#bimGlowF)">
              <animateMotion dur="2.6s" repeatCount="indefinite" path={ELE_MAIN} />
            </circle>
            <circle r="2.4" fill="#ffedd5" filter="url(#bimGlowF)">
              <animateMotion dur="1.8s" begin="1s" repeatCount="indefinite" path={ELE_BRANCH} />
            </circle>

            {/* Luminárias pulsando */}
            {[[303, 125], [363, 155], [310, 248]].map(([lx, ly], i) => (
              <motion.circle
                key={`${lx}-${ly}`} cx={lx} cy={ly} r="4" fill="#f97316" filter="url(#bimGlowF)"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
              />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
};

/* ─── TOGGLE BUTTON COMPONENT ─── */
const ToggleButton = ({
  label,
  active,
  onClick,
  colorClass,
  inactiveClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colorClass: string;
  inactiveClass: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-bold py-3 px-4 rounded-xl border transition-all duration-300 ${
        active ? `${colorClass} shadow-md` : inactiveClass
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-current animate-pulse" : "bg-muted-foreground/50"}`} />
        {label}
      </div>
    </button>
  );
};

/* ─── MAIN BIM VISUALIZER COMPONENT ─── */
const BimVisualizer = () => {
  const [layers, setLayers] = useState({
    arq: true,
    est: true,
    ele: true,
    hid: true,
  });

  const toggleLayer = (layer: 'arq' | 'est' | 'ele' | 'hid') => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const toggleAll = (value: boolean) => {
    setLayers({
      arq: value,
      est: value,
      ele: value,
      hid: value,
    });
  };

  const allActive = layers.arq && layers.est && layers.ele && layers.hid;
  const noneActive = !layers.arq && !layers.est && !layers.ele && !layers.hid;

  const getDynamicInfo = () => {
    if (noneActive) {
      return "Selecione uma ou mais disciplinas no menu lateral para visualizar como a engenharia se integra no modelo digital.";
    }
    if (allActive) {
      return "Modelo Federado Completo: Arquitetura, estrutura, elétrica e hidráulica totalmente compatibilizados. O modelo final é validado em ambiente digital antes da escavação das fundações, eliminando 100% dos conflitos de obra.";
    }
    
    const activeList = [];
    if (layers.arq) activeList.push("arquitetura");
    if (layers.est) activeList.push("estrutura");
    if (layers.ele) activeList.push("elétrica");
    if (layers.hid) activeList.push("hidráulica");

    if (layers.est && layers.hid && activeList.length === 2) {
      return "Compatibilização Hidro-Estrutural: Furos para passagens de canos de esgoto e escoamento pluvial são calculados e previstos dentro de vigas e pilares antes da concretagem, evitando cortes com martelete que poderiam abalar a segurança estrutural.";
    }
    if (layers.est && layers.ele && activeList.length === 2) {
      return "Compatibilização Eletro-Estrutural: O caminhamento de conduítes e caixas de passagem é planejado para desviar da ferragem pesada das vigas e lajes, assegurando que a concretagem ocorra de forma contínua e sem obstruções.";
    }
    if (layers.arq && layers.ele && activeList.length === 2) {
      return "Compatibilização Arq-Elétrica: Luminárias, spots de LED e interruptores são integrados à paginação de gesso e layout de móveis da arquitetura, garantindo a simetria estética e o funcionamento prático dos circuitos.";
    }
    if (layers.arq && layers.est && activeList.length === 2) {
      return "Compatibilização Arq-Estrutural: Garantia de que vigas e pilares fiquem embutidos nas alvenarias. Pilares não invadem áreas de passagens ou janelas, mantendo a integridade estética desenhada pela arquitetura.";
    }
    if (layers.ele && layers.hid && activeList.length === 2) {
      return "Compatibilização Eletro-Hidráulica: Distanciamento seguro entre tubulações de água e eletrodutos de energia. Evita-se que fiações elétricas cruzem áreas molhadas ou fiquem expostas a condensação de água.";
    }
    
    return `Modelagem Integrada (${activeList.join(" + ")}): Análise de sobreposição de projetos para mitigação de imprevistos e otimização do cronograma físico-financeiro da sua construção.`;
  };

  return (
    <div className="bg-surface/30 dark:bg-white/[0.02] border border-border/40 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 lg:p-10 shadow-2xl my-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left column: controls */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full min-h-[350px] text-left">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Integração BIM</span>
            <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-foreground mt-2">
              Modelo Federado 3D
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm mt-3 leading-relaxed">
              Clique nos botões abaixo para ligar e desligar as disciplinas do projeto. Veja como as engenharias se sobrepõem e interagem no modelo virtual da VEBRAM.
            </p>
          </div>

          <div className="my-6 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton
                label="Arquitetura"
                active={layers.arq}
                onClick={() => toggleLayer('arq')}
                colorClass="border-sky-500/30 text-sky-500 bg-sky-500/10"
                inactiveClass="border-border/50 text-muted-foreground hover:text-foreground"
              />
              <ToggleButton
                label="Estrutura"
                active={layers.est}
                onClick={() => toggleLayer('est')}
                colorClass="border-slate-500/30 text-slate-500 bg-slate-500/10"
                inactiveClass="border-border/50 text-muted-foreground hover:text-foreground"
              />
              <ToggleButton
                label="Elétrica"
                active={layers.ele}
                onClick={() => toggleLayer('ele')}
                colorClass="border-orange-500/30 text-orange-500 bg-orange-500/10"
                inactiveClass="border-border/50 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              />
              <ToggleButton
                label="Hidráulica"
                active={layers.hid}
                onClick={() => toggleLayer('hid')}
                colorClass="border-blue-500/30 text-blue-500 bg-blue-500/10"
                inactiveClass="border-border/50 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              />
            </div>
            
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => toggleAll(true)}
                className="flex-1 text-[10px] font-bold font-mono tracking-wider py-2 rounded-lg bg-muted border border-border text-foreground/70 hover:text-foreground hover:bg-muted/70 transition-colors"
              >
                LIGAR TODOS
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="flex-1 text-[10px] font-bold font-mono tracking-wider py-2 rounded-lg bg-muted border border-border text-foreground/70 hover:text-foreground hover:bg-muted/70 transition-colors"
              >
                DESLIGAR TODOS
              </button>
            </div>
          </div>

          <div className="bg-accent/5 border border-accent/15 rounded-2xl p-4 min-h-[120px] flex flex-col justify-center">
            <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent mb-1 text-left">
              Foco em Compatibilização
            </h4>
            <p className="text-xs text-foreground/80 leading-relaxed font-sans text-left">
              {getDynamicInfo()}
            </p>
          </div>
        </div>

        {/* Right column: SVG Graphic */}
        <div className="lg:col-span-7 bg-zinc-50 dark:bg-black/25 rounded-3xl border border-border/30 p-4 flex items-center justify-center min-h-[380px]">
          <BimSvg layers={layers} />
        </div>

      </div>
    </div>
  );
};

/* ─── REUSABLE GLOW CARD CONTAINER ─── */
interface GlowCardProps {
  children: React.ReactNode;
  accentColorGlow: string;
  isExpanded: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}

const GlowCard = ({ children, accentColorGlow, isExpanded, onClick, onClose }: GlowCardProps) => {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      layout
      onClick={!isExpanded ? onClick : undefined}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`relative bg-surface/50 dark:bg-white/[0.02] border border-border/50 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between h-full ${
        !isExpanded ? "cursor-pointer hover:border-zinc-300 dark:hover:border-white/20" : ""
      }`}
      style={{
        boxShadow: hovering && !isExpanded
          ? `0 20px 40px -15px rgba(${accentColorGlow}, 0.15)`
          : undefined,
      }}
    >
      {/* Interactive Background Glow */}
      {hovering && !isExpanded && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(350px circle at ${coords.x}px ${coords.y}px, rgba(${accentColorGlow}, 0.12), transparent 80%)`,
          }}
        />
      )}

      {/* Close Button inside Card */}
      {isExpanded && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-white/5 border border-border/60 text-muted-foreground hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/5 transition-colors text-[11px] font-bold font-mono uppercase tracking-wider"
            title="Fechar detalhes"
          >
            Fechar
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {children}
    </motion.div>
  );
};

/* ─── DATA FOR ALL SERVICES ─── */
const SERVICES_DATA = [
  {
    id: "arq",
    title: "Projeto Arquitetônico",
    description: "Concepção espacial e funcional, aliando estética à viabilidade técnica e aprovação legal.",
    purpose: "Tradução de necessidades e sonhos em espaços funcionais e estéticos, em conformidade com as normas municipais e exigências de condomínios.",
    deliverables: [
      "Estudo preliminar detalhado com modelagem tridimensional (3D).",
      "Anteprojeto para aprovação em Prefeitura e órgãos ambientais.",
      "Projeto executivo completo (plantas, cortes e especificações).",
      "Detalhamento de paginações de piso, forro e iluminação básica.",
      "Memorial descritivo técnico de materiais e acabamentos recomendados."
    ],
    softwares: ["Autodesk Revit", "SketchUp", "Enscape / V-Ray"],
    bimAdvantage: "O modelo é desenvolvido tridimensionalmente em tempo real; qualquer alteração atualiza automaticamente plantas e quantitativos, eliminando erros de prancha.",
    accentGlow: "14, 165, 233", // Sky blue glow
    scene: ArqScene
  },
  {
    id: "est",
    title: "Projeto Estrutural",
    description: "Dimensionamento seguro com profissional habilitado (CREA). Foco em economia e robustez.",
    purpose: "Dimensionamento seguro e otimizado das fundações e superestruturas, focado na racionalização de concreto e aço e na durabilidade da edificação.",
    deliverables: [
      "Locação e dimensionamento de cargas para fundações.",
      "Detalhamento de infraestrutura (sapatas, blocs de coroamento, estacas).",
      "Dimensionamento tridimensional de superestruturas (vigas, pilares, lajes).",
      "Desenhos detalhados de armações de aço e tabelas de dobragem.",
      "Memorial de cálculo técnico e emissão de ART vinculada ao CREA."
    ],
    softwares: ["TQS", "AltoQi Eberick", "Autodesk Revit"],
    bimAdvantage: "O modelo estrutural tridimensional é sobreposto aos demais projetos para identificação automática de conflitos físicos (clash detection).",
    accentGlow: "226, 232, 240", // Silver glow
    scene: EstScene
  },
  {
    id: "ele",
    title: "Projeto Elétrico",
    description: "Distribuição inteligente de cargas, iluminação e automação residencial.",
    purpose: "Planejamento elétrico de tomadas, circuitos de energia, cabeamento estruturado e infraestrutura para automação inteligente ou painéis solares.",
    deliverables: [
      "Layout técnico de pontos de energia, interruptores e tomadas.",
      "Cálculo luminotécnico integrado para conforto visual.",
      "Quadros de distribuição de cargas e dimensionamento de disjuntores.",
      "Caminhamento tridimensional de tubulações e eletrodutos no forro.",
      "Diagramas unifilares completos para execução segura."
    ],
    softwares: ["AltoQi QiBuilder", "Dialux Evo", "Revit MEP"],
    bimAdvantage: "Com as tubulações modeladas em 3D, garante-se que os eletrodutos passem pelo forro de forma contínua, sem colidir com vigas ou tubos de queda.",
    accentGlow: "245, 158, 11", // Amber glow
    scene: EletricoScene
  },
  {
    id: "hid",
    title: "Projeto Hidrossanitário",
    description: "Sistemas eficientes de abastecimento, esgoto e aproveitamento de água da chuva.",
    purpose: "Dimensionamento de sistemas prediais hidráulicos e sanitários, assegurando fluxo adequado, ausência de odores e reaproveitamento de água pluvial.",
    deliverables: [
      "Redes de distribuição de água fria, água quente e recirculação.",
      "Rede de esgoto sanitário e ventilação para impedir odores nos ralos.",
      "Drenagem pluvial de calhas, condutores e caixas de passagem.",
      "Detalhamentos isométricos e vistas de instalação de áreas molhadas.",
      "Memorial técnico de dimensionamento de pressões e vazões."
    ],
    softwares: ["AltoQi QiBuilder", "Revit MEP"],
    bimAdvantage: "As inclinações e caimentos da tubulação de esgoto são simuladas e validadas fisicamente em 3D, garantindo a vazão sem comprometer o gesso do teto.",
    accentGlow: "59, 130, 246", // Blue glow
    scene: HidroScene
  }
];

const Servicos = () => {
  useScrollToTop();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".services-header", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });
      gsap.from(".feature-card", {
        scale: 0.95,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.1
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-background min-h-screen text-foreground antialiased selection:bg-accent/30 selection:text-accent-foreground overflow-x-hidden">
      <Navbar />

      <main className="pt-28 pb-16 md:pt-40 md:pb-32 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto" ref={sectionRef}>
          {/* Header */}
          <div className="services-header mb-10 md:mb-16 max-w-3xl">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-bold">Nossas Disciplinas</span>
            <h1 className="font-sans font-extrabold text-4xl md:text-5xl lg:text-6xl mt-4 text-foreground leading-tight">
              Especialidades VEBRAM.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg mt-6 leading-relaxed">
              Dominamos as 4 áreas fundamentais da engenharia residencial. A grande vantagem de integrar os projetos complementares com o arquitetônico em nosso escritório é a compatibilização nativa: eliminamos retrabalhos e colisões físicas antes mesmo da obra começar.
            </p>
          </div>

          {/* Interactive BIM Layers Visualizer Section */}
          <BimVisualizer />

          <p className="text-accent font-sans font-bold text-xs md:text-sm mt-8 mb-6 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <span>●</span> Selecione uma disciplina para explorar entregas detalhadas e diferenciais
          </p>

          {/* Dynamic Grid Layout */}
          <motion.div
            layout="position"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch"
          >
            {SERVICES_DATA.map((srv, i) => {
              const SceneComponent = srv.scene;
              const isExpanded = activeCardId === srv.id;

              // Em telas md+ (grid de 2 colunas), o card da direita de cada par
              // (est, hid) precisa "roubar" a ordem do card da esquerda ao
              // expandir, senão o grid empurra ele para uma linha nova em vez
              // de ocupar a linha do par (o da esquerda desce, como já ocorre
              // naturalmente quando é ele quem expande).
              const ORDER_CLASSES = ["md:order-none", "md:order-1", "md:order-2", "md:order-3"];
              const pairLeft = i - (i % 2);
              const pairRight = pairLeft + 1;
              const rightOfPairExpanded = activeCardId === SERVICES_DATA[pairRight]?.id;
              let orderClass = "";
              if (rightOfPairExpanded) {
                if (i === pairRight) orderClass = ORDER_CLASSES[pairLeft];
                else if (i === pairLeft) orderClass = ORDER_CLASSES[pairRight];
              }

              return (
                <motion.div
                  key={srv.id}
                  layout
                  className={`feature-card ${isExpanded ? "md:col-span-2" : "col-span-1"} ${orderClass}`}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                >
                  <GlowCard
                    accentColorGlow={srv.accentGlow}
                    isExpanded={isExpanded}
                    onClick={() => setActiveCardId(srv.id)}
                    onClose={(e) => {
                      e.stopPropagation();
                      setActiveCardId(null);
                    }}
                  >
                    {isExpanded ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start w-full">
                        {/* Text Details (2/3 width) */}
                        <div className="lg:col-span-2 space-y-5 text-left">
                          <div>
                            <h3 className="font-sans font-extrabold text-2xl md:text-3xl text-foreground">
                              {srv.title}
                            </h3>
                            <p className="text-muted-foreground text-xs md:text-sm mt-2 font-medium leading-relaxed">
                              {srv.purpose}
                            </p>
                          </div>

                          <div className="border-t border-border/40 pt-4">
                            <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-accent mb-3">
                              Entregáveis Principais
                            </h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-foreground/80">
                              {srv.deliverables.map((deliv, index) => (
                                <li key={index} className="flex items-start gap-2.5">
                                  <Check size={14} className="text-accent shrink-0 mt-0.5" strokeWidth={3} />
                                  <span className="leading-snug">{deliv}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border/40">
                            <div>
                              <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground mb-2">
                                Softwares e Ferramentas
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {srv.softwares.map((sw, index) => (
                                  <span
                                    key={index}
                                    className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200/50 dark:border-white/10 text-foreground/70"
                                  >
                                    {sw}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-bold font-mono uppercase tracking-wider text-muted-foreground mb-2">
                                Diferencial Integrado BIM
                              </h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {srv.bimAdvantage}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Scene Side-Panel (1/3 width) */}
                        <div className="lg:col-span-1 flex flex-col justify-between h-full min-h-[220px] bg-zinc-100/40 dark:bg-black/10 p-4 rounded-3xl border border-border/20">
                          <div className="flex-1 w-full overflow-hidden rounded-2xl">
                            <SceneComponent />
                          </div>
                          <div className="mt-4 shrink-0">
                            <a
                              href="/orcamento"
                              className="w-full inline-flex items-center justify-center text-xs font-bold tracking-widest px-4 py-3 rounded-xl bg-accent text-white hover:bg-accent/90 transition-all font-mono shadow-lg shadow-accent/20 cursor-pointer text-center"
                            >
                              SOLICITAR ORÇAMENTO
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between h-full min-h-[18rem] text-left">
                        <div>
                          <h3 className="font-sans font-bold text-2xl text-foreground group-hover:text-accent transition-colors">
                            {srv.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                            {srv.description}
                          </p>
                        </div>
                        <div className="h-40 w-full mt-5 overflow-hidden rounded-2xl">
                          <SceneComponent />
                        </div>
                      </div>
                    )}
                  </GlowCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Servicos;
