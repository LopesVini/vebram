import { describe, expect, it } from "vitest";
import { buildPhaseLookup, findOrphans, type PhaseAssignment } from "./bimPhases";

const phases: PhaseAssignment[] = [
  { seq: 2, name: "Estrutura", elements: ["gid-p1", "gid-v1"] },
  { seq: 1, name: "Fundação", elements: ["gid-s1", "gid-s2"] },
  { seq: 3, name: "Alvenaria", elements: ["gid-w1"] },
];

describe("buildPhaseLookup", () => {
  it("ordena fases por seq e indexa GlobalId → seq", () => {
    const lookup = buildPhaseLookup(phases)!;
    expect(lookup.phases.map(p => p.name)).toEqual(["Fundação", "Estrutura", "Alvenaria"]);
    expect(lookup.byGlobalId.get("gid-s1")).toBe(1);
    expect(lookup.byGlobalId.get("gid-v1")).toBe(2);
    expect(lookup.byGlobalId.get("gid-w1")).toBe(3);
  });

  it("GlobalId duplicado entre fases fica com a de menor seq", () => {
    const lookup = buildPhaseLookup([
      { seq: 3, name: "C", elements: ["dup"] },
      { seq: 1, name: "A", elements: ["dup"] },
    ])!;
    expect(lookup.byGlobalId.get("dup")).toBe(1);
  });

  it("retorna null sem fases cadastradas", () => {
    expect(buildPhaseLookup([])).toBeNull();
  });
});

describe("findOrphans", () => {
  it("aponta GlobalIds do modelo sem fase atribuída", () => {
    const lookup = buildPhaseLookup(phases);
    const orphans = findOrphans(["gid-s1", "gid-novo", "gid-w1", "gid-reexportado"], lookup);
    expect(orphans).toEqual(["gid-novo", "gid-reexportado"]);
  });

  it("sem lookup, todo elemento do modelo é órfão", () => {
    expect(findOrphans(["a", "b"], null)).toEqual(["a", "b"]);
  });

  it("modelo totalmente curado não tem órfãos", () => {
    const lookup = buildPhaseLookup(phases);
    expect(findOrphans(["gid-s1", "gid-v1"], lookup)).toEqual([]);
  });
});
