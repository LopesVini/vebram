import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Activity, FileCheck, Layers, Clock as ClockIcon,
  Check, Send, Sparkles, Bot, Loader2, Inbox, Trash2,
  Compass, Ruler, Blocks, ClipboardCheck, Award, Briefcase,
} from "lucide-react";
import { useGroqChat } from "@/hooks/data/useGroqChat";
import { useClientProject } from "@/hooks/data/useClientProject";
import { useMilestones, calcProgress } from "@/hooks/data/useMilestones";
import { useUpdates } from "@/hooks/data/useUpdates";

// ── Animated Progress Panel ───────────────────────────────────────────────────

const MILESTONE_COLORS = [
  "#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#f43f5e",
  "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899", "#14b8a6",
];

type PhaseKind = "briefing" | "anteprojeto" | "legal" | "executivo" | "bim" | "estrutura" | "default";

function phaseKind(name: string): PhaseKind {
  const n = name.toLowerCase();
  if (n.includes("brief")) return "briefing";
  if (n.includes("antepro")) return "anteprojeto";
  if (n.includes("legal") || n.includes("aprov")) return "legal";
  if (n.includes("execut")) return "executivo";
  if (n.includes("bim") || n.includes("compat") || n.includes("federa")) return "bim";
  if (n.includes("estrut") || n.includes("obra") || n.includes("constr") || n.includes("entrega")) return "estrutura";
  return "default";
}

// ── Phase scenes ─────────────────────────────────────────────────────────────

function BriefingScene({ color }: { color: string }) {
  return (
    <g>
      <rect x="100" y="40" width="40" height="14" rx="3" fill={color} />
      <rect x="68" y="55" width="104" height="148" rx="6" fill="white" fillOpacity="0.04" stroke={color} strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map(i => (
        <motion.line
          key={i}
          x1="80" y1={80 + i * 18} x2={80 + (i % 2 === 0 ? 80 : 60)} y2={80 + i * 18}
          stroke={color} strokeWidth="2" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 1, 0] }}
          transition={{ duration: 5, times: [0, 0.45, 0.85, 1], repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
      <motion.circle
        r="4" fill={color}
        animate={{ cx: [80, 160, 80, 160, 80], cy: [80, 80, 134, 134, 188] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />
    </g>
  );
}

function AnteprojetoScene({ color }: { color: string }) {
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M40 140 L120 70 L200 140" strokeWidth="2.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 5, times: [0, 0.2, 0.85, 1], repeat: Infinity }}
      />
      <motion.path
        d="M55 140 L55 205 L185 205 L185 140" strokeWidth="2.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 5, times: [0, 0.4, 0.85, 1], repeat: Infinity }}
      />
      <motion.path
        d="M105 205 L105 165 L135 165 L135 205" strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 5, times: [0, 0.55, 0.85, 1], repeat: Infinity }}
      />
      {[
        [72, 152], [152, 152],
      ].map(([x, y], i) => (
        <motion.g key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 5, times: [0, 0.7, 0.85, 1], repeat: Infinity, delay: i * 0.15 }}
        >
          <rect x={x} y={y} width="22" height="22" strokeWidth="2" />
          <line x1={x + 11} y1={y} x2={x + 11} y2={y + 22} strokeWidth="1" />
          <line x1={x} y1={y + 11} x2={x + 22} y2={y + 11} strokeWidth="1" />
        </motion.g>
      ))}
    </g>
  );
}

