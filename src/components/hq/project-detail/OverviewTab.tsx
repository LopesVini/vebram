// src/components/hq/project-detail/OverviewTab.tsx
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/hooks/data/useProjects";

const TYPES = ["Executivo Completo","Arq. e Interiores","Estrutural e Fundações","Projeto Legal + Exec.","Arquitetura Comercial","Executivo + BIM","Projeto Completo","Arquitetura e Elétrico"];

interface ClientOption { id: string; display_name: string; email: string; }

export default function OverviewTab({ project, onSaved }: {
  project: Project;
  onSaved: (changes: Partial<Project>) => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    client_id: project.client_id ?? "",
    type: project.type,
    status: project.status,
    priority: project.priority,
    end_date: project.end_date ?? "",
    description: project.description ?? "",
  });

  useEffect(() => {
    supabase.from("profiles").select("id,display_name,email").eq("role", "client").then(({ data }) => {
      setClients((data as ClientOption[]) ?? []);
    });
  }, []);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do projeto."); return; }
    setSaving(true);
    const changes: Partial<Project> = {
      name: form.name.trim(),
      client_id: form.client_id || null,
      type: form.type,
      status: form.status,
      priority: form.priority,
      end_date: form.end_date || null,
      description: form.description.trim() || null,
    };
    const { error } = await supabase.from("projects").update(changes).eq("id", project.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar projeto."); return; }
    toast.success("Projeto atualizado.");
    onSaved(changes);
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-4">
      {/* Progresso derivado dos marcos (somente leitura) */}
      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3">
        <div className="flex justify-between text-[11px] font-bold text-zinc-500 mb-1.5">
          <span>Progresso (calculado pelos marcos)</span>
          <span className="text-navy dark:text-white">{project.progress}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-200 dark:bg-black/30 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome do Projeto" className="sm:col-span-2">
          <input value={form.name} onChange={e => set("name", e.target.value)} className="detail-input" />
        </Field>

        <Field label="Cliente (portal de acesso)" className="sm:col-span-2">
          <select value={form.client_id} onChange={e => set("client_id", e.target.value)} className="detail-input">
            <option value="">— Sem vínculo —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.email})</option>)}
          </select>
          <p className="text-[10px] text-zinc-400 mt-1">O cliente selecionado vê este projeto, suas pranchas e atualizações no portal.</p>
        </Field>

        <Field label="Tipo de Serviço">
          <select value={form.type} onChange={e => set("type", e.target.value)} className="detail-input">
            {!TYPES.includes(form.type) && <option value={form.type}>{form.type}</option>}
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Data de Entrega">
          <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="detail-input" />
        </Field>

        <Field label="Status">
          <select value={form.status} onChange={e => set("status", e.target.value as Project["status"])} className="detail-input">
            <option>Em Andamento</option>
            <option>Revisão</option>
            <option>Concluído</option>
            <option>Pausado</option>
          </select>
        </Field>

        <Field label="Prioridade">
          <select value={form.priority} onChange={e => set("priority", e.target.value as Project["priority"])} className="detail-input">
            <option>Alta</option>
            <option>Média</option>
            <option>Baixa</option>
          </select>
        </Field>

        <Field label="Descrição" className="sm:col-span-2">
          <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} className="detail-input resize-none" />
        </Field>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-500/20 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <style>{`
        :where(.detail-input) { width:100%;background:rgb(249 250 251);border:1px solid rgb(228 228 231);border-radius:.625rem;padding:.5rem .75rem;font-size:.875rem;color:rgb(15 23 42);outline:none;transition:border-color 150ms; }
        :where(.detail-input:focus) { border-color:rgb(37 99 235); }
        :where(.dark .detail-input) { background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.10);color:white; }
        :where(.dark .detail-input option) { background:#111827; }
      `}</style>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-bold text-navy dark:text-zinc-300 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
