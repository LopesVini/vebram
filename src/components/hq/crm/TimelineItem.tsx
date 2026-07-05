import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, ArrowRightLeft, Phone, Cog } from 'lucide-react';
import type { Interaction } from '@/hooks/data/crmTypes';

const ICONS: Record<Interaction['type'], typeof MessageSquare> = {
  note: MessageSquare, stage_change: ArrowRightLeft, contact: Phone, task: MessageSquare, system: Cog,
};

export default function TimelineItem({ interaction, text }: { interaction: Interaction; text: string }) {
  const Icon = ICONS[interaction.type] ?? MessageSquare;
  const when = interaction.created_at
    ? formatDistanceToNow(new Date(interaction.created_at), { addSuffix: true, locale: ptBR })
    : '';
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center shrink-0">
        <Icon size={13} className="text-zinc-500" />
      </div>
      <div className="flex-1 min-w-0 pb-4 border-b border-zinc-100 dark:border-white/5">
        <p className="text-sm text-navy dark:text-white break-words">{text}</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">{when}</p>
      </div>
    </div>
  );
}
