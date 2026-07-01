import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Flag, Bell, Plus, Trash2, Loader2, CheckCircle2, Circle, Clock,
  ChevronDown, Send, Lock, Box, Upload, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/hooks/data/useProjects";
import { useMilestones, calcProgress } from "@/hooks/data/useMilestones";
import type { Milestone } from "@/hooks/data/useMilestones";
import { useUpdates } from "@/hooks/data/useUpdates";
import type { Update } from "@/hooks/data/useUpdates";
import { useProjectIfc, storagePath } from "@/hooks/data/useProjectIfc";

// ── Helpers ───────────────────────────────────────────────────────────────────

const isSeed = (id: string) => id.startsWith("seed-");

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

const MILESTONE_STATUS: Milestone["status"][] = ["done", "active", "pending"];
const MILESTONE_STATUS_LABELS: Record<Milestone["status"], string> = {
  done:    "Concluído",
  active:  "Em Andamento",
  pending: "Pendente",
};
const MILESTONE_STATUS_COLORS: Record<Milestone["status"], string> = {
  done:    "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10",
  active:  "text-blue-600  dark:text-blue-400  bg-blue-50  dark:bg-blue-500/10",
  pending: "text-zinc-500  dark:text-zinc-400  bg-zinc-100 dark:bg-white/5",
};
const MILESTONE_ICONS: Record<Milestone["status"], typeof CheckCircle2> = {
  done:    CheckCircle2,
  active:  Clock,
  pending: Circle,
};

