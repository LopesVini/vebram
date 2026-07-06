import { describe, expect, it } from "vitest";
import { resolvePhases, type PhaseElementInput } from "./bimPhases";

const el = (over: Partial<PhaseElementInput>): PhaseElementInput => ({
  id: 1,
  typeName: "",
  storeyName: "",
  fromPset: null,
  ...over,
});

describe("resolvePhases", () => {
  it("usa a fase do pset quando presente", () => {
    const data = resolvePhases([
      el({ id: 10, fromPset: { num: 2, name: "Estrutura" } }),
      el({ id: 11, fromPset: { num: 1, name: "Fundação" } }),
    ]);
    expect(data).not.toBeNull();
    expect(data!.phases).toEqual([
      { num: 1, name: "Fundação" },
      { num: 2, name: "Estrutura" },
    ]);
    expect(data!.byElement.get(10)).toBe(2);
    expect(data!.byElement.get(11)).toBe(1);
  });

  it("cai nas regras por tipo quando não há pset", () => {
    const data = resolvePhases([
      el({ id: 1, typeName: "IFCFOOTING" }),
      el({ id: 2, typeName: "IFCCOLUMN" }),
      el({ id: 3, typeName: "IFCWALL" }),
      el({ id: 4, typeName: "IFCWINDOW" }),
    ]);
    expect(data!.byElement.get(1)).toBe(1);
    expect(data!.byElement.get(2)).toBe(2);
    expect(data!.byElement.get(3)).toBe(3);
    expect(data!.byElement.get(4)).toBe(5);
  });

  it("pavimento de cobertura vence tipo estrutural (laje do telhado)", () => {
    const data = resolvePhases([
      el({ id: 1, typeName: "IFCSLAB", storeyName: "Cobertura" }),
      el({ id: 2, typeName: "IFCSLAB", storeyName: "Térreo" }),
    ]);
    expect(data!.byElement.get(1)).toBe(4);
    expect(data!.byElement.get(2)).toBe(2);
  });

  it("elemento sem fase fica de fora (sempre visível)", () => {
    const data = resolvePhases([
      el({ id: 1, typeName: "IFCFLOWTERMINAL" }),
      el({ id: 2, typeName: "IFCWALL" }),
    ]);
    expect(data!.byElement.has(1)).toBe(false);
    expect(data!.byElement.get(2)).toBe(3);
  });

  it("retorna null quando nenhum elemento tem fase", () => {
    expect(resolvePhases([el({ id: 1, typeName: "IFCFLOWTERMINAL" })])).toBeNull();
  });
});
