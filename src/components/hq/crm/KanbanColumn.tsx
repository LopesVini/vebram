import { useDroppable } from '@dnd-kit/core';
import type { Client, PipelineStage } from '@/hooks/data/crmTypes';
import LeadCard from '@/components/hq/crm/LeadCard';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function KanbanColumn({ stage, clients }: { stage: PipelineStage; clients: Client[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = clients.reduce((sum, c) => sum + (c.estimated_value ?? 0), 0);
  return (
    <div className="w-72 shrink-0 flex flex-col">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-navy dark:text-white">{stage.name}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500">{clients.length}</span>
        </div>
        <span className="text-[10px] text-zinc-400">{BRL.format(total)}</span>
      </div>
      <div ref={setNodeRef}
        className={`flex-1 min-h-[8rem] rounded-2xl p-2 space-y-2 transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-zinc-50 dark:bg-white/[0.03]'}`}>
        {clients.map((c) => <LeadCard key={c.id} client={c} />)}
        {clients.length === 0 && <p className="text-[11px] text-zinc-400 text-center py-6">Arraste um lead para cá</p>}
      </div>
    </div>
  );
}
