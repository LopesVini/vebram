// src/pages/hq/HqProjectDetail.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Flag, Bell, Box, Loader2, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/hooks/data/useProjects";
import OverviewTab from "@/components/hq/project-detail/OverviewTab";
import MilestonesTab from "@/components/hq/project-detail/MilestonesTab";
import UpdatesTab from "@/components/hq/project-detail/UpdatesTab";
import PranchasTab from "@/components/hq/project-detail/PranchasTab";
import BimTab from "@/components/hq/project-detail/BimTab";

const TABS = [
  { id: "overview",   label: "Visão Geral",  icon: Info },
  { id: "milestones", label: "Marcos",       icon: Flag },
  { id: "updates",    label: "Atualizações", icon: Bell },
  { id: "pranchas",   label: "Pranchas",     icon: Layers },
  { id: "bim",        label: "Modelo BIM",   icon: Box  },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_COLORS: Record<string, string> = {
  "Em Andamento": "text-blue-600  dark:text-blue-400  bg-blue-50  dark:bg-blue-500/10",
  "Revisão":      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
  "Concluído":    "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10",
  "Pausado":      "text-zinc-500  dark:text-zinc-400  bg-zinc-100 dark:bg-white/5",
};

export default function HqProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase
      .from("projects")
      .select("*, client:profiles!projects_client_id_fkey(display_name,email)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setProject(data as Project | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-zinc-400">
        <Loader2 size={20} className="animate-spin" /> Carregando projeto...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-24 text-zinc-400 space-y-3">
        <p className="text-sm font-bold text-navy dark:text-zinc-300">Projeto não encontrado.</p>
        <Link to="/hq/projects" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
          <ArrowLeft size={15} /> Voltar aos projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/hq/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft size={13} /> Projetos
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${project.color} flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0`}>
            {project.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-navy dark:text-white leading-tight">{project.name}</h1>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[project.status] ?? ""}`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {project.client?.display_name ?? "Sem cliente vinculado"} · {project.type} · {project.progress}% concluído
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-white/10 overflow-x-auto scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-navy dark:hover:text-white"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div className="pb-8">
        {tab === "overview" && (
          <OverviewTab project={project} onSaved={changes => setProject(p => (p ? { ...p, ...changes } : p))} />
        )}
        {tab === "milestones" && <MilestonesTab projectId={project.id} />}
        {tab === "updates" && <UpdatesTab projectId={project.id} authorName="Admin" />}
        {tab === "pranchas" && <PranchasTab projectId={project.id} />}
        {tab === "bim" && <BimTab project={project} />}
      </div>
    </div>
  );
}
