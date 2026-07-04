// src/pages/portal/Pranchas.tsx
// Pranchas do projeto do cliente, agrupadas por disciplina, com download.
import { useState } from "react";
import { ChevronDown, Download, FileText, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClientProject } from "@/hooks/data/useClientProject";
import { usePranchas } from "@/hooks/data/usePranchas";
import { fmtBytes, groupByDiscipline, type Prancha } from "@/lib/pranchas";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

export default function Pranchas() {
  const { project, loading: loadingProject } = useClientProject();
  const { pranchas, loading: loadingPranchas, getDownloadUrl } = usePranchas(project?.id);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<string | null>(null);

  const loading = loadingProject || loadingPranchas;
  const groups = groupByDiscipline(pranchas);

  async function handleDownload(p: Prancha) {
    setDownloading(p.id);
    const url = await getDownloadUrl(p);
    setDownloading(null);
    if (!url) { toast.error("Não foi possível gerar o link de download. Tente novamente."); return; }
    window.open(url, "_blank");
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <span className="font-mono text-[10px] lg:text-xs uppercase tracking-widest text-zinc-500">Documentos do projeto</span>
        <h1 className="text-xl lg:text-3xl font-black text-navy dark:text-white mt-1">Pranchas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Arquivos oficiais do seu projeto, organizados por disciplina. Baixe em PDF ou DWG.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-zinc-400">
          <Loader2 size={20} className="animate-spin" /> Carregando pranchas...
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-white/10 text-zinc-400">
          <Layers size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold text-navy dark:text-zinc-300 mb-1">Nenhuma prancha publicada ainda</p>
          <p className="text-xs max-w-xs mx-auto">
            Assim que a equipe VEBRAM publicar as pranchas do seu projeto, elas aparecerão aqui para download.
          </p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map(g => {
            const isOpen = open[g.slug] ?? true;
            return (
              <div key={g.slug} className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen(o => ({ ...o, [g.slug]: !isOpen }))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Layers size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy dark:text-white">{g.label}</p>
                    <p className="text-[11px] text-zinc-500">{g.items.length} {g.items.length === 1 ? "prancha" : "pranchas"}</p>
                  </div>
                  <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-100 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5">
                    {g.items.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <FileText size={17} className="text-zinc-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy dark:text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-zinc-500">{fmtDate(p.created_at)} · {fmtBytes(p.size_bytes)}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          p.file_type === "pdf"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}>
                          {p.file_type.toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleDownload(p)}
                          disabled={downloading === p.id}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 dark:border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                        >
                          {downloading === p.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          Baixar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
