import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClient, describeInteraction } from '@/hooks/data/useCrmClient';
import { useCrmTasks } from '@/hooks/data/useCrmTasks';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmMembers } from '@/hooks/data/useCrmMembers';
import StageBadge from '@/components/hq/crm/StageBadge';
import TimelineItem from '@/components/hq/crm/TimelineItem';
import TaskItem from '@/components/hq/crm/TaskItem';
import QuickTaskInput from '@/components/hq/crm/QuickTaskInput';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function CrmClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { client, channels, interactions, loading, addNote, updateField, changeStage } = useCrmClient(id ?? null);
  const { tasks, addTask, toggleTask } = useCrmTasks(companyId);
  const { stages } = useCrmStages(companyId);
  const { members } = useCrmMembers(companyId);

  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);
  const stageName = (sid: string | null | undefined) => (sid && stageById[sid]?.name) || 'Sem etapa';
  const clientTasks = useMemo(() => tasks.filter((t) => t.client_id === id), [tasks, id]);

  async function submitNote() {
    if (!note.trim()) return;
    setSending(true);
    const { error } = await addNote(note.trim());
    setSending(false);
    if (error) toast.error('Erro ao salvar anotação.'); else setNote('');
  }

  if (companyLoading || loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  if (!client) return <p className="text-center py-20 text-zinc-400">Cliente não encontrado.</p>;

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-5">
      <Link to="/hq/crm/leads" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-navy dark:hover:text-white">
        <ArrowLeft size={15} /> Voltar aos leads
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-navy dark:text-white">{client.name}</h1>
              <StageBadge stage={client.stage_id ? stageById[client.stage_id] : undefined} />
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{client.source || 'Origem não informada'}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {client.estimated_value != null ? BRL.format(client.estimated_value) : '—'}
            </p>
            <p className="text-[11px] text-zinc-500">valor estimado</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <label className="text-xs font-bold text-zinc-500">Etapa
            <select value={client.stage_id ?? ''} onChange={(e) => changeStage(e.target.value || null)}
              className="mt-1 w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-navy dark:text-white focus:outline-none">
              <option value="">Sem etapa</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-zinc-500">Responsável
            <select value={client.owner_id ?? ''} onChange={(e) => updateField({ owner_id: e.target.value || null })}
              className="mt-1 w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-navy dark:text-white focus:outline-none">
              <option value="">Sem responsável</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* History */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-sm text-navy dark:text-white mb-3">Histórico</h2>
          <div className="flex gap-2 mb-4">
            <input value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitNote(); }}
              placeholder="Adicionar anotação..."
              className="flex-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500" />
            <button onClick={submitNote} disabled={sending}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-60">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <div className="space-y-3">
            {interactions.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Sem histórico ainda.</p>}
            {interactions.map((it) => (
              <TimelineItem key={it.id} interaction={it} text={describeInteraction(it, stageName)} />
            ))}
          </div>
        </div>

        {/* Sidebar: contacts + tasks */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm text-navy dark:text-white mb-3">Contatos</h2>
            {channels.length === 0 && <p className="text-xs text-zinc-400">Nenhum contato cadastrado.</p>}
            <ul className="space-y-1.5">
              {channels.map((ch) => (
                <li key={ch.id} className="text-sm text-zinc-600 dark:text-zinc-300">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 mr-2">{ch.type}</span>{ch.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-sm text-navy dark:text-white mb-3">Tarefas</h2>
            <QuickTaskInput fixedClientId={client.id} onAdd={(title, dueDate, clientId) => addTask({ title, due_date: dueDate, client_id: clientId, assignee_id: null })} />
            <div className="mt-2">
              {clientTasks.length === 0 && <p className="text-xs text-zinc-400 py-2">Nenhuma tarefa.</p>}
              {clientTasks.map((t) => <TaskItem key={t.id} task={t} onToggle={toggleTask} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
