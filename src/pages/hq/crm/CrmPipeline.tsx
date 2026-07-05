import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClients } from '@/hooks/data/useCrmClients';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';
import KanbanColumn from '@/components/hq/crm/KanbanColumn';
import LeadCard from '@/components/hq/crm/LeadCard';
import type { Client } from '@/hooks/data/crmTypes';

export default function CrmPipeline() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { clients, loading, moveClientStage } = useCrmClients(companyId);
  const { stages, loading: stagesLoading } = useCrmStages(companyId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStage = useMemo(() => {
    const map: Record<string, Client[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const c of clients) if (c.stage_id && map[c.stage_id]) map[c.stage_id].push(c);
    return map;
  }, [stages, clients]);

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }
  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const toStageId = e.over ? String(e.over.id) : null;
    if (!toStageId) return;
    const { error } = await moveClientStage(id, toStageId);
    if (error) toast.error('Erro ao mover o lead.');
  }

  if (companyLoading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Pipeline</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Arraste os leads entre as etapas do funil</p>
      </div>

      {(loading || stagesLoading) && (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400"><Loader2 size={20} className="animate-spin" /> Carregando pipeline...</div>
      )}

      {!loading && !stagesLoading && stages.length === 0 && (
        <p className="text-center py-16 text-zinc-400 text-sm">Nenhuma etapa configurada. Crie etapas em Configurações do CRM.</p>
      )}

      {!loading && !stagesLoading && stages.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((s) => <KanbanColumn key={s.id} stage={s} clients={byStage[s.id] ?? []} />)}
          </div>
          <DragOverlay>{activeClient ? <LeadCard client={activeClient} overlay /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
