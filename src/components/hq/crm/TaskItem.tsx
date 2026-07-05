import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import type { CrmTask } from '@/hooks/data/crmTypes';

export default function TaskItem({ task, onToggle }: { task: CrmTask; onToggle: (id: string, done: boolean) => void }) {
  const done = task.status === 'done';
  return (
    <label className="flex items-center gap-3 py-2 cursor-pointer group">
      <input
        type="checkbox"
        role="checkbox"
        checked={done}
        onChange={() => onToggle(task.id, !done)}
        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
      />
      <span className={`flex-1 text-sm ${done ? 'line-through text-zinc-400' : 'text-navy dark:text-white'}`}>
        {task.title}
      </span>
      {task.due_date && (
        <span className="flex items-center gap-1 text-[10px] text-zinc-400">
          <CalendarClock size={11} /> {format(new Date(task.due_date + 'T00:00:00'), 'dd/MM')}
        </span>
      )}
    </label>
  );
}
