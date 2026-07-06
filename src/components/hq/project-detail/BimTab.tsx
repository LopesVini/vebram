// src/components/hq/project-detail/BimTab.tsx
import { useState, useRef } from "react";
import { Box, Upload, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/hooks/data/useProjects";
import { useProjectIfc, storagePath } from "@/hooks/data/useProjectIfc";
import { BimWorkspace } from "@/pages/portal/BimViewer";

export default function BimTab({ project }: { project: Project }) {
  const { uploadIfc, deleteIfc, uploading, deleting } = useProjectIfc();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(project.ifc_url ?? null);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [selectedFile, setSelectedFile]     = useState<File | null>(null);

  const destPath = storagePath(project.id, project.name);
  const clientName = project.client?.display_name ?? "Sem cliente vinculado";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!selectedFile) return;
    const { error, url } = await uploadIfc(project.id, project.name, selectedFile);
    if (error) { toast.error(error); return; }
    setCurrentUrl(url);
    setSelectedFile(null);
    toast.success("Modelo IFC enviado com sucesso!");
  }

  async function handleDelete() {
    if (!currentUrl) return;
    const { error } = await deleteIfc(project.id, currentUrl);
    if (error) { toast.error(error); return; }
    setCurrentUrl(null);
    setConfirmDelete(false);
    toast.success("Modelo IFC removido.");
  }

  return (
    <div className="flex flex-col gap-4">
      <input ref={fileInputRef} type="file" accept=".ifc" onChange={handleFileSelect} className="hidden" />

      {/* Destino: projeto + cliente */}
      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-4 space-y-2">
        <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Destino do modelo</p>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${project.color} flex items-center justify-center text-white font-black text-xs shrink-0`}>
            {project.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy dark:text-white leading-tight truncate">{project.name}</p>
            <p className="text-[11px] text-zinc-500 truncate">Cliente: {clientName}</p>
          </div>
        </div>
        {/* Caminho no bucket */}
        <div className="bg-zinc-100 dark:bg-black/20 rounded-lg px-3 py-2 mt-1">
          <p className="text-[10px] text-zinc-400 mb-0.5 font-bold">Caminho no Supabase Storage</p>
          <p className="text-[11px] font-mono text-blue-500 break-all leading-relaxed">
            ifc-models/<span className="text-zinc-400">{project.id.slice(0, 8)}…/</span><span className="text-navy dark:text-white font-bold">{destPath.split("/")[1]}</span>
          </p>
        </div>
      </div>

      {/* Estado: modelo ativo */}
      {currentUrl && !selectedFile && (
        <div className="bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center shrink-0">
              <Box size={15} className="text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-green-700 dark:text-green-400">Modelo ativo</p>
              <p className="text-[11px] text-zinc-500 truncate font-mono">{destPath.split("/")[1]}</p>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
              LIVE
            </span>
          </div>
          <p className="text-[11px] text-zinc-500">
            O cliente <strong className="text-zinc-700 dark:text-zinc-300">{clientName}</strong> já pode visualizar este modelo na página <strong className="text-zinc-700 dark:text-zinc-300">Modelo BIM</strong> do portal.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex-1 text-xs font-bold px-3 py-2 rounded-lg border border-blue-300 dark:border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Upload size={13} /> Substituir modelo
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-red-300 dark:border-red-500/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} />
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-bold px-2.5 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Remover
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs font-bold px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado: arquivo selecionado, aguardando confirmar */}
      {selectedFile && (
        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">Arquivo selecionado</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <Box size={15} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy dark:text-white truncate">{selectedFile.name}</p>
              <p className="text-[11px] text-zinc-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                {selectedFile.size > 50 * 1024 * 1024 && (
                  <span className="text-red-500 ml-1 font-bold">— excede 50 MB</span>
                )}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Será salvo como <span className="font-mono text-navy dark:text-white font-bold">{destPath.split("/")[1]}</span> e vinculado ao projeto <strong className="text-zinc-700 dark:text-zinc-300">{project.name}</strong>.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || selectedFile.size > 50 * 1024 * 1024}
              className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Enviando..." : "Confirmar envio"}
            </button>
            <button
              onClick={() => setSelectedFile(null)}
              disabled={uploading}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estado: sem modelo */}
      {!currentUrl && !selectedFile && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-3 py-8 px-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/5 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/10 flex items-center justify-center transition-colors">
            <Upload size={20} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-navy dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Selecionar arquivo IFC
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">Apenas .ifc · Máx. 50 MB</p>
          </div>
        </button>
      )}

      {/* Regra de negócio */}
      <div className="flex items-start gap-2 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2.5">
        <AlertCircle size={13} className="text-zinc-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Cada projeto tem <strong className="text-zinc-600 dark:text-zinc-300">um único modelo IFC</strong>. Enviar um novo substitui o anterior. Somente administradores podem fazer upload.
        </p>
      </div>

      {/* Viewer + curadoria de fases (linha do tempo do portal) */}
      {currentUrl && (
        <div className="pt-2">
          <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-3">
            Viewer &amp; curadoria de fases
          </p>
          <BimWorkspace
            project={{ id: project.id, name: project.name, ifc_url: currentUrl }}
            adminMode
            variant="hq"
          />
        </div>
      )}
    </div>
  );
}
