import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function QuickTaskInput({
  fixedClientId, clients, onAdd,
}: {
  fixedClientId?: string;
  clients?: { id: string; name: string }[];
  onAdd: (title: string, dueDate: string | null, clientId: string) => void | Promise<unknown>;
}) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [clientId, setClientId] = useState(fixedClientId ?? clients?.[0]?.id ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const target = fixedClientId ?? clientId;
    if (!title.trim() || !target) return;
    onAdd(title.trim(), due || null, target);
    setTitle('');
    setDue('');
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nova tarefa (ex: ligar de volta)"
        className="flex-1 min-w-[10rem] bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
      />
      {!fixedClientId && clients && (
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
        className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-2 py-2 text-sm text-zinc-600 dark:text-zinc-300 focus:outline-none" />
      <button type="submit"
        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-3 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
        <Plus size={15} /> Add
      </button>
    </form>
  );
}
