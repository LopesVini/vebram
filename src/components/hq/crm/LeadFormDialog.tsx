import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Contact, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Client, PipelineStage } from '@/hooks/data/crmTypes';
import type { CrmMember } from '@/hooks/data/useCrmMembers';
import type { NewLead } from '@/hooks/data/useCrmClients';

export default function LeadFormDialog({
  initial, stages, members, onClose, onSubmit,
}: {
  initial?: Client | null;
  stages: PipelineStage[];
  members: CrmMember[];
  onClose: () => void;
  onSubmit: (lead: NewLead, id?: string) => Promise<{ error: Error | null }>;
}) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [source, setSource] = useState(initial?.source ?? '');
  const [value, setValue] = useState(initial?.estimated_value != null ? String(initial.estimated_value) : '');
  const [stageId, setStageId] = useState(initial?.stage_id ?? (stages[0]?.id ?? ''));
  const [ownerId, setOwnerId] = useState(initial?.owner_id ?? '');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim()) { setNameError('Informe o nome do lead.'); return; }
    setSaving(true);
    const lead: NewLead = {
      name: name.trim(),
      source: source.trim() || null,
      estimated_value: value.trim() === '' ? null : Number(value),
      stage_id: stageId || null,
      owner_id: ownerId || null,
    };
    const { error } = await onSubmit(lead, initial?.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar lead: ' + error.message);
    } else {
      toast.success(editing ? 'Lead atualizado.' : `Lead "${lead.name}" criado.`);
      onClose();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-lg bg-white dark:bg-[#111827] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Contact size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-navy dark:text-white text-sm">{editing ? 'Editar Lead' : 'Novo Lead'}</h2>
              <p className="text-[11px] text-zinc-500">Preencha os dados do lead</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-navy dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MField label="Nome *" error={nameError} className="col-span-2">
              <input value={name} onChange={e => { setName(e.target.value); setNameError(''); }}
                placeholder="ex: Construtora Andrade" className="modal-input" />
            </MField>
            <MField label="Origem">
              <input value={source} onChange={e => setSource(e.target.value)}
                placeholder="ex: indicação, site, prospecção" className="modal-input" />
            </MField>
            <MField label="Valor estimado (R$)">
              <input type="number" min="0" step="0.01" value={value}
                onChange={e => setValue(e.target.value)} placeholder="ex: 15000" className="modal-input" />
            </MField>
            <MField label="Etapa">
              <select value={stageId} onChange={e => setStageId(e.target.value)} className="modal-input">
                <option value="">Sem etapa</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </MField>
            <MField label="Responsável">
              <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className="modal-input">
                <option value="">Ninguém</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
              </select>
            </MField>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100 dark:border-white/10">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-navy dark:hover:text-white bg-zinc-100 dark:bg-white/5 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? 'Salvar' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </motion.div>

      <style>{`
        :where(.modal-input) {
          width: 100%;
          background: rgb(249 250 251);
          border: 1px solid rgb(228 228 231);
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.813rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 150ms;
        }
        :where(.modal-input:focus) { border-color: rgb(37 99 235); }
        :where(.dark .modal-input) {
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.10);
          color: white;
        }
        :where(.dark .modal-input option) { background: #111827; }
      `}</style>
    </motion.div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

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
