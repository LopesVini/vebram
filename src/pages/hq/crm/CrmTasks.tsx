import { useMemo } from 'react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmTasks, bucketTasks } from '@/hooks/data/useCrmTasks';
import { useCrmClients } from '@/hooks/data/useCrmClients';
import QuickTaskInput from '@/components/hq/crm/QuickTaskInput';
import TaskItem from '@/components/hq/crm/TaskItem';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';
import type { CrmTask } from '@/hooks/data/crmTypes';

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SECTIONS: { key: keyof ReturnType<typeof bucketTasks>; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Atrasadas', tone: 'text-rose-500' },
  { key: 'today', label: 'Hoje', tone: 'text-blue-600 dark:text-blue-400' },
  { key: 'upcoming', label: 'Próximas', tone: 'text-navy dark:text-white' },
  { key: 'done', label: 'Concluídas', tone: 'text-zinc-400' },
];

export default function CrmTasks() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { tasks, loading, addTask, toggleTask } = useCrmTasks(companyId);
  const { clients } = useCrmClients(companyId);

  const buckets = useMemo(() => bucketTasks(tasks, todayISO()), [tasks]);
  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, name: c.name })), [clients]);

  async function handleToggle(id: string, done: boolean) {
    const { error } = await toggleTask(id, done);
    if (error) toast.error('Erro ao atualizar tarefa.');
  }
  async function handleAdd(title: string, dueDate: string | null, clientId: string) {
    const { error } = await addTask({ title, due_date: dueDate, client_id: clientId, assignee_id: null });
    if (error) toast.error('Erro ao criar tarefa.');
  }

  if (companyLoading || loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Tarefas</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Follow-ups e próximas ações</p>
      </div>

      <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        {clientOptions.length === 0
          ? <p className="text-sm text-zinc-400">Cadastre um lead antes de criar tarefas.</p>
          : <QuickTaskInput clients={clientOptions} onAdd={handleAdd} />}
      </div>

      {SECTIONS.map((sec) => {
        const list = buckets[sec.key] as CrmTask[];
        if (list.length === 0) return null;
        return (
          <div key={sec.key}>
            <h2 className={`text-xs font-bold uppercase tracking-wide mb-1 ${sec.tone}`}>{sec.label} ({list.length})</h2>
            <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 divide-y divide-zinc-100 dark:divide-white/5 shadow-sm">
              {list.map((t) => <TaskItem key={t.id} task={t} onToggle={handleToggle} />)}
            </div>
          </div>
        );
      })}

      {tasks.length === 0 && <p className="text-center py-14 text-zinc-400 text-sm">Nenhuma tarefa ainda.</p>}
    </div>
  );
}
