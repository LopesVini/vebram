import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, Bell, Box, Lock } from "lucide-react";
import type { Project } from "@/hooks/data/useProjects";
import MilestonesTab from "@/components/hq/project-detail/MilestonesTab";
import UpdatesTab from "@/components/hq/project-detail/UpdatesTab";
import BimTab from "@/components/hq/project-detail/BimTab";

const isSeed = (id: string) => id.startsWith("seed-");

interface Props {
  project: Project | null;
  onClose: () => void;
}

const TABS = [
  { id: "milestones", label: "Marcos",       icon: Flag },
  { id: "updates",    label: "Atualizações", icon: Bell },
  { id: "bim",        label: "Modelo BIM",   icon: Box  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function HqProjectDrawer({ project, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("milestones");
  const seed = project ? isSeed(project.id) : false;

  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white dark:bg-[#0f172a] border-l border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${project.color} flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0`}>
                  {project.name[0]}
                </div>
                <div className="min-w-0">
                  <h2 className="font-black text-navy dark:text-white text-base leading-tight truncate">{project.name}</h2>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {project.client?.display_name ?? "Sem cliente"} · {project.progress}% concluído
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-navy dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors shrink-0 ml-2">
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 dark:border-white/10 shrink-0 px-2">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
                      tab === t.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-zinc-500 hover:text-navy dark:hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {seed ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-zinc-400">
                  <Lock size={36} className="opacity-20" />
                  <p className="text-sm font-bold text-navy dark:text-zinc-300">Projeto de exemplo</p>
                  <p className="text-xs max-w-[240px]">
                    Crie um projeto real vinculado a um cliente para gerenciar marcos e atualizações.
                  </p>
                </div>
              ) : tab === "milestones" ? (
                <MilestonesTab projectId={project.id} />
              ) : tab === "updates" ? (
                <UpdatesTab projectId={project.id} authorName="Admin" />
              ) : (
                <BimTab project={project} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
