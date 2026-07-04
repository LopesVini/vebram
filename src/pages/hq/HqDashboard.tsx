// src/pages/hq/HqDashboard.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, CheckSquare, Inbox, Clock, CalendarClock, Flag } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  AreaChart, Area, LabelList,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  buildProgressData, buildFunnelData, buildLeadsData, buildDeadlines,
  type DashProject, type DashMilestone,
} from "@/lib/hqDashboard";

// Única cor de marca dos gráficos — validada p/ contraste em light e dark.
const MARK = "#3B82F6";

// ── Dados ─────────────────────────────────────────────────────────────────────

interface DashData {
  clients: number;
  projects: DashProject[];
  milestones: DashMilestone[];
  leads: { created_at: string }[];
  loading: boolean;
}

function useDashData(): DashData {
  const [data, setData] = useState<DashData>({ clients: 0, projects: [], milestones: [], leads: [], loading: true });

  useEffect(() => {
    async function load() {
      const [
        { count: clientCount },
        { data: projects },
        { data: milestones },
        { data: leads },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
        supabase.from("projects").select("id, name, progress, status, end_date, color, created_at"),
        supabase.from("milestones").select("id, name, status, date, approved_at, project_id"),
        supabase.from("Orçamentos").select("created_at"),
      ]);
      setData({
        clients: clientCount ?? 0,
        projects: (projects ?? []) as DashProject[],
        milestones: (milestones ?? []) as DashMilestone[],
        leads: (leads ?? []) as { created_at: string }[],
        loading: false,
      });
    }
    load();
  }, []);

  return data;
}

// ── Contador animado ──────────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipItem { name?: string; value?: number | string; color?: string }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-navy border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-navy dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-zinc-600 dark:text-zinc-300">{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ── Card container ────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, delay, children }: {
  title: string; subtitle: string; delay: number; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col"
    >
      <div className="mb-4">
        <h3 className="font-bold text-sm text-navy dark:text-white">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-2 text-zinc-400">
      <Inbox size={28} className="opacity-40" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50   dark:bg-blue-500/10   text-blue-600",
  violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-600",
  amber:  "bg-amber-50  dark:bg-amber-500/10  text-amber-600",
  green:  "bg-green-50  dark:bg-green-500/10  text-green-600",
};

function fmtDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export default function HqDashboard() {
  const navigate = useNavigate();
  const { clients, projects, milestones, leads, loading } = useDashData();

  const progressData = buildProgressData(projects);
  const funnelData   = buildFunnelData(milestones);
  const leadsData    = buildLeadsData(leads);
  const deadlines    = buildDeadlines(projects, milestones);

  const now = new Date();
  const leadsThisMonth = leads.filter(l => {
    const d = new Date(l.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const awaitingApproval = milestones.filter(m => m.status === "done" && !m.approved_at).length;
  const activeProjects = projects.filter(p => p.status === "Em Andamento").length;

  const statCards = [
    { label: "Clientes Ativos",             value: clients,          icon: Users,       color: "blue" },
    { label: "Projetos em Andamento",       value: activeProjects,   icon: Briefcase,   color: "violet" },
    { label: "Marcos Aguardando Aprovação", value: awaitingApproval, icon: CheckSquare, color: "amber" },
    { label: "Orçamentos no Mês",           value: leadsThisMonth,   icon: Inbox,       color: "green" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[stat.color]}`}>
                <Icon size={20} />
              </div>
              <p className="text-lg lg:text-2xl font-black text-navy dark:text-white mb-1">
                {loading ? "—" : <AnimatedNumber target={stat.value} />}
              </p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Progresso por projeto — barras horizontais */}
        <ChartCard title="Progresso por Projeto" subtitle="Projetos ativos, do mais atrasado ao mais adiantado" delay={0.3}>
          {progressData.length === 0 ? (
            <EmptyChart label="Nenhum projeto ativo" />
          ) : (
            <div style={{ height: Math.max(200, progressData.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="progress" name="Progresso" fill={MARK} radius={[0, 4, 4, 0]} barSize={14}>
                    <LabelList dataKey="progress" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#71717a", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Funil de marcos */}
        <ChartCard title="Funil de Marcos" subtitle="Onde o trabalho está no pipeline de entregas" delay={0.35}>
          {milestones.length === 0 ? (
            <EmptyChart label="Nenhum marco cadastrado" />
          ) : (
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 20, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" name="Marcos" fill={MARK} radius={[4, 4, 0, 0]} barSize={36}>
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#71717a", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Leads por mês */}
        <ChartCard title="Orçamentos Recebidos" subtitle="Leads que chegaram pelo site nos últimos 12 meses" delay={0.4}>
          {leads.length === 0 ? (
            <EmptyChart label="Nenhum orçamento recebido ainda" />
          ) : (
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={MARK} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={MARK} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} dy={8} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Orçamentos" stroke={MARK} strokeWidth={2} fill="url(#leadsFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Prazos próximos */}
        <ChartCard title="Prazos Próximos" subtitle="Marcos e projetos vencendo nos próximos 30 dias" delay={0.45}>
          {deadlines.length === 0 ? (
            <EmptyChart label="Nada vencendo nos próximos 30 dias" />
          ) : (
            <div className="space-y-2">
              {deadlines.slice(0, 8).map((d, i) => (
                <motion.div
                  key={`${d.kind}-${d.name}-${d.date}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    d.kind === "marco" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "bg-violet-50 dark:bg-violet-500/10 text-violet-600"
                  }`}>
                    {d.kind === "marco" ? <Flag size={14} /> : <Briefcase size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-navy dark:text-white truncate">{d.name}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{d.kind} · {fmtDeadline(d.date)}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                    d.daysLeft <= 7
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-500"
                  }`}>
                    {d.daysLeft <= 7 ? <Clock size={10} /> : <CalendarClock size={10} />}
                    {d.daysLeft === 0 ? "hoje" : `${d.daysLeft}d`}
                  </span>
                </motion.div>
              ))}
              <button
                onClick={() => navigate("/hq/projects")}
                className="mt-2 w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                Ver todos os projetos
              </button>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
