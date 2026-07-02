import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, CheckSquare, Target, Search, Filter, ArrowUpRight, TrendingUp, Clock, Inbox } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashStats {
  clients: number;
  projects: number;
  pendingUpdates: number;
  conclusionRate: number;
}

interface LiveProject {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: string;
  end_date: string | null;
  color: string;
  team: string[];
  created_at: string;
}

interface RecentUpdate {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  color: string;
}

// ── Helpers para gráficos ─────────────────────────────────────────────────────

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TYPE_COLORS: Record<string, string> = {
  "Arquitetura": "#2563EB", "Estrutural": "#7C3AED",
  "Elétrico": "#F59E0B", "Hidrossanitário": "#10B981",
  "Multidisciplinar": "#F43F5E",
};

function buildBarData(projects: LiveProject[]) {
  const year = new Date().getFullYear();
  const counts = new Array(12).fill(0);
  for (const p of projects) {
    const d = new Date(p.created_at);
    if (d.getFullYear() === year) counts[d.getMonth()]++;
  }
  const upTo = new Date().getMonth() + 1;
  return MONTHS.slice(0, upTo).map((name, i) => ({ name, value: counts[i] }));
}

function buildPieData(projects: LiveProject[]) {
  const counts: Record<string, number> = {};
  for (const p of projects) counts[p.type] = (counts[p.type] ?? 0) + 1;
  return Object.entries(counts).map(([name, value]) => ({
    name, value, color: TYPE_COLORS[name] ?? "#6366f1",
  }));
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useDashData() {
  const [stats, setStats]           = useState<DashStats>({ clients: 0, projects: 0, pendingUpdates: 0, conclusionRate: 0 });
  const [liveProjs, setLiveProjs]   = useState<LiveProject[]>([]);
  const [allProjects, setAllProjects] = useState<LiveProject[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: clientCount },
        { data: projects },
        { count: pendingCount },
        { data: updates },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
        supabase.from("projects").select("id, name, type, progress, status, end_date, color, team, created_at").order("created_at", { ascending: false }),
        supabase.from("updates").select("id", { count: "exact", head: true }).eq("color", "bg-accent"),
        supabase.from("updates").select("id, title, content, created_at, color").order("created_at", { ascending: false }).limit(5),
      ]);

      const all = (projects ?? []) as LiveProject[];
      const total = all.length;
      const done  = all.filter(p => p.status === "Concluído").length;

      setStats({ clients: clientCount ?? 0, projects: total, pendingUpdates: pendingCount ?? 0, conclusionRate: total > 0 ? Math.round((done / total) * 100) : 0 });
      setAllProjects(all);
      setLiveProjs(all.slice(0, 3));
      setRecentUpdates((updates ?? []) as RecentUpdate[]);
      setLoading(false);
    }
    load();
  }, []);

  return { stats, liveProjs, allProjects, recentUpdates, loading };
}

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50   dark:bg-blue-500/10   text-blue-600",
  violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-600",
  amber:  "bg-amber-50  dark:bg-amber-500/10  text-amber-600",
  green:  "bg-green-50  dark:bg-green-500/10  text-green-600",
};