const UPDATE_COLORS: { label: string; value: string; cls: string }[] = [
  { label: "Aprovado",       value: "bg-green-500", cls: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-50 dark:bg-green-500/10" },
  { label: "Ação Requerida", value: "bg-accent",    cls: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50  dark:bg-amber-500/10"  },
  { label: "Em Revisão",     value: "bg-blue-500",  cls: "text-blue-600  dark:text-blue-400  border-blue-500/30  bg-blue-50   dark:bg-blue-500/10"   },
];

// ── Milestones Tab ────────────────────────────────────────────────────────────

function MilestonesTab({ projectId }: { projectId: string }) {
  const { milestones, loading, saveMilestone, updateMilestone, updateDelivered } = useMilestones(projectId);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDelivered, setEditingDelivered] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", date: "", status: "pending" as Milestone["status"],
    weight: "1", total_items: "",
  });

  const progress = calcProgress(milestones);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do marco."); return; }
    setSaving(true);
    const { error } = await saveMilestone({
      project_id:      projectId,
      name:            form.name.trim(),
      status:          form.status,
      date:            form.date || null,
      sort_order:      milestones.length,
      weight:          parseFloat(form.weight) || 1,
      total_items:     form.total_items ? parseInt(form.total_items) : null,
      delivered_items: 0,
      approved_at:     null,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar marco."); return; }
    toast.success("Marco adicionado.");
    setForm({ name: "", date: "", status: "pending", weight: "1", total_items: "" });
    setShowForm(false);
  }

  async function cycleStatus(m: Milestone) {
    const idx = MILESTONE_STATUS.indexOf(m.status);
    const next = MILESTONE_STATUS[(idx + 1) % MILESTONE_STATUS.length];
    const { error } = await updateMilestone(m.id, { status: next });
    if (error) toast.error("Erro ao atualizar marco.");
  }

  async function handleDeliveredBlur(m: Milestone, val: string) {
    const n = Math.max(0, Math.min(parseInt(val) || 0, m.total_items ?? 9999));
    await updateDelivered(m.id, n);
    setEditingDelivered(null);
  }

  function milestonePct(m: Milestone): number {
    if (m.approved_at) return 100;
    if (m.total_items && m.total_items > 0) return Math.round(((m.delivered_items ?? 0) / m.total_items) * 100);
    return m.status === "done" ? 100 : m.status === "active" ? 50 : 0;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progresso geral calculado */}
      {!loading && milestones.length > 0 && (
        <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3">
          <div className="flex justify-between text-[11px] font-bold text-zinc-500 mb-1.5">
            <span>Progresso calculado</span>
            <span className="text-navy dark:text-white">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-200 dark:bg-black/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
          <Loader2 size={16} className="animate-spin" /> Carregando marcos...
        </div>
      )}

      {!loading && milestones.length === 0 && !showForm && (
        <div className="text-center py-10 text-zinc-400">
          <Flag size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhum marco adicionado ainda.</p>
        </div>
      )}

      {!loading && milestones.length > 0 && (
        <div className="relative border-l-2 border-zinc-200 dark:border-white/10 ml-3 space-y-4">
          {milestones.map(m => {
            const Icon = MILESTONE_ICONS[m.status];
            const pct = milestonePct(m);
            const isDeliveryBased = m.total_items && m.total_items > 0;
            return (
              <div key={m.id} className="relative pl-6">
                <div className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center
                  ${m.approved_at ? "bg-violet-500" : m.status === "done" ? "bg-green-500" : m.status === "active" ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-600"}`}>
                  <Icon size={9} className="text-white" strokeWidth={3} />
                </div>
                <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-3 group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-navy dark:text-white leading-tight">{m.name}</p>
                        {m.approved_at && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            Aprovado pelo cliente
                          </span>
                        )}
                      </div>
                      {m.date && <p className="text-[11px] text-zinc-500 mt-0.5">{fmtDate(m.date)}</p>}
                      <p className="text-[10px] text-zinc-400 mt-0.5">Peso: {m.weight ?? 1}</p>
                    </div>
                    <button
                      onClick={() => cycleStatus(m)}
                      disabled={!!m.approved_at}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${MILESTONE_STATUS_COLORS[m.status]}`}
                    >
                      {MILESTONE_STATUS_LABELS[m.status]}
                    </button>
                  </div>

                  {/* Progresso parcial (pranchas ou status) */}
                  {(isDeliveryBased || pct > 0) && (
                    <div className="mt-1">
                      <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                        {isDeliveryBased ? (
                          <span className="flex items-center gap-1">
                            Pranchas:
                            {editingDelivered === m.id ? (
                              <input
                                type="number"
                                defaultValue={m.delivered_items}
                                min={0}
                                max={m.total_items ?? undefined}
                                autoFocus
                                onBlur={e => handleDeliveredBlur(m, e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleDeliveredBlur(m, (e.target as HTMLInputElement).value)}
                                className="w-10 bg-white dark:bg-black/30 border border-zinc-300 dark:border-white/20 rounded px-1 text-[10px] text-center text-navy dark:text-white focus:outline-none"
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <button
                                onClick={() => setEditingDelivered(m.id)}
                                className="font-bold text-navy dark:text-white hover:text-blue-600 transition-colors underline decoration-dotted"
                              >
                                {m.delivered_items}
                              </button>
                            )}
                            <span>/ {m.total_items}</span>
                          </span>
                        ) : (
                          <span>Progresso</span>
                        )}
                        <span className="font-bold text-navy dark:text-zinc-300">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-black/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${m.approved_at ? "bg-violet-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-4 space-y-3 overflow-hidden"
          >
            <p className="text-xs font-bold text-navy dark:text-white">Novo Marco</p>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: Anteprojeto aprovado"
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
              />
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Milestone["status"] }))}
                className="bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="pending">Pendente</option>
                <option value="active">Em Andamento</option>
                <option value="done">Concluído</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-bold text-zinc-500 block mb-1">Peso no progresso</span>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.weight}
                  onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                  placeholder="1.0"
                  className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-zinc-500 block mb-1">Total de pranchas (opcional)</span>
                <input
                  type="number"
                  min="1"
                  value={form.total_items}
                  onChange={e => setForm(f => ({ ...f, total_items: e.target.value }))}
                  placeholder="ex: 12"
                  className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
                />
              </label>
            </div>
            <p className="text-[10px] text-zinc-400">
              Se informar pranchas, o progresso desse marco será calculado por entregadas/total. O peso define a importância relativa no progresso geral.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-zinc-500 px-3 py-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Salvar Marco
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 px-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10"
        >
          <Plus size={13} /> Adicionar Marco
        </button>
      )}
    </div>
  );
}

// ── Updates Tab ───────────────────────────────────────────────────────────────

function UpdatesTab({ projectId, authorName }: { projectId: string; authorName: string }) {
  const { updates, loading, saveUpdate, deleteUpdate } = useUpdates(projectId);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", color: "bg-green-500" });
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (showForm && textRef.current) textRef.current.focus(); }, [showForm]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Informe o título da atualização."); return; }
    setSaving(true);
    const { error } = await saveUpdate({
      project_id:  projectId,
      title:       form.title.trim(),
      content:     form.content.trim() || null,
      author_name: authorName,
      color:       form.color,
    });
    setSaving(false);
    if (error) { toast.error("Erro ao publicar atualização."); return; }
    toast.success("Atualização publicada.");
    setForm({ title: "", content: "", color: "bg-green-500" });
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const { error } = await deleteUpdate(id);
    setDeleting(null);
    if (error) toast.error("Erro ao remover atualização.");
    else toast.success("Atualização removida.");
  }

  const selectedColor = UPDATE_COLORS.find(c => c.value === form.color) ?? UPDATE_COLORS[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Post Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handlePost}
            className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-4 space-y-3 overflow-hidden"
          >
            <p className="text-xs font-bold text-navy dark:text-white">Nova Atualização</p>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Título da entrega / atualização"
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
            />
            <textarea
              ref={textRef}
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={3}
              placeholder="Descreva a entrega (opcional)..."
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500 resize-none"
            />
            {/* Status selector */}
            <div className="flex gap-2">
              {UPDATE_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c.value }))}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${c.cls} ${form.color === c.value ? "ring-2 ring-offset-1 ring-blue-500" : "opacity-60 hover:opacity-100"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-zinc-500 px-3 py-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Publicar
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 px-3 rounded-xl border border-dashed border-blue-300 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/10"
        >
          <Plus size={13} /> Nova Atualização
        </button>
      )}

      {/* List */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
          <Loader2 size={16} className="animate-spin" /> Carregando atualizações...
        </div>
      )}

      {!loading && updates.length === 0 && (
        <div className="text-center py-10 text-zinc-400">
          <Bell size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhuma atualização publicada ainda.</p>
        </div>
      )}

      {!loading && updates.length > 0 && (
        <div className="space-y-3">
          {updates.map(u => {
            const colorInfo = UPDATE_COLORS.find(c => c.value === u.color) ?? UPDATE_COLORS[2];
            return (
              <div key={u.id} className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-4 group">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-navy dark:text-white">{u.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorInfo.cls}`}>
                      {colorInfo.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(u.id)}
                    disabled={deleting === u.id}
                    className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 disabled:opacity-40"
                  >
                    {deleting === u.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
                {u.content && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{u.content}</p>}
                <p className="text-[10px] text-zinc-400 mt-2">{fmtDate(u.created_at)} · {u.author_name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── BIM Tab ───────────────────────────────────────────────────────────────────

function BimTab({ project }: { project: Project }) {
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
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

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
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white dark:bg-[#0f172a] border-l border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
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

            {/* Tabs */}
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

            {/* Content */}
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
