import { describe, it, expect } from "vitest";
import {
  DISCIPLINES, MAX_PRANCHA_BYTES, fileTypeFromName, validatePranchaFile,
  fmtBytes, groupByDiscipline, pranchaStoragePath, type Prancha,
} from "./pranchas";

function prancha(over: Partial<Prancha>): Prancha {
  return {
    id: "1", project_id: "p1", discipline: "arquitetonico", name: "PR-01",
    file_path: "p1/arquitetonico/pr-01.pdf", file_type: "pdf",
    size_bytes: 1024, created_at: "2026-07-01T00:00:00Z", ...over,
  };
}

describe("fileTypeFromName", () => {
  it("detecta pdf e dwg ignorando maiúsculas", () => {
    expect(fileTypeFromName("Planta.PDF")).toBe("pdf");
    expect(fileTypeFromName("estrutura.dwg")).toBe("dwg");
  });
  it("rejeita outras extensões", () => {
    expect(fileTypeFromName("foto.png")).toBeNull();
    expect(fileTypeFromName("semextensao")).toBeNull();
  });
});

describe("validatePranchaFile", () => {
  it("aceita pdf dentro do limite", () => {
    expect(validatePranchaFile({ name: "a.pdf", size: 1000 })).toBeNull();
  });
  it("rejeita extensão inválida", () => {
    expect(validatePranchaFile({ name: "a.zip", size: 1000 })).toMatch(/PDF|DWG/i);
  });
  it("rejeita arquivo acima de 50 MB", () => {
    expect(validatePranchaFile({ name: "a.pdf", size: MAX_PRANCHA_BYTES + 1 })).toMatch(/50 MB/);
  });
});

describe("fmtBytes", () => {
  it("formata KB e MB", () => {
    expect(fmtBytes(500)).toBe("0.5 KB");
    expect(fmtBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
  it("lida com null", () => {
    expect(fmtBytes(null)).toBe("—");
  });
});

describe("groupByDiscipline", () => {
  it("agrupa na ordem de DISCIPLINES e omite grupos vazios", () => {
    const groups = groupByDiscipline([
      prancha({ id: "1", discipline: "eletrico" }),
      prancha({ id: "2", discipline: "arquitetonico" }),
      prancha({ id: "3", discipline: "eletrico" }),
    ]);
    expect(groups.map(g => g.slug)).toEqual(["arquitetonico", "eletrico"]);
    expect(groups[1].items).toHaveLength(2);
    expect(groups[0].label).toBe("Arquitetônico");
  });
  it("lista vazia produz zero grupos", () => {
    expect(groupByDiscipline([])).toEqual([]);
  });
});

describe("pranchaStoragePath", () => {
  it("gera {projectId}/{disciplina}/{slug com extensão}", () => {
    const path = pranchaStoragePath("abc-123", "estrutural", "PR-01 Fundações.PDF");
    expect(path).toMatch(/^abc-123\/estrutural\/\d+-pr-01-fundacoes\.pdf$/);
  });
});

describe("DISCIPLINES", () => {
  it("tem os 5 slugs esperados pelo check constraint", () => {
    expect(DISCIPLINES.map(d => d.slug)).toEqual([
      "arquitetonico", "estrutural", "eletrico", "hidrossanitario", "outros",
    ]);
  });
});