function LegalScene({ color }: { color: string }) {
  return (
    <g>
      <rect x="55" y="70" width="130" height="160" rx="4" fill="white" fillOpacity="0.05" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1="70" y1={92 + i * 14} x2="170" y2={92 + i * 14} stroke={color} strokeWidth="1" strokeOpacity="0.25" />
      ))}
      <motion.g
        animate={{ y: [-110, 0, 0, -110], rotate: [-12, 0, 0, -12] }}
        transition={{ duration: 3.5, times: [0, 0.3, 0.85, 1], repeat: Infinity, ease: [0.5, 0, 0.5, 1] }}
        style={{ transformOrigin: "120px 160px" }}
      >
        <circle cx="120" cy="160" r="34" fill="none" stroke={color} strokeWidth="3.5" />
        <circle cx="120" cy="160" r="27" fill="none" stroke={color} strokeWidth="1.5" />
        <text x="120" y="158" textAnchor="middle" fontSize="11" fontWeight="900" fill={color} style={{ letterSpacing: 1 }}>APROVADO</text>
        <text x="120" y="170" textAnchor="middle" fontSize="6" fontWeight="700" fill={color}>VÉRTICE • 2026</text>
      </motion.g>
      <motion.circle
        cx="120" cy="160" fill="none" stroke={color} strokeWidth="2"
        animate={{ r: [34, 80], opacity: [0.7, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
      />
    </g>
  );
}

function ExecutivoScene({ color }: { color: string }) {
  return (
    <g>
      <rect x="55" y="80" width="130" height="100" fill={color} fillOpacity="0.05" stroke={color} strokeWidth="2" />
      <motion.line x1="55" y1="125" x2="185" y2="125" stroke={color} strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 5, times: [0, 0.3, 0.85, 1], repeat: Infinity }}
      />
      <motion.line x1="120" y1="80" x2="120" y2="180" stroke={color} strokeWidth="1.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: [0, 1, 1, 0] }}
        transition={{ duration: 5, times: [0, 0.4, 0.85, 1], repeat: Infinity }}
      />
      <motion.g animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 5, times: [0, 0.55, 0.85, 1], repeat: Infinity }}>
        <line x1="55" y1="65" x2="185" y2="65" stroke={color} strokeWidth="1" />
        <line x1="55" y1="60" x2="55" y2="70" stroke={color} strokeWidth="1.5" />
        <line x1="185" y1="60" x2="185" y2="70" stroke={color} strokeWidth="1.5" />
        <text x="120" y="58" textAnchor="middle" fontSize="9" fontWeight="800" fill={color}>12.00 m</text>
      </motion.g>
      <motion.g animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 5, times: [0, 0.65, 0.85, 1], repeat: Infinity }}>
        <line x1="200" y1="80" x2="200" y2="180" stroke={color} strokeWidth="1" />
        <line x1="195" y1="80" x2="205" y2="80" stroke={color} strokeWidth="1.5" />
        <line x1="195" y1="180" x2="205" y2="180" stroke={color} strokeWidth="1.5" />
        <text x="208" y="135" fontSize="9" fontWeight="800" fill={color}>8.5 m</text>
      </motion.g>
      <motion.circle r="7" fill="none" stroke={color} strokeWidth="2"
        animate={{ cx: [70, 170, 170, 70, 70], cy: [95, 95, 165, 165, 95] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <motion.circle r="2" fill={color}
        animate={{ cx: [70, 170, 170, 70, 70], cy: [95, 95, 165, 165, 95] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
    </g>
  );
}

function BimScene({ color }: { color: string }) {
  const cube = (cx: number, cy: number, s: number, key: string, delay: number) => {
    const dx = s * 0.866, dy = s * 0.5;
    return (
      <motion.g key={key}
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: [-120, 0, 0, 0, -120], opacity: [0, 1, 1, 1, 0] }}
        transition={{ duration: 5, times: [0, 0.2, 0.5, 0.85, 1], repeat: Infinity, delay, ease: [0.4, 0, 0.5, 1] }}
      >
        <path d={`M${cx} ${cy - dy} L${cx + dx} ${cy} L${cx} ${cy + dy} L${cx - dx} ${cy} Z`} fill={color} fillOpacity="0.85" stroke={color} strokeWidth="1.5" />
        <path d={`M${cx - dx} ${cy} L${cx - dx} ${cy + s} L${cx} ${cy + dy + s} L${cx} ${cy + dy} Z`} fill={color} fillOpacity="0.4" stroke={color} strokeWidth="1.5" />
        <path d={`M${cx + dx} ${cy} L${cx + dx} ${cy + s} L${cx} ${cy + dy + s} L${cx} ${cy + dy} Z`} fill={color} fillOpacity="0.6" stroke={color} strokeWidth="1.5" />
      </motion.g>
    );
  };
  const positions: Array<[number, number, number]> = [
    [120, 200, 0], [82, 180, 0.2], [158, 180, 0.4],
    [101, 160, 0.7], [139, 160, 0.9],
    [120, 140, 1.2],
  ];
  return (
    <g>
      <motion.line x1="40" y1="225" x2="200" y2="225" stroke={color} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3"
        animate={{ x1: [40, 60, 40], x2: [200, 220, 200] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {positions.map((p, i) => cube(p[0], p[1], 22, `c${i}`, p[2]))}
    </g>
  );
}

function EstruturaScene({ color }: { color: string }) {
  return (
    <g>
      <line x1="35" y1="215" x2="205" y2="215" stroke={color} strokeWidth="2" />
      {[40, 60, 80, 100, 120, 140, 160, 180].map((x, i) => (
        <line key={i} x1={x} y1="215" x2={x - 6} y2="223" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      ))}
      <motion.rect x="50" y="208" width="140" height="9" fill={color} fillOpacity="0.45"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 1, 1, 1, 1, 0] }}
        transition={{ duration: 6, times: [0, 0.12, 0.35, 0.7, 0.92, 1], repeat: Infinity }}
        style={{ transformOrigin: "50px 212px" }}
      />
      {[58, 113, 168].map((x, i) => (
        <motion.rect key={i} x={x} y="125" width="14" height="85" fill={color} fillOpacity="0.65"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: [0, 0, 1, 1, 1, 0] }}
          transition={{ duration: 6, times: [0, 0.18, 0.38, 0.7, 0.92, 1], repeat: Infinity, delay: i * 0.1 }}
          style={{ transformOrigin: `${x + 7}px 210px` }}
        />
      ))}
      <motion.rect x="50" y="118" width="140" height="11" fill={color} fillOpacity="0.75"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: [0, 0, 0, 1, 1, 0] }}
        transition={{ duration: 6, times: [0, 0.45, 0.5, 0.6, 0.92, 1], repeat: Infinity }}
        style={{ transformOrigin: "120px 123px" }}
      />
      <motion.path d="M45 118 L120 65 L195 118 Z" fill={color} fillOpacity="0.85" stroke={color} strokeWidth="2"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: [-80, -80, -80, -80, 0, 0, -80], opacity: [0, 0, 0, 0, 1, 1, 0] }}
        transition={{ duration: 6, times: [0, 0.15, 0.45, 0.65, 0.78, 0.92, 1], repeat: Infinity }}
      />
      <motion.g
        animate={{ x: [-20, 60, 60, -20, -20], y: [0, 0, 50, 50, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <line x1="120" y1="20" x2="120" y2="60" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="2 3" />
        <rect x="110" y="60" width="20" height="6" fill={color} fillOpacity="0.6" />
        <line x1="115" y1="66" x2="115" y2="74" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
        <line x1="125" y1="66" x2="125" y2="74" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      </motion.g>
      <motion.circle r="2" fill={color}
        animate={{ cx: [70, 170, 170, 70], cy: [115, 115, 70, 115], opacity: [0, 1, 0, 0] }}
        transition={{ duration: 6, times: [0, 0.5, 0.75, 1], repeat: Infinity, repeatDelay: 0 }}
      />
    </g>
  );
}

function DefaultScene({ color }: { color: string }) {
  return (
    <g>
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "120px 130px" }}
      >
        <circle cx="120" cy="130" r="42" fill="none" stroke={color} strokeWidth="3" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <rect key={deg} x="116" y="78" width="8" height="14" fill={color} transform={`rotate(${deg} 120 130)`} />
        ))}
        <circle cx="120" cy="130" r="14" fill={color} fillOpacity="0.3" />
      </motion.g>
      <motion.g
        animate={{ rotate: -360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "180px 85px" }}
      >
        <circle cx="180" cy="85" r="20" fill="none" stroke={color} strokeWidth="2" />
        {[0, 60, 120, 180, 240, 300].map(deg => (
          <rect key={deg} x="177" y="60" width="6" height="10" fill={color} transform={`rotate(${deg} 180 85)`} />
        ))}
      </motion.g>
    </g>
  );
}

