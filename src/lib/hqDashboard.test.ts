import { describe, it, expect } from "vitest";
import {
  buildProgressData, buildFunnelData, buildLeadsData, buildDeadlines,
  type DashProject, type DashMilestone,
} from "./hqDashboard";

function proj(over: Partial<DashProject>): DashProject {
  return {
    id: "p1", name: "Projeto", progress: 50, status: "Em Andamento",
    end_date: null, color: "bg-blue-500", created_at: "2026-01-01T00:00:00Z", ...over,
  };
}

function mile(over: Partial<DashMilestone>): DashMilestone {
  return {
    id: "m1", name: "Marco", status: "pending", date: null,
    approved_at: null, project_id: "p1", ...over,
  };
}

const NOW = new Date("2026-07-04T12:00:00Z");

describe("buildProgressData", () => {
  it("filtra ativos e ordena por progresso crescente", () => {
    const data = buildProgressData([
      proj({ id: "a", name: "A", progress: 80 }),
      proj({ id: "b", name: "B", progress: 20 }),
      proj({ id: "c", name: "C", progress: 100, status: "Concluído" }),
      proj({ id: "d", name: "D", progress: 40, status: "Revisão" }),
      proj({ id: "e", name: "E", progress: 10, status: "Pausado" }),
    ]);
    expect(data.map(d => d.name)).toEqual(["B", "D", "A"]);
  });
  it("limita a 8 projetos", () => {
    const many = Array.from({ length: 12 }, (_, i) => proj({ id: String(i), name: `P${i}`, progress: i }));
    expect(buildProgressData(many)).toHaveLength(8);
  });
});

describe("buildFunnelData", () => {
  it("conta os 4 estágios; aprovado tem precedência sobre done", () => {
    const data = buildFunnelData([
      mile({ id: "1", status: "pending" }),
      mile({ id: "2", status: "active" }),
      mile({ id: "3", status: "done" }),
      mile({ id: "4", status: "done", approved_at: "2026-06-01T00:00:00Z" }),
    ]);
    expect(data).toEqual([
      { stage: "Pendente", count: 1 },
      { stage: "Em Andamento", count: 1 },
      { stage: "Entregue", count: 1 },
      { stage: "Aprovado", count: 1 },
    ]);
  });
  it("estágios vazios aparecem com zero", () => {
    expect(buildFunnelData([]).map(d => d.count)).toEqual([0, 0, 0, 0]);
  });
});

describe("buildLeadsData", () => {
  it("retorna 12 meses terminando no mês atual", () => {
    const data = buildLeadsData([], NOW);
    expect(data).toHaveLength(12);
    expect(data[11].name).toBe("Jul/26");
    expect(data[0].name).toBe("Ago/25");
  });
  it("conta leads no mês certo e ignora fora da janela", () => {
    const data = buildLeadsData([
      { created_at: "2026-07-01T10:00:00Z" },
      { created_at: "2026-07-02T10:00:00Z" },
      { created_at: "2026-06-15T10:00:00Z" },
      { created_at: "2024-01-01T10:00:00Z" },
    ], NOW);
    expect(data[11].value).toBe(2);
    expect(data[10].value).toBe(1);
    expect(data.reduce((s, d) => s + d.value, 0)).toBe(3);
  });
});

describe("buildDeadlines", () => {
  it("inclui projetos e marcos vencendo em 30 dias, ordenados por data", () => {
    const items = buildDeadlines(
      [
        proj({ id: "a", name: "Perto", end_date: "2026-07-20" }),
        proj({ id: "b", name: "Longe", end_date: "2026-12-01" }),
        proj({ id: "c", name: "Feito", end_date: "2026-07-10", status: "Concluído" }),
      ],
      [
        mile({ id: "1", name: "Marco urgente", date: "2026-07-06" }),
        mile({ id: "2", name: "Marco aprovado", date: "2026-07-07", approved_at: "2026-06-01T00:00:00Z" }),
        mile({ id: "3", name: "Marco done", date: "2026-07-08", status: "done" }),
      ],
      NOW,
    );
    expect(items.map(i => i.name)).toEqual(["Marco urgente", "Perto"]);
    expect(items[0].kind).toBe("marco");
    expect(items[0].daysLeft).toBe(2);
  });
});
