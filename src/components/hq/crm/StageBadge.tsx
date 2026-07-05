import type { PipelineStage } from '@/hooks/data/crmTypes';

const TYPE_STYLES: Record<PipelineStage['stage_type'], string> = {
  open: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  won: 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  lost: 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export default function StageBadge({ stage }: { stage?: PipelineStage }) {
  if (!stage) {
    return (
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400">
        Sem etapa
      </span>
    );
  }
  const style = TYPE_STYLES[stage.stage_type];
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${style}`}
      style={stage.color ? { backgroundColor: `${stage.color}22`, color: stage.color } : undefined}
    >
      {stage.name}
    </span>
  );
}