function PhaseScene({ kind, color }: { kind: PhaseKind; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full h-full flex items-center justify-center"
    >
      <svg viewBox="0 0 240 240" className="w-full h-full max-w-[280px] max-h-[280px]" style={{ filter: `drop-shadow(0 8px 24px ${color}25)` }}>
        <ellipse cx="120" cy="225" rx="80" ry="5" fill={color} opacity="0.12" />
        {kind === "briefing" && <BriefingScene color={color} />}
        {kind === "anteprojeto" && <AnteprojetoScene color={color} />}
        {kind === "legal" && <LegalScene color={color} />}
        {kind === "executivo" && <ExecutivoScene color={color} />}
        {kind === "bim" && <BimScene color={color} />}
        {kind === "estrutura" && <EstruturaScene color={color} />}
        {kind === "default" && <DefaultScene color={color} />}
      </svg>
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{ background: color, left: `${15 + i * 18}%`, top: `${25 + (i % 2) * 35}%` }}
          animate={{ y: [-10, 10, -10], opacity: [0.15, 0.5, 0.15] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}
    </motion.div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

function ProjectEvolution({
  milestones,
  progress,
}: {
  milestones: ReturnType<typeof useMilestones>["milestones"];
  progress: number;
}) {
  const [counter, setCounter] = useState(0);

  const initialId = useMemo(() => {
    const active = milestones.find(m => m.status === "active");
    if (active) return active.id;
    const pending = milestones.find(m => m.status === "pending");
    if (pending) return pending.id;
    return milestones[milestones.length - 1]?.id ?? null;
  }, [milestones]);

  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  useEffect(() => {
    if (initialId && (!selectedId || !milestones.some(m => m.id === selectedId))) {
      setSelectedId(initialId);
    }
  }, [initialId, selectedId, milestones]);

  useEffect(() => {
    let raf: number;
    const t0 = Date.now();
    const dur = 1400;
    const tick = () => {
      const x = Math.min((Date.now() - t0) / dur, 1);
      setCounter(progress * (1 - Math.pow(1 - x, 3)));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  function mPct(m: (typeof milestones)[0]): number {
    if (m.approved_at) return 100;
    if (m.total_items && m.total_items > 0)
      return Math.min(100, ((m.delivered_items ?? 0) / m.total_items) * 100);
    return m.status === "done" ? 100 : m.status === "active" ? 50 : 0;
  }

  const totalWeight = milestones.reduce((s, m) => s + (m.weight ?? 1), 0) || 1;
  const selected = milestones.find(m => m.id === selectedId);
  const selectedIdx = milestones.findIndex(m => m.id === selectedId);
  const selectedColor = selectedIdx >= 0 ? MILESTONE_COLORS[selectedIdx % MILESTONE_COLORS.length] : "#6366f1";
  const selectedPct = selected ? mPct(selected) : 0;
  const selectedKind: PhaseKind = selected ? phaseKind(selected.name) : "default";

  if (milestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-zinc-400">
        Fases ainda não cadastradas.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-2 w-full h-full relative overflow-visible lg:overflow-hidden">
      {/* Subtle blueprint background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 rounded-xl"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.06) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(99,102,241,0.06) 1px,transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      {/* LEFT: phase selector */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-1.5 relative z-10 overflow-y-auto pr-0.5 min-h-0">
        {milestones.map((m, i) => {
          const color = MILESTONE_COLORS[i % MILESTONE_COLORS.length];
          const p = Math.round(mPct(m));
          const isSel = m.id === selectedId;
          const isActive = m.status === "active";
          const isApproved = !!m.approved_at;
          const isDone = m.status === "done";

          return (
            <motion.button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`group text-left rounded-lg px-2.5 py-1.5 border transition-all relative overflow-hidden ${
                isSel
                  ? "bg-white dark:bg-white/5 border-transparent"
                  : "bg-transparent border-zinc-200/40 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
              }`}
              style={isSel ? { boxShadow: `inset 0 0 0 1px ${color}, 0 4px 18px -8px ${color}80` } : undefined}
            >
              {isSel && (
                <motion.div
                  className="absolute inset-0 opacity-[0.08] pointer-events-none"
                  style={{ background: `linear-gradient(90deg, ${color}, transparent 70%)` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.08 }}
                />
              )}
              <div className="relative flex items-center gap-2">
                <div className="relative shrink-0">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: color }}
                      animate={{ scale: [1, 2.4, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                </div>
                <span className={`text-[11px] font-bold truncate flex-1 ${
                  isSel ? "text-navy dark:text-white" : "text-zinc-600 dark:text-zinc-300"
                }`}>{m.name}</span>
                <span className="text-[10px] font-black shrink-0" style={{ color }}>{p}%</span>
              </div>
              <div className="relative mt-1 h-[2px] bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${p}%` }}
                  transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.05 }}
                />
                {isActive && (
                  <motion.div
                    className="absolute inset-y-0 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)`, width: "40%" }}
                    animate={{ left: ["-40%", "110%"] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "linear", repeatDelay: 0.6 }}
                  />
                )}
              </div>
              <div className="relative flex items-center gap-1.5 mt-0.5 h-3">
                {isApproved ? (
                  <span className="text-[8px] bg-violet-500/20 text-violet-500 dark:text-violet-300 px-1 rounded font-black tracking-wider">APROVADA</span>
                ) : isDone ? (
                  <span className="text-[8px] bg-amber-500/20 text-amber-500 dark:text-amber-400 px-1 rounded font-black tracking-wider">AGUARDA</span>
                ) : isActive ? (
                  <motion.span
                    className="text-[8px] font-black tracking-wider"
                    style={{ color }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >EM ANDAMENTO</motion.span>
                ) : (
                  <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold tracking-wider">PENDENTE</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* CENTER: animated scene */}
      <div className="col-span-12 lg:col-span-5 relative z-10 flex items-center justify-center min-h-0">
        <PhaseScene key={selectedId ?? "x"} kind={selectedKind} color={selectedColor} />
      </div>

      {/* RIGHT: stats for selected phase */}
      <div className="col-span-12 lg:col-span-3 relative z-10 flex flex-col justify-center min-h-0">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col gap-2"
          >
            <div>
              <p className="text-[8px] tracking-widest font-bold text-zinc-500 dark:text-zinc-400 mb-0.5">FASE SELECIONADA</p>
              <p className="text-xs font-black text-navy dark:text-white tracking-tight leading-tight">
                {selected.name.toUpperCase()}
              </p>
            </div>

            <div className="flex items-baseline gap-1 -mt-0.5">
              <motion.span
                key={`pct-${selected.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[42px] font-black tracking-tighter font-sans leading-none"
                style={{ color: selectedColor }}
              >
                {Math.round(selectedPct)}
              </motion.span>
              <span className="text-lg font-bold" style={{ color: selectedColor }}>%</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-zinc-100/60 dark:bg-white/5 rounded-lg px-2 py-1.5">
                <p className="text-[8px] tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">PESO</p>
                <p className="text-xs font-black text-navy dark:text-white">
                  {Math.round(((selected.weight ?? 1) / totalWeight) * 100)}%
                </p>
              </div>
              <div className="bg-zinc-100/60 dark:bg-white/5 rounded-lg px-2 py-1.5">
                <p className="text-[8px] tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">DATA</p>
                <p className="text-[10px] font-black text-navy dark:text-white truncate">{fmtDate(selected.date)}</p>
              </div>
            </div>

            {selected.total_items != null && selected.total_items > 0 && (
              <div className="bg-zinc-100/60 dark:bg-white/5 rounded-lg px-2 py-1.5">
                <p className="text-[8px] tracking-widest text-zinc-500 dark:text-zinc-400 font-bold mb-0.5">PRANCHAS</p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-base font-black text-navy dark:text-white">{selected.delivered_items ?? 0}</span>
                  <span className="text-[10px] text-zinc-500">/ {selected.total_items}</span>
                </div>
                <div className="h-1 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: selectedColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((selected.delivered_items ?? 0) / selected.total_items) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.15 }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200/60 dark:border-white/10">
              <p className="text-[8px] tracking-widest text-zinc-500 dark:text-zinc-400 font-bold">PROGRESSO TOTAL</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-navy dark:text-white tracking-tighter">{counter.toFixed(1)}</span>
                <span className="text-[10px] text-zinc-500">% projeto</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

const suggestedQuestions = [
  "Qual o status do projeto elétrico?",
  "Como funciona a compatibilização BIM?",
  "Quando posso baixar as pranchas?",
];

// Ícones para fases (mapeamento por nome)
const MILESTONE_ICONS: Record<string, React.ElementType> = {
  briefing: Briefcase, anteprojeto: Compass, executivo: Ruler,
  bim: Blocks, "compat": Blocks, aprovação: ClipboardCheck, entrega: Award,
};
function milestoneIcon(name: string): React.ElementType {
  const key = Object.keys(MILESTONE_ICONS).find(k => name.toLowerCase().includes(k));
  return key ? MILESTONE_ICONS[key] : Ruler;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

function daysUntil(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Vencido";
  return `${diff}d`;
}

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState("");

  const { project, loading: loadingProject } = useClientProject();
  const { milestones, loading: loadingMilestones, approveMilestone } = useMilestones(project?.id);
  const { updates, loading: loadingUpdates } = useUpdates(project?.id);

  // Rastreia updates lidos via localStorage para persistir entre reloads
  const READ_KEY = project?.id ? `vertice_read_${project.id}` : null;
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  // project.id chega de forma assíncrona; recarrega os "lidos" do localStorage
  // quando ele fica disponível. Sem isto, o init rodava com project ainda nulo
  // e a bolinha de "nova" reaparecia a cada reload/troca de aba.
  useEffect(() => {
    if (!READ_KEY) return;
    try { setReadIds(new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"))); }
    catch { setReadIds(new Set()); }
  }, [READ_KEY]);
  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev).add(id);
      if (READ_KEY) { try { localStorage.setItem(READ_KEY, JSON.stringify([...next])); } catch { /* storage cheio/indisponível: ignora */ } }
      return next;
    });
  }, [READ_KEY]);
  const unreadCount = updates.filter(u => !readIds.has(u.id)).length;

  const calculatedProgress = calcProgress(milestones);
  const doneCount   = milestones.filter(m => m.status === "done").length;
  const approvedCount = milestones.filter(m => !!m.approved_at).length;
  const pendingApproval = milestones.filter(m => m.status === "done" && !m.approved_at);
  const activeIndex = milestones.findIndex(m => m.status === "active");
  const nextDelivery = milestones.find(m => m.status === "active" || m.status === "pending");

  // SYSTEM_PROMPT montado com dados reais do projeto
  const SYSTEM_PROMPT = useMemo(() => {
    const phasesText = milestones.map((m, i) => {
      const tag = m.status === "done" ? "✓" : m.status === "active" ? "← FASE ATUAL" : "";
      return `${i + 1}. ${m.name} ${tag} ${m.date ? `(${fmtDate(m.date)})` : ""}`;
    }).join("\n");

    const updatesText = updates.slice(0, 3).map(u =>
      `- ${new Date(u.created_at).toLocaleDateString("pt-BR")}: ${u.title}${u.content ? ` — ${u.content}` : ""}`
    ).join("\n");

    return `Você é a Vertice AI, assistente virtual da Vértice Consultoria de Projetos.
A Vértice é especializada em projetos de arquitetura, engenharia estrutural, elétrica e hidrossanitária.

SOBRE O PROJETO ATUAL:
- Projeto: ${project?.name ?? "Não identificado"}
- Status: ${project?.status ?? "—"}
- Progresso geral: ${project?.progress ?? 0}%
- Tipo: ${project?.type ?? "—"}
- Entrega prevista: ${fmtDate(project?.end_date ?? null)}

FASES DO PROJETO:
${phasesText || "Fases ainda não cadastradas."}

ATUALIZAÇÕES RECENTES:
${updatesText || "Nenhuma atualização ainda."}

SOBRE A ÁREA DO CLIENTE:
A área do cliente possui 3 seções:
1. Dashboard: métricas do projeto, gráfico de evolução, marcos e atualizações.
2. Modelo BIM: visualização 3D do modelo federado.
3. Registro de Entregas: histórico com status e arquivos.

INSTRUÇÕES:
- Responda SEMPRE em português brasileiro, de forma objetiva e profissional.
- Respostas curtas (máximo 3-4 frases).
- Use os dados acima quando a pergunta for sobre o projeto.
- Explique conceitos técnicos de forma clara.
- Se fora do escopo, diga: "Posso ajudar com dúvidas sobre o projeto ou engenharia."`;
  }, [project, milestones, updates]);

  const { messages, isLoading, sendMessage, clearMessages } = useGroqChat(
    SYSTEM_PROMPT,
    "Olá! Sou a Vertice AI. Posso esclarecer dúvidas sobre seu projeto, o portal ou engenharia em geral.",
    project?.id
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSend() {
    if (!chatInput.trim() || isLoading) return;
    sendMessage(chatInput);
    setChatInput("");
  }

  function handleSuggestion(q: string) {
    if (isLoading) return;
    sendMessage(q);
  }

  useGSAP(() => {
    gsap.from(".gsap-card", { y: 20, opacity: 0, duration: 0.6, stagger: 0.06, ease: "power3.out" });
  }, { scope: containerRef });

  const loading = loadingProject || loadingMilestones || loadingUpdates;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-zinc-400">
        <Loader2 size={22} className="animate-spin" />
        <span className="text-sm font-mono">Carregando dados do projeto...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
        <Inbox size={48} className="opacity-30" />
        <p className="text-sm font-mono text-center">Nenhum projeto vinculado à sua conta.<br />Aguarde o contato da equipe Vértice.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3 font-mono text-zinc-300 h-[calc(100vh-4rem)] overflow-hidden">

      {/* Header */}
      <div className="gsap-card flex justify-between items-center border-b border-zinc-200 dark:border-white/10 pb-3 shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <div className="bg-accent/20 text-accent px-2.5 py-0.5 rounded font-bold text-[10px]">VRT-{project.id.slice(-4).toUpperCase()}</div>
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 font-mono">VISÃO GERAL • {project.type.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-black tracking-tighter text-navy dark:text-white font-sans leading-none">{project.name}</h1>
        </div>
        <p className="text-[10px] text-zinc-600 dark:text-zinc-300 hidden sm:block">
          {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).toUpperCase()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-3 shrink-0">
        <StatCard label="PROGRESSO DO PROJETO" value={`${calculatedProgress}%`} sub={`${approvedCount} DE ${milestones.length} APROVADAS`} icon={Activity} accent />
        <StatCard label="PRANCHAS ENTREGUES"   value={`${doneCount * 4}`}     sub={`DE ${milestones.length * 4} PREVISTAS`}         icon={FileCheck} />
        <StatCard label="STATUS ATUAL"          value={project.status === "Em Andamento" ? "ATIVO" : project.status.toUpperCase()} sub={project.type.toUpperCase()} icon={Layers} />
        <StatCard label="PRÓXIMA ENTREGA"       value={daysUntil(nextDelivery?.date ?? project.end_date ?? null)} sub={nextDelivery?.name?.toUpperCase() ?? "ENTREGA FINAL"} icon={ClockIcon} alert />
      </div>

      {/* Linha principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">

        {/* Col esq: Chart + Marcos */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">

          {/* Progress Panel */}
          <div className="gsap-card bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl p-4 flex flex-col shadow-lg flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div>
                <p className="text-[10px] font-bold tracking-widest text-zinc-600 dark:text-zinc-300">EVOLUÇÃO DO PROJETO</p>
                <p className="text-sm font-bold text-navy dark:text-white mt-0.5">Selecione uma fase para detalhes e visualização</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[9px] border border-accent/30 text-accent px-2 py-0.5 rounded font-bold">
                  {milestones.filter(m => !!m.approved_at).length}/{milestones.length} APROVADAS
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative overflow-hidden">
              <ProjectEvolution milestones={milestones} progress={calculatedProgress} />
            </div>
          </div>

          {/* Banner aprovações pendentes */}
          {pendingApproval.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="gsap-card bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-2xl px-4 py-3 flex flex-col gap-2 shrink-0"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest text-amber-700 dark:text-amber-400">
                  {pendingApproval.length} FASE{pendingApproval.length > 1 ? "S" : ""} AGUARDANDO SUA APROVAÇÃO
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300/90 font-sans">
                Consulte a aba{" "}
                <button
                  onClick={() => navigate("/portal/updates")}
                  className="underline font-bold hover:text-amber-900 dark:hover:text-amber-200"
                >
                  Atualizações
                </button>{" "}
                para analisar a entrega e depois volte aqui para aprovar. Para pedir ajustes (não aprovar),
                deixe um comentário na entrega.
              </p>
              <div className="flex flex-col gap-1.5">
                {pendingApproval.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">{m.name}</span>
                      {m.total_items && m.total_items > 0 && (
                        <span className="ml-2 text-[10px] text-amber-600 dark:text-amber-500">
                          {m.delivered_items}/{m.total_items} pranchas entregues
                        </span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const { error } = await approveMilestone(m.id);
                        if (error) toast.error("Não foi possível salvar a aprovação. Tente novamente.");
                        else toast.success(`Fase "${m.name}" aprovada com sucesso!`);
                      }}
                      className="shrink-0 text-[10px] font-bold px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-white transition-colors"
                    >
                      Aprovar entrega
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Marcos */}
          <div className="gsap-card bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl p-4 shadow-lg flex flex-col shrink-0 h-36">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span className="text-[10px] font-bold tracking-widest text-zinc-600 dark:text-zinc-300">FASES DO PROJETO</span>
              </div>
              <div className="text-[9px] border border-accent/30 text-accent px-2 py-0.5 rounded font-bold">
                {approvedCount} / {milestones.length} APROVADAS
              </div>
            </div>

            {milestones.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">Fases ainda não cadastradas.</div>
            ) : (
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-4 right-4 top-1/2 h-[2px] bg-zinc-200 dark:bg-white/10 -translate-y-1/2" />
                {activeIndex > 0 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 1.4, delay: 0.4, ease: "easeOut" }}
                    style={{ transformOrigin: "left", width: `${(approvedCount / Math.max(milestones.length - 1, 1)) * 100 - 4}%` }}
                    className="absolute left-4 top-1/2 h-[2px] bg-gradient-to-r from-primary via-primary to-accent -translate-y-1/2"
                  />
                )}
                <div className="relative flex justify-between w-full">
                  {milestones.map((m, index) => {
                    const Icon = milestoneIcon(m.name);
                    const isApproved = !!m.approved_at;
                    const isDone   = m.status === "done";
                    const isActive = m.status === "active";
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index + 0.3, duration: 0.4 }}
                        className="flex flex-col items-center group cursor-pointer"
                      >
                        <div className="relative">
                          {isActive && <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />}
                          {isDone && !isApproved && <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />}
                          <div className={`relative w-8 h-8 lg:w-9 lg:h-9 rounded-full flex items-center justify-center border-2 transition-all group-hover:scale-110 ${
                            isApproved ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/30" :
                            isDone     ? "bg-amber-400 border-amber-400 text-white" :
                            isActive   ? "bg-accent border-accent text-white shadow-lg shadow-accent/50" :
                                         "bg-white dark:bg-navy-light border-zinc-300 dark:border-white/20 text-zinc-400"
                          }`}>
                            {isApproved ? <Check className="w-4 h-4" strokeWidth={3} /> :
                             isDone     ? <Check className="w-4 h-4" strokeWidth={3} /> :
                                          <Icon className="w-4 h-4" />}
                          </div>
                        </div>
                        <p className={`mt-1.5 text-[10px] font-bold tracking-tight text-center ${
                          isApproved ? "text-violet-500" :
                          isActive   ? "text-accent" :
                          isDone     ? "text-amber-500" :
                                       "text-zinc-500 dark:text-zinc-400"
                        }`}>
                          {m.name}
                        </p>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-500 text-center">{fmtDate(m.date)}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Col dir: AI Chat + Atualizações */}
        <div className="flex flex-col gap-3 min-h-0">

          {/* AI Chat */}
          <div className="gsap-card relative bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl shadow-lg flex flex-col flex-[1.6] min-h-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative flex justify-between items-center px-3 py-2.5 border-b border-zinc-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-white dark:border-navy-light" />
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-black text-navy dark:text-white tracking-tight flex items-center gap-1">
                    VERTICE AI <Sparkles className="w-3 h-3 text-accent" />
                  </p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400">Online • Resposta instantânea</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearMessages} title="Limpar conversa"
                  className="text-zinc-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="text-[9px] border border-accent/40 text-accent px-1.5 py-0.5 rounded font-bold">BETA</div>
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-3 py-3 space-y-2.5 min-h-0">
              {messages.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === 0 ? 0.2 : 0, duration: 0.3 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-zinc-100 dark:bg-white/5 text-navy dark:text-zinc-200 rounded-bl-sm border border-zinc-200 dark:border-white/10"
                  }`}>{m.content}</div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                    {[0, 1, 2].map(dot => (
                      <span key={dot} className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" style={{ animationDelay: `${dot * 0.15}s` }} />
                    ))}
                  </div>
                </motion.div>
              )}
              {messages.length <= 1 && !isLoading && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {suggestedQuestions.map((q, i) => (
                    <motion.button key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      onClick={() => handleSuggestion(q)}
                      className="text-[9px] px-2 py-1 rounded-full bg-accent/10 hover:bg-accent hover:text-white text-accent border border-accent/20 transition-colors font-medium"
                    >{q}</motion.button>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="relative px-3 py-2.5 border-t border-zinc-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2 bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-white/10 rounded-full pl-3 pr-1 py-1 focus-within:border-primary/50 transition-colors">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder="Pergunte algo..." disabled={isLoading}
                  className="flex-1 bg-transparent text-[11px] text-navy dark:text-white placeholder:text-zinc-400 outline-none disabled:opacity-50"
                />
                <button onClick={handleSend} disabled={!chatInput.trim() || isLoading}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Atualizações */}
          <div className="gsap-card bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl shadow-lg flex flex-col overflow-hidden flex-[1.1] min-h-0">
            <div className="px-3 py-2 border-b border-zinc-200 dark:border-white/10 flex justify-between items-center bg-zinc-50 dark:bg-black/20 shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{updates.length}</div>
                <span className="text-[10px] font-bold text-navy dark:text-white tracking-widest">ATUALIZAÇÕES</span>
                {unreadCount > 0 && (
                  <span className="text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded-full">{unreadCount} nova{unreadCount > 1 ? "s" : ""}</span>
                )}
              </div>
              <button onClick={() => navigate("/portal/updates")} className="text-[9px] text-zinc-500 hover:text-navy dark:hover:text-white">VER TUDO</button>
            </div>
            <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
              {updates.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-zinc-400 py-4">Sem atualizações ainda.</div>
              ) : updates.slice(0, 5).map(u => {
                const isUnread = !readIds.has(u.id);
                return (
                <div key={u.id} onClick={() => markRead(u.id)} className={`border p-2 rounded-lg transition-colors cursor-pointer ${isUnread ? "bg-accent/5 dark:bg-accent/10 border-accent/20 dark:border-accent/20" : "bg-zinc-50 dark:bg-black/30 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5"}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${u.color}`} />
                    <span className={`text-[10px] font-bold truncate ${isUnread ? "text-navy dark:text-white" : "text-zinc-600 dark:text-zinc-300"}`}>{u.title}</span>
                    {isUnread && <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-accent" />}
                  </div>
                  {u.content && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug line-clamp-2">{u.content}</p>}
                  <p className="text-[9px] text-zinc-400 dark:text-zinc-600 mt-1">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")} • {u.author_name}
                  </p>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componentes
function StatCard({ label, value, sub, icon: Icon, accent, alert }: {
  label: string; value: string; sub: string; icon: React.ElementType; accent?: boolean; alert?: boolean;
}) {
  return (
    <div className="gsap-card bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/15 rounded-2xl p-3 shadow-lg hover:border-zinc-300 dark:hover:border-white/30 transition-colors">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] font-bold tracking-widest text-zinc-600 dark:text-zinc-300">{label}</span>
        <Icon className={`w-3.5 h-3.5 ${alert ? "text-accent" : "text-zinc-500 dark:text-zinc-400"}`} />
      </div>
      <div className="flex items-end justify-between">
        <span className={`text-xl lg:text-3xl font-black tracking-tighter font-sans ${accent || alert ? "text-accent" : "text-navy dark:text-white"}`}>
          {value}
        </span>
        <span className="text-[9px] text-zinc-600 dark:text-zinc-400 text-right leading-tight pb-1">{sub}</span>
      </div>
    </div>
  );
}
