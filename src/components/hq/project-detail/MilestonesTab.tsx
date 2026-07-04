// src/components/hq/project-detail/MilestonesTab.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Plus, Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useMilestones, calcProgress } from "@/hooks/data/useMilestones";
import type { Milestone } from "@/hooks/data/useMilestones";

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

export default function MilestonesTab({ projectId }: { projectId: string }) {
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
