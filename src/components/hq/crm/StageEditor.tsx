import { useState } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import type { StageType } from '@/hooks/data/crmTypes';

const TYPE_LABEL: Record<StageType, string> = { open: 'Aberta', won: 'Ganho', lost: 'Perdido' };

export default function StageEditor() {
  const { companyId } = useCrmCompany();
  const { stages, loading, saveStage, updateStage, deleteStage, moveStage } = useCrmStages(companyId, true);
  const [name, setName] = useState('');
  const [type, setType] = useState<StageType>('open');

  async function add() {
    if (!name.trim()) return;
    const { error } = await saveStage(name.trim(), type);
    if (error) toast.error('Erro ao criar etapa.'); else { setName(''); setType('open'); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da etapa"
          className="flex-1 min-w-[10rem] bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
        <select value={type} onChange={(e) => setType(e.target.value as StageType)}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none">
          <option value="open">Aberta</option><option value="won">Ganho</option><option value="lost">Perdido</option>
        </select>
        <button onClick={add} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl shadow-md shadow-blue-500/20">
          <Plus size={15} /> Adicionar
        </button>
      </div>

      {loading && <p className="text-sm text-zinc-400">Carregando etapas...</p>}
      {!loading && stages.length === 0 && <p className="text-sm text-zinc-400">Nenhuma etapa. Crie a primeira.</p>}

      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li key={s.id} className={`flex flex-wrap items-center gap-2 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 ${s.is_active ? '' : 'opacity-50'}`}>
            <div className="flex flex-col">
              <button onClick={() => moveStage(s.id, 'up')} disabled={i === 0} className="text-zinc-400 hover:text-navy dark:hover:text-white disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => moveStage(s.id, 'down')} disabled={i === stages.length - 1} className="text-zinc-400 hover:text-navy dark:hover:text-white disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            <input value={s.name} onChange={(e) => updateStage(s.id, { name: e.target.value })}
              className="flex-1 min-w-[8rem] bg-transparent border-b border-transparent focus:border-blue-500 text-sm font-semibold text-navy dark:text-white focus:outline-none" />
            <select value={s.stage_type} onChange={(e) => updateStage(s.id, { stage_type: e.target.value as StageType })}
              className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none">
              <option value="open">{TYPE_LABEL.open}</option><option value="won">{TYPE_LABEL.won}</option><option value="lost">{TYPE_LABEL.lost}</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-zinc-500">
              <input type="checkbox" checked={s.is_active} onChange={(e) => updateStage(s.id, { is_active: e.target.checked })} className="accent-blue-600" /> Ativa
            </label>
            <button onClick={() => deleteStage(s.id)} className="text-zinc-400 hover:text-red-500" aria-label="Excluir etapa"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
