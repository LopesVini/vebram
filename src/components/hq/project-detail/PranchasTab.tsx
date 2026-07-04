// src/components/hq/project-detail/PranchasTab.tsx
import { useRef, useState } from "react";
import { FileText, Upload, Trash2, Loader2, Layers, Download } from "lucide-react";
import { toast } from "sonner";
import { usePranchas } from "@/hooks/data/usePranchas";
import {
  DISCIPLINES, fmtBytes, groupByDiscipline, validatePranchaFile,
  type DisciplineSlug, type Prancha,
} from "@/lib/pranchas";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

export default function PranchasTab({ projectId }: { projectId: string }) {
  const { pranchas, loading, uploading, upload, remove, getDownloadUrl } = usePranchas(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [discipline, setDiscipline] = useState<DisciplineSlug>("arquitetonico");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const groups = groupByDiscipline(pranchas);
  const fileError = file ? validatePranchaFile(file) : null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
    e.target.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    const { error } = await upload(file, discipline, name);
    if (error) { toast.error(error); return; }
    toast.success("Prancha publicada. O cliente já pode baixá-la no portal.");
    setFile(null);
    setName("");
  }

  async function handleRemove(p: Prancha) {
    setRemoving(p.id);
    const { error } = await remove(p);
    setRemoving(null);
    setConfirmDelete(null);
    if (error) toast.error(`Erro ao remover: ${error}`);
    else toast.success("Prancha removida.");
  }

  async function handleDownload(p: Prancha) {
    // Abre a aba de forma síncrona no clique para não ser bloqueada como popup.
    const tab = window.open("", "_blank");
    const url = await getDownloadUrl(p);
    if (!url) {
      tab?.close();
      toast.error("Não foi possível gerar o link de download.");
      return;
    }
    if (tab) tab.location.href = url;
    else window.location.href = url;
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <input ref={fileInputRef} type="file" accept=".pdf,.dwg" onChange={handleFileSelect} className="hidden" />

      {/* Formulário de upload */}
      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-navy dark:text-white">Publicar nova prancha</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold text-zinc-500 block mb-1">Disciplina</span>
            <select
              value={discipline}
              onChange={e => setDiscipline(e.target.value as DisciplineSlug)}
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
            >
              {DISCIPLINES.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-zinc-500 block mb-1">Nome de exibição</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: PR-01 Planta Baixa Térreo"
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        {!file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group"
          >
            <Upload size={18} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs font-bold text-navy dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Selecionar arquivo</span>
            <span className="text-[10px] text-zinc-400">PDF ou DWG · Máx. 50 MB</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy dark:text-white truncate">{file.name}</p>
              <p className="text-[11px] text-zinc-500">
                {fmtBytes(file.size)}
                {fileError && <span className="text-red-500 ml-1 font-bold">— {fileError}</span>}
              </p>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !!fileError}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Enviando..." : "Publicar"}
            </button>
            <button
              onClick={() => setFile(null)}
              disabled={uploading}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Lista agrupada */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
          <Loader2 size={16} className="animate-spin" /> Carregando pranchas...
        </div>
      )}

      {!loading && pranchas.length === 0 && (
        <div className="text-center py-10 text-zinc-400">
          <Layers size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhuma prancha publicada ainda.</p>
        </div>
      )}

      {!loading && groups.map(g => (
        <div key={g.slug}>
          <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-2">
            {g.label} · {g.items.length}
          </p>
          <div className="space-y-2">
            {g.items.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 group">
                <FileText size={17} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy dark:text-white truncate">{p.name}</p>
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
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors shrink-0"
                  title="Baixar"
                >
                  <Download size={14} />
                </button>
                {confirmDelete === p.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleRemove(p)}
                      disabled={removing === p.id}
                      className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {removing === p.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Remover
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[11px] font-bold px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
