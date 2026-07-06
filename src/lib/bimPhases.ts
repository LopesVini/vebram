// Fases de execução da obra para a linha do tempo do viewer BIM.
//
// Fonte primária: pset por elemento no IFC (ex.: "Vertice_Execucao" com as
// propriedades Fase/Etapa, como no modelo demo gerado por
// scripts/generate_demo_ifc.py). Quando o modelo não traz fase, o fallback
// classifica cada elemento pelas regras abaixo (tipo IFC + nome do pavimento).

export interface PhaseInfo {
  num: number;
  name: string;
}

export interface PhaseData {
  phases: PhaseInfo[];                // ordenadas por num
  byElement: Map<number, number>;     // expressID → num da fase
}

export interface PhaseRule {
  fase: number;
  nome: string;
  types?: string[];    // nomes de tipo IFC em maiúsculas (ex.: "IFCWALL")
  storeys?: string[];  // trechos do nome do pavimento, minúsculas
}

export interface PhaseElementInput {
  id: number;
  typeName: string;                              // tipo IFC em maiúsculas
  storeyName: string;
  fromPset: { num: number; name?: string } | null;
}

// Ordem define prioridade: primeira regra que casar vence.
export const DEFAULT_PHASE_RULES: PhaseRule[] = [
  { fase: 1, nome: "Fundação",   types: ["IFCFOOTING", "IFCPILE"], storeys: ["funda"] },
  { fase: 4, nome: "Cobertura",  types: ["IFCROOF"], storeys: ["cobert", "telhado"] },
  { fase: 2, nome: "Estrutura",  types: ["IFCCOLUMN", "IFCBEAM", "IFCSLAB", "IFCSTAIR", "IFCSTAIRFLIGHT"] },
  { fase: 3, nome: "Alvenaria",  types: ["IFCWALL", "IFCWALLSTANDARDCASE", "IFCCURTAINWALL", "IFCPLATE"] },
  { fase: 5, nome: "Esquadrias", types: ["IFCWINDOW", "IFCDOOR"] },
];

export function resolvePhases(
  items: PhaseElementInput[],
  rules: PhaseRule[] = DEFAULT_PHASE_RULES,
): PhaseData | null {
  const byElement = new Map<number, number>();
  const names = new Map<number, string>();

  for (const it of items) {
    let num: number | null = null;
    let name: string | undefined;

    if (it.fromPset) {
      num = it.fromPset.num;
      name = it.fromPset.name;
    } else {
      const storey = it.storeyName.toLowerCase();
      for (const r of rules) {
        const byStorey = r.storeys?.some(s => storey.includes(s));
        const byType = r.types?.includes(it.typeName);
        if (byStorey || byType) {
          num = r.fase;
          name = r.nome;
          break;
        }
      }
    }

    if (num === null) continue; // sem fase → sempre visível
    byElement.set(it.id, num);
    if (name && !names.has(num)) names.set(num, name);
  }

  if (byElement.size === 0) return null;

  const nums = [...new Set(byElement.values())].sort((a, b) => a - b);
  const phases = nums.map(n => ({ num: n, name: names.get(n) ?? `Fase ${n}` }));
  return { phases, byElement };
}
