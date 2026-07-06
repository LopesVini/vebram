import { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmRules } from '@/hooks/data/useCrmRules';
import type { AutomationRule } from '@/hooks/data/crmTypes';

function ruleSummary(rule: AutomationRule, stageName: (id: string) => string): string {
  const trig = rule.trigger as { type?: string; stage_id?: string };
  const act = rule.action as { type?: string; offset_days?: number; title?: string };
  const when = trig.type === 'stage_entered' ? `entrar em "${stageName(trig.stage_id ?? '')}"` : 'gatilho';
  const then = act.type === 'create_task' ? `criar tarefa "${act.title}" em +${act.offset_days}d` : 'ação';
  return `Quando ${when}, ${then}.`;
}

export default function RuleEditor() {
  const { companyId } = useCrmCompany();
  const { stages } = useCrmStages(companyId);
  const { rules, loading, saveRule, toggleRule, deleteRule } = useCrmRules(companyId);

  const [name, setName] = useState('');
  const [stageId, setStageId] = useState('');
  const [offset, setOffset] = useState('3');
  const [taskTitle, setTaskTitle] = useState('Follow-up');
  const stageName = (id: string) => stages.find((s) => s.id === id)?.name ?? '—';

  async function add() {
    const sid = stageId || stages[0]?.id;
    if (!name.trim() || !sid || !taskTitle.trim()) { toast.error('Preencha nome, etapa e tarefa.'); return; }
    const { error } = await saveRule({ name: name.trim(), stageId: sid, offsetDays: Number(offset) || 0, taskTitle: taskTitle.trim() });
    if (error) toast.error('Erro ao criar regra.'); else { setName(''); }
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da regra"
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none">
          <option value="">Ao entrar na etapa…</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Título da tarefa"
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">em +</span>
          <input type="number" min="0" value={offset} onChange={(e) => setOffset(e.target.value)}
            className="w-16 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-navy dark:text-white focus:outline-none" />
          <span className="text-sm text-zinc-500">dias</span>
          <button onClick={add} className="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl shadow-md shadow-blue-500/20">
            <Plus size={15} /> Criar regra
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400 mb-3 flex items-center gap-1"><Zap size={12} /> As regras são apenas armazenadas nesta fase — a execução automática vem depois.</p>

      {loading && <p className="text-sm text-zinc-400">Carregando regras...</p>}
      {!loading && rules.length === 0 && <p className="text-sm text-zinc-400">Nenhuma regra cadastrada.</p>}

      <ul className="space-y-2">
        {rules.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 ${r.is_active ? '' : 'opacity-50'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy dark:text-white truncate">{r.name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{ruleSummary(r, stageName)}</p>
            </div>
            <label className="flex items-center gap-1 text-xs text-zinc-500 shrink-0">
              <input type="checkbox" checked={r.is_active} onChange={(e) => toggleRule(r.id, e.target.checked)} className="accent-blue-600" /> Ativa
            </label>
            <button onClick={() => deleteRule(r.id)} className="text-zinc-400 hover:text-red-500 shrink-0" aria-label="Excluir regra"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