function fmtDue(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

// ── Animated Counter ──────────────────────────────────────────────────────────

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

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface TooltipItem { name?: string; value?: number | string; color?: string }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-navy border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-navy dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function HqDashboard() {
  const navigate = useNavigate();
  const { stats, liveProjs, allProjects, recentUpdates, loading } = useDashData();
  const barData = buildBarData(allProjects);
  const pieData = buildPieData(allProjects);

  const statCards = [
    { label: "Clientes Ativos",       value: stats.clients,        suffix: "",  icon: Users,       color: "blue",   trend: "total" },
    { label: "Projetos em Andamento", value: stats.projects,       suffix: "",  icon: Briefcase,   color: "violet", trend: "total" },
    { label: "Entregas Pendentes",    value: stats.pendingUpdates, suffix: "",  icon: CheckSquare, color: "amber",  trend: "aguardando" },
    { label: "Taxa de Conclusão",     value: stats.conclusionRate, suffix: "%", icon: Target,      color: "green",  trend: "projetos" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[stat.color]}`}>
                  <Icon size={20} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} /> {stat.trend}
                </div>
              </div>
              <p className="text-2xl font-black text-navy dark:text-white mb-1">
                {loading ? "—" : <AnimatedNumber target={stat.value} suffix={stat.suffix} />}
              </p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Col 1 – Projetos em Andamento */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-navy dark:text-white flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600" />
                </div>
                Projetos em Andamento
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Performance por projeto</p>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                <Search size={14} />
              </button>
              <button className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                <Filter size={14} />
              </button>
            </div>
          </div>

          <div className="space-y-7">
            {loading && (
              <p className="text-xs text-zinc-400 text-center py-8">Carregando projetos...</p>
            )}
            {!loading && liveProjs.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-8">Nenhum projeto criado ainda.</p>
            )}
            {liveProjs.map((proj, idx) => (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="group"
              >
                <div className="flex gap-3 items-center mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${proj.color || "bg-blue-500"}`}>
                    {proj.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-navy dark:text-white truncate group-hover:text-blue-600 transition-colors cursor-pointer">{proj.name}</h4>
                    <p className="text-xs text-zinc-500 truncate">{proj.type || "Projeto"}</p>
                  </div>
                  <div className="flex -space-x-2">
                    {(proj.team ?? []).slice(0, 4).map((initial, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 border-2 border-white dark:border-navy flex items-center justify-center text-[9px] font-bold text-navy dark:text-white">
                        {initial[0]?.toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5 px-0.5">
                  <span className="flex items-center gap-1"><Clock size={10} /> {fmtDue(proj.end_date)}</span>
                  <span className="font-bold text-navy dark:text-zinc-300">{proj.progress}%</span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-black/40 h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${proj.progress}%` }}
                    transition={{ delay: 0.6 + idx * 0.1, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <button onClick={() => navigate("/hq/projects")} className="mt-6 w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10">
            Ver todos os projetos <ArrowUpRight size={14} />
          </button>
        </motion.div>

        {/* Col 2 – Projetos criados por mês (real) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col"
        >
          <div className="mb-6">
            <h3 className="font-bold text-sm text-navy dark:text-white">Projetos por Mês</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Projetos cadastrados em {new Date().getFullYear()}</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            {barData.length === 0 || barData.every(d => d.value === 0) ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Inbox size={28} className="opacity-40" />
                <p className="text-xs">Nenhum projeto cadastrado ainda</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" name="Projetos" fill="#DBEAFE" radius={[6,6,0,0]} activeBar={{ fill: '#2563EB' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/5 grid grid-cols-3 gap-3">
            {(() => {
              const total = allProjects.length;
              const monthsWithData = barData.filter(d => d.value > 0).length || 1;
              const best = barData.reduce((a, b) => b.value > a.value ? b : a, { name: "—", value: 0 });
              return [
                { label: "Média mensal", value: total > 0 ? (total / monthsWithData).toFixed(1) : "0" },
                { label: "Mês com mais", value: total > 0 ? best.name : "—" },
                { label: `Total ${new Date().getFullYear()}`, value: String(total) },
              ];
            })().map((kpi, i) => (
              <div key={i} className="text-center">
                <p className="text-base font-black text-navy dark:text-white">{kpi.value}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Col 3 – Distribuição real + Atualizações recentes reais */}
        <div className="flex flex-col gap-5">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold text-sm text-navy dark:text-white mb-1">Distribuição por Disciplina</h3>
            <p className="text-xs text-zinc-500 mb-4">Portfólio atual de serviços</p>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-zinc-400">
                <Inbox size={24} className="opacity-40" />
                <p className="text-xs">Sem projetos ainda</p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-navy dark:text-white">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex-1"
          >
            <h3 className="font-bold text-sm text-navy dark:text-white mb-4">Atualizações Recentes</h3>
            {recentUpdates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-zinc-400">
                <Inbox size={24} className="opacity-40" />
                <p className="text-xs">Nenhuma atualização ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUpdates.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.07 }}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-default"
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${u.color || "bg-blue-500"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-navy dark:text-white truncate">{u.title}</p>
                      {u.content && <p className="text-[10px] text-zinc-500 truncate">{u.content}</p>}
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0">{fmtRelative(u.created_at)}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

    </div>
  );
}
