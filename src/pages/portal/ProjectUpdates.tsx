import { useState } from "react";
import { CheckCircle, Clock, MessageSquare, Loader2, Inbox } from "lucide-react";
import { useClientProject } from "@/hooks/data/useClientProject";
import { useUpdates, type Update } from "@/hooks/data/useUpdates";
import UpdateComments from "@/components/updates/UpdateComments";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).replace(",", " -");
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  approved: { label: "Aprovado",   cls: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20" },
  pending:  { label: "Informativo", cls: "bg-accent/10 text-accent border border-accent/20" },
  revision: { label: "Em Revisão", cls: "bg-primary/10 text-primary border border-primary/20" },
};

const DOT_MAP: Record<string, string> = {
  approved: "bg-green-500",
  pending:  "bg-accent",
  revision: "bg-primary",
};

// Cartão de uma entrega na timeline. A APROVAÇÃO não acontece aqui — ela vive
// num único lugar (o painel de fases no Dashboard). Aqui é histórico + conversa.
function TimelineCard({ upd }: { upd: Update }) {
  const [showComments, setShowComments] = useState(false);

  const statusKey = upd.color === "bg-green-500" ? "approved"
    : upd.color === "bg-accent" ? "pending" : "revision";
  const statusInfo = STATUS_MAP[statusKey] ?? STATUS_MAP.revision;
  const dotColor   = DOT_MAP[statusKey] ?? "bg-primary";

  return (
    <div className="relative pl-8">
      <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-zinc-50 dark:border-navy-dark ${dotColor}`} />

      <div className="bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/10 rounded-xl p-3 lg:rounded-2xl lg:p-6 shadow-lg hover:border-zinc-300 dark:hover:border-white/20 transition-colors">
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-black font-sans text-navy dark:text-white">{upd.title}</h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {fmtDate(upd.created_at)} • <span className="text-navy dark:text-zinc-300">Publicado por {upd.author_name}</span>
          </p>
        </div>

        {upd.content && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 font-sans">{upd.content}</p>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/5">
          <button
            onClick={() => setShowComments((v) => !v)}
            className="text-xs font-bold text-zinc-500 hover:text-primary transition-colors flex items-center gap-2"
          >
            <MessageSquare size={14} /> {showComments ? "OCULTAR COMENTÁRIOS" : "COMENTAR"}
          </button>
        </div>

        {showComments && <UpdateComments updateId={upd.id} />}
      </div>
    </div>
  );
}

export default function ProjectUpdates() {
  const { project, loading: loadingProject } = useClientProject();
  const { updates, loading: loadingUpdates } = useUpdates(project?.id);

  const approvedCount = updates.filter(u => u.color === "bg-green-500").length;
  const pendingCount  = updates.filter(u => u.color === "bg-accent").length;

  const loading = loadingProject || loadingUpdates;

  return (
    <div className="flex flex-col h-auto lg:h-[calc(100vh-6rem)] w-full font-mono text-zinc-300 relative gap-3 lg:gap-6 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex justify-between items-end border-b border-zinc-200 dark:border-white/5 pb-4 mb-2">
        <div className="flex items-center gap-4">
          <div className="bg-accent/20 text-accent px-3 py-1 rounded-[0.25rem] font-bold text-sm">[ LOG ]</div>
          <h1 className="text-xl lg:text-3xl font-black tracking-tighter text-navy dark:text-white uppercase font-sans">
            Registro de Entregas
          </h1>
        </div>
        {!loading && updates.length > 0 && (
          <div className="hidden sm:flex gap-2">
            <div className="flex items-center gap-2 text-xs font-bold px-3 border-r border-zinc-200 dark:border-white/10 text-navy dark:text-zinc-400">
              <CheckCircle size={14} className="text-green-500" /> APROVADOS ({approvedCount})
            </div>
            <div className="flex items-center gap-2 text-xs font-bold px-3 text-navy dark:text-zinc-400">
              <Clock size={14} className="text-accent" /> INFORMATIVOS ({pendingCount})
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2 text-zinc-400">
            <Loader2 size={20} className="animate-spin" /> Carregando atualizações...
          </div>
        )}

        {!loading && !project && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <Inbox size={40} className="opacity-30" />
            <p className="text-sm">Nenhum projeto vinculado à sua conta ainda.</p>
          </div>
        )}

        {!loading && project && updates.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <Inbox size={40} className="opacity-30" />
            <p className="text-sm">Nenhuma entrega publicada ainda.</p>
          </div>
        )}

        {!loading && updates.length > 0 && (
          <div className="relative border-l-2 border-zinc-200 dark:border-white/10 ml-4 space-y-12 pb-8 mt-4">
            {updates.map((upd) => (
              <TimelineCard key={upd.id} upd={upd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
