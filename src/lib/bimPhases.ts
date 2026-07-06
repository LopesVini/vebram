// Fases de execução da obra para a linha do tempo do viewer BIM.
//
// Fonte de verdade: atribuição curada manualmente no HQ e gravada na tabela
// `bim_phases` ({ project_id, seq, name, elements: [GlobalId, ...] }).
// O vínculo elemento→fase usa o GlobalId do IFC (IfcGloballyUniqueId), que é
// estável entre reexportações do arquivo — nunca o expressID interno do
// web-ifc, que muda a cada reexportação. O IFC em si não traz metadado de
// fase confiável, então nada é inferido do arquivo.
//
// O modelo demo (sem projeto no banco) usa a curadoria estática de
// `demoPhases.ts`, gerada junto com o arquivo por scripts/generate_demo_ifc.py.

// Uma fase com seus elementos — mesma forma da linha de `bim_phases`
export interface PhaseAssignment {
  seq: number;
  name: string;
  elements: string[]; // GlobalIds IFC
}

// Linha completa da tabela (usada pelo hook de dados)
export interface BimPhase extends PhaseAssignment {
  id: string;
  project_id: string;
}

export interface PhaseInfo {
  seq: number;
  name: string;
}

export interface PhaseLookup {
  phases: PhaseInfo[];               // ordenadas por seq
  byGlobalId: Map<string, number>;   // GlobalId → seq da fase
}

// Indexa as fases cadastradas para consulta de visibilidade.
// GlobalId repetido em mais de uma fase: vale a de menor seq.
export function buildPhaseLookup(assignments: PhaseAssignment[]): PhaseLookup | null {
  if (assignments.length === 0) return null;
  const sorted = [...assignments].sort((a, b) => a.seq - b.seq);
  const byGlobalId = new Map<string, number>();
  for (const phase of sorted) {
    for (const gid of phase.elements) {
      if (!byGlobalId.has(gid)) byGlobalId.set(gid, phase.seq);
    }
  }
  return {
    phases: sorted.map(p => ({ seq: p.seq, name: p.name })),
    byGlobalId,
  };
}

// Elementos do modelo carregado que ainda não têm fase atribuída.
// Cobre reexportações do Revit: GlobalIds novos/alterados aparecem aqui
// para o admin revisar.
export function findOrphans(
  modelGlobalIds: Iterable<string>,
  lookup: PhaseLookup | null,
): string[] {
  const orphans: string[] = [];
  for (const gid of modelGlobalIds) {
    if (!lookup || !lookup.byGlobalId.has(gid)) orphans.push(gid);
  }
  return orphans;
}
