import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, MoreHorizontal, Clock, ChevronRight, X, Briefcase, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/data/useProjects";
import type { Project } from "@/hooks/data/useProjects";
import { supabase } from "@/lib/supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ["bg-blue-500","bg-green-500","bg-orange-500","bg-purple-500","bg-teal-500","bg-cyan-500","bg-rose-500","bg-violet-500","bg-amber-500","bg-indigo-500"];
const TYPES  = ["Executivo Completo","Arq. e Interiores","Estrutural e Fundações","Projeto Legal + Exec.","Arquitetura Comercial","Executivo + BIM","Projeto Completo","Arquitetura e Elétrico"];

type ColStatus = "Em Andamento" | "Revisão" | "Concluído";

const columns: { status: ColStatus; label: string; color: string; dot: string }[] = [
  { status: "Em Andamento", label: "Em Andamento", color: "bg-blue-50  dark:bg-blue-500/10  border-blue-200  dark:border-blue-500/20",  dot: "bg-blue-500"  },
  { status: "Revisão",      label: "Em Revisão",   color: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", dot: "bg-amber-500" },
  { status: "Concluído",    label: "Concluído",    color: "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20", dot: "bg-green-500" },
];

const priorityColors: Record<string, string> = {
  Alta:  "bg-red-100   dark:bg-red-500/10   text-red-600   dark:text-red-400",
  Média: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Baixa: "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ proj, index, onProgressChange, onClick, onDelete }: {
  proj: Project;
  index: number;
  onProgressChange: (id: string, p: number) => void;
  onClick: () => void;
  onDelete: (proj: Project) => void;
}) {
  const clientName = proj.client?.display_name ?? "—";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
      onClick={onClick}
      className="bg-white dark:bg-navy-dark border border-zinc-200 dark:border-white/10 rounded-2xl p-4 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${proj.color} flex items-center justify-center text-white font-black text-sm shadow-sm`}>
          {proj.name[0]}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityColors[proj.priority] ?? ""}`}>
            {proj.priority}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(proj); }}
            className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
          >
            <Trash2 size={13} />
          </button>
          <button className="text-zinc-400 hover:text-navy dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      <h4 className="font-bold text-sm text-navy dark:text-white leading-tight mb-0.5 group-hover:text-blue-600 transition-colors">{proj.name}</h4>
      <p className="text-[11px] text-zinc-500 mb-1">{clientName}</p>
      <p className="text-[10px] text-zinc-400 bg-zinc-50 dark:bg-white/5 px-2 py-0.5 rounded-md inline-block mb-3">{proj.type}</p>

      {proj.progress < 100 && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
            <span>Progresso</span>
            <span className="font-bold text-navy dark:text-zinc-300">{proj.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-black/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${proj.progress}%` }}
              transition={{ delay: 0.3 + index * 0.05, duration: 0.7, ease: "easeOut" }}
            />
          </div>
          {/* Slider de progresso inline */}
          <input
            type="range" min={0} max={100} value={proj.progress}
            onClick={e => e.stopPropagation()}
            onChange={e => onProgressChange(proj.id, Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer mt-1 opacity-0 group-hover:opacity-100 transition-opacity h-2"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock size={10} /> {fmtDate(proj.end_date)}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {(proj.team ?? []).map((t, i) => (
              <div key={i} className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 border border-white dark:border-navy flex items-center justify-center text-[8px] font-bold text-navy dark:text-white">
                {t}
              </div>
            ))}
          </div>
          <ChevronRight size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </motion.div>
  );
}

// ── New Project Modal ─────────────────────────────────────────────────────────

interface ClientOption { id: string; display_name: string; email: string; }

const EMPTY_FORM = {
  name: "", client_id: "", type: TYPES[0],
  status: "Em Andamento" as Project["status"],
  priority: "Média" as Project["priority"],
  end_date: "", team: "", progress: "0", description: "",
};

function NewProjectModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (p: Omit<Project, "id" | "created_at" | "client">) => Promise<{ error: unknown }>;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("id,display_name,email").eq("role","client").then(({ data }) => {
      setClients((data as ClientOption[]) ?? []);
    });
  }, []);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Informe o nome do projeto.";
    if (!form.end_date)    e.end_date = "Informe a data de entrega.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const teamArr = form.team.split(",").map(t => t.trim().toUpperCase().slice(0, 2)).filter(Boolean);
    const payload: Omit<Project, "id" | "created_at" | "client"> = {
      name:        form.name.trim(),
      client_id:   form.client_id || null,
      type:        form.type,
      status:      form.status,
      priority:    form.priority,
      end_date:    form.end_date || null,
      start_date:  null,
      progress:    Math.min(100, Math.max(0, Number(form.progress) || 0)),
      team:        teamArr.length ? teamArr : [form.name[0]?.toUpperCase() ?? "?"],
      color:       COLORS[Math.floor(Math.random() * COLORS.length)],
      description: form.description.trim() || null,
      ifc_url: null,
    };

    const { error } = await onSave(payload);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar projeto."); return; }
    toast.success(`Projeto "${payload.name}" criado com sucesso.`);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-lg bg-white dark:bg-[#111827] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/10 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-navy dark:text-white text-sm">Novo Projeto</h2>
              <p className="text-[11px] text-zinc-500">Preencha as informações do projeto</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-navy dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MField label="Nome do Projeto *" error={errors.name} className="col-span-2">
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ex: Residencial Nova Vida" className="modal-input" />
            </MField>

            <MField label="Cliente (portal de acesso)" className="col-span-2">
              <select value={form.client_id} onChange={e => set("client_id", e.target.value)} className="modal-input">
                <option value="">— Sem vínculo —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.email})</option>)}
              </select>
              <p className="text-[10px] text-zinc-400 mt-1">O cliente selecionado verá este projeto na área do cliente.</p>
            </MField>

            <MField label="Data de Entrega *" error={errors.end_date}>
              <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="modal-input" />
            </MField>

            <MField label="Tipo de Serviço">
              <select value={form.type} onChange={e => set("type", e.target.value)} className="modal-input">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </MField>

            <MField label="Status">
              <select value={form.status} onChange={e => set("status", e.target.value as Project["status"])} className="modal-input">
                <option>Em Andamento</option>
                <option>Revisão</option>
                <option>Concluído</option>
                <option>Pausado</option>
              </select>
            </MField>

            <MField label="Prioridade">
              <select value={form.priority} onChange={e => set("priority", e.target.value as Project["priority"])} className="modal-input">
                <option>Alta</option>
                <option>Média</option>
                <option>Baixa</option>
              </select>
            </MField>

            <MField label={`Progresso: ${form.progress}%`} className="col-span-2">
              <input type="range" min={0} max={100} value={form.progress} onChange={e => set("progress", e.target.value)} className="w-full accent-blue-600 cursor-pointer" />
            </MField>

            <MField label="Equipe (iniciais, vírgula)" className="col-span-2">
              <input value={form.team} onChange={e => set("team", e.target.value)} placeholder="ex: CA, MA, AN" className="modal-input" />
            </MField>

            <MField label="Descrição" className="col-span-2">
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2} placeholder="Detalhes do projeto..." className="modal-input resize-none" />
            </MField>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100 dark:border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-navy dark:hover:text-white bg-zinc-100 dark:bg-white/5 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Salvando..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-sm bg-white dark:bg-[#111827] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-navy dark:text-white">Confirmar exclusão</h3>
            <p className="text-[11px] text-zinc-500">Esta ação não pode ser desfeita</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
          Tem certeza que deseja excluir <span className="font-bold text-navy dark:text-white">"{name}"</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-navy dark:hover:text-white bg-zinc-100 dark:bg-white/5 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md shadow-red-500/20">
            Excluir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function HqProjects() {
  const { projects, loading, saveProject, updateProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState<Project["status"] | "Todos">("Todos");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const filtered = projects.filter(p => {
    const clientName = p.client?.display_name ?? "";
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || clientName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "Todos" || p.status === filter;
    return matchSearch && matchFilter;
  });

  async function handleProgressChange(id: string, progress: number) {
    await updateProject(id, { progress });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { error } = await deleteProject(deleteTarget.id);
    if (error) toast.error("Erro ao excluir projeto.");
    else toast.success(`Projeto "${deleteTarget.name}" excluído.`);
    setDeleteTarget(null);
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white">Controle de Projetos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{projects.length} projetos no portfólio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Buscar projeto ou cliente..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
            <Plus size={16} /> Novo Projeto
          </button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 flex-wrap">
        {(["Todos", "Em Andamento", "Revisão", "Concluído", "Pausado"] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === tab
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white"
            }`}>
            {tab === "Revisão" ? "Em Revisão" : tab}
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${filter === tab ? "bg-white/20" : "bg-zinc-100 dark:bg-white/10"}`}>
              {tab === "Todos" ? projects.length : projects.filter(p => p.status === tab).length}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-zinc-400">
          <Loader2 size={20} className="animate-spin" /> Carregando projetos...
        </div>
      )}

      {/* Kanban / List */}
      {!loading && (filter === "Todos" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {columns.map(col => {
            const colProjects = filtered.filter(p => p.status === col.status);
            return (
              <div key={col.status}>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border mb-3 ${col.color}`}>
                  <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                  <span className="text-xs font-bold text-navy dark:text-white">{col.label}</span>
                  <span className="ml-auto text-xs font-bold text-zinc-500">{colProjects.length}</span>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {colProjects.map((proj, i) => (
                      <ProjectCard key={proj.id} proj={proj} index={i} onProgressChange={handleProgressChange} onClick={() => navigate(`/hq/projects/${proj.id}`)} onDelete={setDeleteTarget} />
                    ))}
                  </AnimatePresence>
                  {colProjects.length === 0 && (
                    <div className="text-center py-8 text-sm text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-2xl">
                      Nenhum projeto
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          <AnimatePresence>
            {filtered.map((proj, i) => (
              <ProjectCard key={proj.id} proj={proj} index={i} onProgressChange={handleProgressChange} onClick={() => navigate(`/hq/projects/${proj.id}`)} onDelete={setDeleteTarget} />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-zinc-400">
              Nenhum projeto encontrado{search ? ` para "${search}"` : ""}.
            </div>
          )}
        </div>
      ))}

      <AnimatePresence>
        {showModal && (
          <NewProjectModal
            onClose={() => setShowModal(false)}
            onSave={saveProject}
          />
        )}
        {deleteTarget && (
          <ConfirmDeleteModal
            name={deleteTarget.name}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        :where(.modal-input) { width:100%;background:rgb(249 250 251);border:1px solid rgb(228 228 231);border-radius:.625rem;padding:.5rem .75rem;font-size:.813rem;color:rgb(15 23 42);outline:none;transition:border-color 150ms; }
        :where(.modal-input:focus) { border-color:rgb(37 99 235); }
        :where(.dark .modal-input) { background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.10);color:white; }
        :where(.dark .modal-input option) { background:#111827; }
      `}</style>
    </div>
  );
}

function MField({ label, error, children, className = "" }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-bold text-navy dark:text-zinc-300 mb-1.5">{label}</span>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </label>
  );
}
