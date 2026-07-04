// src/components/hq/project-detail/UpdatesTab.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useUpdates } from "@/hooks/data/useUpdates";
import UpdateComments from "@/components/updates/UpdateComments";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

const UPDATE_COLORS: { label: string; value: string; cls: string }[] = [
  { label: "Aprovado",       value: "bg-green-500", cls: "text-green-600 dark:text-green-400 border-green-500/30 bg-green-50 dark:bg-green-500/10" },
  { label: "Ação Requerida", value: "bg-accent",    cls: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50  dark:bg-amber-500/10"  },
  { label: "Em Revisão",     value: "bg-blue-500",  cls: "text-blue-600  dark:text-blue-400  border-blue-500/30  bg-blue-50   dark:bg-blue-500/10"   },
];

export default function UpdatesTab({ projectId, authorName }: { projectId: string; authorName: string }) {
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
                <UpdateComments updateId={u.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
