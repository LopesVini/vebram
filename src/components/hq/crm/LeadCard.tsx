import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import type { Client } from '@/hooks/data/crmTypes';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function LeadCard({ client, overlay = false }: { client: Client; overlay?: boolean }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !overlay && navigate(`/hq/crm/clients/${client.id}`)}
      className={`bg-white dark:bg-navy-light/60 border border-zinc-200 dark:border-white/10 rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing select-none ${isDragging && !overlay ? 'opacity-40' : ''} ${overlay ? 'shadow-xl rotate-2' : ''}`}
    >
      <p className="font-bold text-sm text-navy dark:text-white truncate">{client.name}</p>
      <p className="text-[11px] text-zinc-500 truncate">{client.source || 'Sem origem'}</p>
      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
        {client.estimated_value != null ? BRL.format(client.estimated_value) : '—'}
      </p>
    </div>
  );
}
