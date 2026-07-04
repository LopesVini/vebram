# Pranchas + IA + Dashboard HQ + Página de Projeto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Client-facing "Pranchas" download page fed by admin uploads; reusable "Melhorar com IA" button on mural posts and admin project updates; full-page admin project detail replacing the narrow drawer; HQ dashboard rebuilt with useful charts.

**Architecture:** New Supabase table `pranchas` + private storage bucket `pranchas` (signed-URL downloads). New route `/hq/projects/:id` with tabs (Visão Geral, Marcos, Atualizações, Pranchas, BIM) built from components extracted out of `HqProjectDrawer`. Groq call extracted from `GetStarted.tsx` into `useEnhanceText(systemPrompt)`. Dashboard chart data comes from pure functions in `src/lib/hqDashboard.ts` (unit-tested), rendered with recharts.

**Tech Stack:** Vite + React 18 + TS, Tailwind, framer-motion, recharts (already installed), Supabase JS (anon key, RLS), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-04-portal-pranchas-ia-dashboard-design.md`

## Global Constraints

- All user-facing strings in **pt-BR**.
- Data hooks are hand-rolled (`useState` + supabase direct + optimistic updates) — **no React Query**.
- Import alias `@/` → `src/`.
- **No new npm dependencies.**
- Service-role key never in frontend; privileged writes gated by `public.is_admin()` in RLS.
- Upload cap **50 MB**; pranchas accept only `.pdf` and `.dwg`.
- Discipline slugs (check constraint + frontend constant must match exactly): `arquitetonico`, `estrutural`, `eletrico`, `hidrossanitario`, `outros`.
- Charts: **one hue per chart**, `#3B82F6` for marks in both light/dark (validated); never mix blue+violet inside one chart; amber only as status chip with visible text, never as a chart mark. Text/labels use text colors, not the series color.
- Errors surface via `toast` from `sonner` (not `alert`) in all new code.
- Dev server: `npm run dev` on port 8080. Tests: `npx vitest run <file>`. Lint: `npm run lint`. Build: `npm run build`.

---

### Task 1: Migration — tabela `pranchas`, bucket, policies, leitura de `Orçamentos`

**Files:**
- Create: `supabase/migrations/20260704_pranchas.sql`

**Interfaces:**
- Consumes: `public.is_admin()` and `public.projects` (existing, see `supabase/migrations/20260702_seguranca_banco.sql`).
- Produces: table `public.pranchas` (columns below), private bucket `pranchas`, RLS/storage policies, `Orçamentos` select policy for admins. Later tasks rely on column names exactly: `id, project_id, discipline, name, file_path, file_type, size_bytes, created_at`.

- [ ] **Step 1: Write the migration file**

```sql
-- 20260704_pranchas.sql
-- Pranchas de projeto (PDF/DWG) publicadas pelo admin para download do cliente.
--   1) Tabela public.pranchas + RLS (cliente lê as do seu projeto; admin gerencia)
--   2) Bucket PRIVADO "pranchas" (download via signed URL no app)
--   3) Políticas de storage espelhando a regra da tabela
--   4) Leitura de "Orçamentos" para admin (gráfico de leads no dashboard HQ)

-- ---------- 1. Tabela ----------
create table if not exists public.pranchas (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  discipline  text not null check (discipline in ('arquitetonico','estrutural','eletrico','hidrossanitario','outros')),
  name        text not null,
  file_path   text not null,
  file_type   text not null check (file_type in ('pdf','dwg')),
  size_bytes  bigint,
  created_at  timestamptz not null default now()
);

create index if not exists idx_pranchas_project on public.pranchas(project_id);

alter table public.pranchas enable row level security;

drop policy if exists "Cliente lê pranchas do seu projeto" on public.pranchas;
create policy "Cliente lê pranchas do seu projeto"
  on public.pranchas for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.projects p
      where p.id = pranchas.project_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "Admin gerencia pranchas" on public.pranchas;
create policy "Admin gerencia pranchas"
  on public.pranchas for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 2. Bucket privado ----------
insert into storage.buckets (id, name, public)
values ('pranchas', 'pranchas', false)
on conflict (id) do nothing;

-- ---------- 3. Políticas de storage ----------
-- Caminho: {projectId}/{disciplina}/{arquivo} → 1º segmento identifica o projeto.
drop policy if exists "Admin envia pranchas" on storage.objects;
create policy "Admin envia pranchas"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pranchas' and public.is_admin());

drop policy if exists "Admin atualiza pranchas" on storage.objects;
create policy "Admin atualiza pranchas"
  on storage.objects for update to authenticated
  using (bucket_id = 'pranchas' and public.is_admin());

drop policy if exists "Admin remove pranchas" on storage.objects;
create policy "Admin remove pranchas"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pranchas' and public.is_admin());

drop policy if exists "Cliente baixa pranchas do seu projeto" on storage.objects;
create policy "Cliente baixa pranchas do seu projeto"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pranchas' and (
      public.is_admin()
      or exists (
        select 1 from public.projects p
        where p.id::text = (storage.foldername(name))[1]
          and p.client_id = auth.uid()
      )
    )
  );

-- ---------- 4. Orçamentos: admin lê, formulário público continua inserindo ----------
alter table public."Orçamentos" enable row level security;

drop policy if exists "Qualquer um envia orçamento" on public."Orçamentos";
create policy "Qualquer um envia orçamento"
  on public."Orçamentos" for insert to anon, authenticated
  with check (true);

drop policy if exists "Admin lê orçamentos" on public."Orçamentos";
create policy "Admin lê orçamentos"
  on public."Orçamentos" for select to authenticated
  using (public.is_admin());
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP tool `mcp__supabase__apply_migration` with name `pranchas` and the SQL above. If MCP is unavailable, run the SQL in the Supabase dashboard SQL editor.

- [ ] **Step 3: Verify**

Run via `mcp__supabase__execute_sql` (or SQL editor):

```sql
select column_name from information_schema.columns where table_schema='public' and table_name='pranchas' order by ordinal_position;
select id, public from storage.buckets where id = 'pranchas';
select column_name from information_schema.columns where table_schema='public' and table_name='Orçamentos';
```

Expected: 8 pranchas columns as defined; bucket row with `public = false`; `Orçamentos` includes a `created_at` column (needed by Task 10 — if the column has a different name, note it and adjust `buildLeadsData` usage in Task 11 accordingly).

Also verify the quote form still works: with the anon key, `insert into "Orçamentos"` must succeed (policy above allows it). Quick check: run the site (`npm run dev`), submit the `/orcamento` form, confirm no console error from Supabase.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260704_pranchas.sql
git commit -m "feat: tabela e bucket de pranchas com RLS + leitura de orçamentos para admin"
```

---

### Task 2: `src/lib/pranchas.ts` — constantes e helpers puros (TDD)

**Files:**
- Create: `src/lib/pranchas.ts`
- Test: `src/lib/pranchas.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (used by Tasks 3, 7, 8):
  - `DISCIPLINES: readonly { slug, label }[]`, `type DisciplineSlug`
  - `interface Prancha { id: string; project_id: string; discipline: DisciplineSlug; name: string; file_path: string; file_type: "pdf" | "dwg"; size_bytes: number | null; created_at: string }`
  - `MAX_PRANCHA_BYTES: number`
  - `fileTypeFromName(filename: string): "pdf" | "dwg" | null`
  - `validatePranchaFile(file: { name: string; size: number }): string | null` (mensagem de erro ou null)
  - `fmtBytes(bytes: number | null): string`
  - `groupByDiscipline(pranchas: Prancha[]): { slug: DisciplineSlug; label: string; items: Prancha[] }[]` (só grupos não vazios, na ordem de DISCIPLINES)
  - `pranchaStoragePath(projectId: string, discipline: DisciplineSlug, filename: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/pranchas.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/pranchas.test.ts`
Expected: FAIL — cannot resolve `./pranchas`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/pranchas.ts
// Domínio das pranchas: disciplinas, validação de arquivo e agrupamento.
// Os slugs precisam bater com o check constraint da tabela public.pranchas.

export const DISCIPLINES = [
  { slug: "arquitetonico",   label: "Arquitetônico" },
  { slug: "estrutural",      label: "Estrutural" },
  { slug: "eletrico",        label: "Elétrico" },
  { slug: "hidrossanitario", label: "Hidrossanitário" },
  { slug: "outros",          label: "Outros" },
] as const;

export type DisciplineSlug = (typeof DISCIPLINES)[number]["slug"];

export interface Prancha {
  id: string;
  project_id: string;
  discipline: DisciplineSlug;
  name: string;
  file_path: string;
  file_type: "pdf" | "dwg";
  size_bytes: number | null;
  created_at: string;
}

export const MAX_PRANCHA_BYTES = 50 * 1024 * 1024; // 50 MB

export function fileTypeFromName(filename: string): "pdf" | "dwg" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".dwg")) return "dwg";
  return null;
}

export function validatePranchaFile(file: { name: string; size: number }): string | null {
  if (!fileTypeFromName(file.name)) return "Apenas arquivos PDF ou DWG são aceitos.";
  if (file.size > MAX_PRANCHA_BYTES) {
    return `Arquivo muito grande. Limite: 50 MB (arquivo: ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

export function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function groupByDiscipline(pranchas: Prancha[]) {
  return DISCIPLINES
    .map(d => ({ slug: d.slug, label: d.label, items: pranchas.filter(p => p.discipline === d.slug) }))
    .filter(g => g.items.length > 0);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Prefixo com timestamp evita colisão de nomes iguais no mesmo projeto.
export function pranchaStoragePath(projectId: string, discipline: DisciplineSlug, filename: string): string {
  const ext = fileTypeFromName(filename) ?? "pdf";
  const base = slugify(filename.replace(/\.[^.]+$/, ""));
  return `${projectId}/${discipline}/${Date.now()}-${base}.${ext}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/pranchas.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pranchas.ts src/lib/pranchas.test.ts
git commit -m "feat: helpers de domínio das pranchas (disciplinas, validação, agrupamento)"
```

---

### Task 3: Hook `usePranchas`

**Files:**
- Create: `src/hooks/data/usePranchas.ts`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`; `Prancha`, `DisciplineSlug`, `validatePranchaFile`, `fileTypeFromName`, `pranchaStoragePath` from `@/lib/pranchas` (Task 2).
- Produces (used by Tasks 7 and 8): `usePranchas(projectId: string | null | undefined)` returning `{ pranchas: Prancha[]; loading: boolean; uploading: boolean; refetch(): Promise<void>; upload(file: File, discipline: DisciplineSlug, name: string): Promise<{ error: string | null }>; remove(prancha: Prancha): Promise<{ error: string | null }>; getDownloadUrl(prancha: Prancha): Promise<string | null> }`.

- [ ] **Step 1: Write the hook** (pure-logic pieces are tested in Task 2; this hook is thin Supabase I/O following the existing `useUpdates`/`useProjectIfc` pattern, verified end-to-end in Tasks 7–8)

```ts
// src/hooks/data/usePranchas.ts
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  type Prancha, type DisciplineSlug,
  validatePranchaFile, fileTypeFromName, pranchaStoragePath,
} from "@/lib/pranchas";

const BUCKET = "pranchas";

export function usePranchas(projectId: string | null | undefined) {
  const [pranchas, setPranchas] = useState<Prancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetch = useCallback(async () => {
    if (!projectId) { setPranchas([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("pranchas")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setPranchas((data as Prancha[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function upload(file: File, discipline: DisciplineSlug, name: string): Promise<{ error: string | null }> {
    if (!projectId) return { error: "Projeto inválido." };
    const invalid = validatePranchaFile(file);
    if (invalid) return { error: invalid };

    setUploading(true);
    try {
      const path = pranchaStoragePath(projectId, discipline, file.name);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) return { error: upErr.message };

      const { data, error: dbErr } = await supabase
        .from("pranchas")
        .insert({
          project_id: projectId,
          discipline,
          name: name.trim() || file.name,
          file_path: path,
          file_type: fileTypeFromName(file.name)!,
          size_bytes: file.size,
        })
        .select()
        .single();
      if (dbErr) {
        // registro falhou: não deixa arquivo órfão no bucket
        await supabase.storage.from(BUCKET).remove([path]);
        return { error: dbErr.message };
      }
      setPranchas(prev => [data as Prancha, ...prev]);
      return { error: null };
    } finally {
      setUploading(false);
    }
  }

  async function remove(prancha: Prancha): Promise<{ error: string | null }> {
    const { error: stErr } = await supabase.storage.from(BUCKET).remove([prancha.file_path]);
    if (stErr) return { error: stErr.message };
    const { error: dbErr } = await supabase.from("pranchas").delete().eq("id", prancha.id);
    if (!dbErr) setPranchas(prev => prev.filter(p => p.id !== prancha.id));
    return { error: dbErr?.message ?? null };
  }

  async function getDownloadUrl(prancha: Prancha): Promise<string | null> {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(prancha.file_path, 60, { download: `${prancha.name}.${prancha.file_type}` });
    return data?.signedUrl ?? null;
  }

  return { pranchas, loading, uploading, refetch: fetch, upload, remove, getDownloadUrl };
}
```

- [ ] **Step 2: Verify it compiles and lints**

Run: `npm run lint && npm run build`
Expected: no errors (warnings pré-existentes ok).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/data/usePranchas.ts
git commit -m "feat: hook usePranchas (lista, upload, remoção, signed URL)"
```

---

### Task 4: `useEnhanceText` + prompts + refactor do formulário de orçamento (TDD)

**Files:**
- Create: `src/hooks/data/useEnhanceText.ts`
- Create: `src/lib/enhancePrompts.ts`
- Modify: `src/components/sections/GetStarted.tsx:20-65` (substitui `handleEnhance`)
- Test: `src/hooks/data/useEnhanceText.test.ts`

**Interfaces:**
- Consumes: `toast` from `sonner`; `import.meta.env.VITE_GROQ_API_KEY`.
- Produces (used by Task 9):
  - `useEnhanceText(systemPrompt: string)` → `{ enhance(text: string): Promise<string | null>; isEnhancing: boolean }` — retorna o texto melhorado ou `null` (erro já mostrado via toast).
  - `ENHANCE_QUOTE_PROMPT`, `ENHANCE_MURAL_PROMPT`, `ENHANCE_UPDATE_PROMPT` (strings) em `@/lib/enhancePrompts`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/hooks/data/useEnhanceText.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useEnhanceText } from "./useEnhanceText";
import { toast } from "sonner";

describe("useEnhanceText", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GROQ_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("retorna o texto melhorado e envia o system prompt", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "  texto melhorado  " } }] }),
    });
    const { result } = renderHook(() => useEnhanceText("PROMPT DE TESTE"));
    let out: string | null = null;
    await act(async () => { out = await result.current.enhance("texto original"); });
    expect(out).toBe("texto melhorado");
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "PROMPT DE TESTE" });
    expect(body.messages[1]).toEqual({ role: "user", content: "texto original" });
  });

  it("retorna null e mostra toast quando a API falha", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    const { result } = renderHook(() => useEnhanceText("p"));
    let out: string | null = "x";
    await act(async () => { out = await result.current.enhance("abc"); });
    expect(out).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it("não chama a API com texto vazio", async () => {
    const { result } = renderHook(() => useEnhanceText("p"));
    await act(async () => { await result.current.enhance("   "); });
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/data/useEnhanceText.test.ts`
Expected: FAIL — cannot resolve `./useEnhanceText`.

- [ ] **Step 3: Write the hook and the prompts**

```ts
// src/hooks/data/useEnhanceText.ts
import { useState } from "react";
import { toast } from "sonner";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Botão "Melhorar com IA": reescreve um texto com o tom definido pelo
// systemPrompt. Retorna o texto novo ou null (erro já notificado via toast).
export function useEnhanceText(systemPrompt: string) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  async function enhance(text: string): Promise<string | null> {
    if (!text.trim()) return null;
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      toast.error("Chave da API do Groq não configurada.");
      return null;
    }
    setIsEnhancing(true);
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });
      if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
      const data = await response.json();
      const out = data.choices?.[0]?.message?.content?.trim();
      if (!out) throw new Error("Resposta vazia da IA");
      return out;
    } catch (err) {
      console.error("Erro ao melhorar texto com IA:", err);
      toast.error("Não foi possível melhorar o texto agora. Tente novamente.");
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }

  return { enhance, isEnhancing };
}
```

```ts
// src/lib/enhancePrompts.ts
// System prompts do botão "Melhorar com IA" — um tom por contexto.

export const ENHANCE_QUOTE_PROMPT =
  "Você é um assistente técnico de engenharia civil. O usuário vai lhe passar uma descrição de um projeto residencial que ele deseja orçar. Você deve reescrever essa descrição de forma clara, técnica, muito profissional e objetiva, mantendo todas as informações cruciais. Apenas devolva o texto refinado, nada mais. Mantenha em primeira pessoa (se o usuário usou).";

export const ENHANCE_MURAL_PROMPT =
  "Você é um assistente de comunicação interna de um escritório de engenharia e arquitetura. Reescreva a publicação abaixo para o mural interno da equipe: clara, coesa, objetiva e com tom profissional porém próximo. Preserve todas as informações técnicas, nomes, prazos e menções (@nome). Apenas devolva o texto reescrito, nada mais.";

export const ENHANCE_UPDATE_PROMPT =
  "Você é o responsável pela comunicação com clientes de um escritório de engenharia e arquitetura. Reescreva a atualização de projeto abaixo, que será lida pelo cliente no portal: clara, profissional, cordial e transparente, sem jargão desnecessário. Preserve todas as informações técnicas e prazos. Apenas devolva o texto reescrito, nada mais.";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/data/useEnhanceText.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor `GetStarted.tsx` to use the hook**

In `src/components/sections/GetStarted.tsx`:

1. Add imports at top:
```ts
import { useEnhanceText } from "@/hooks/data/useEnhanceText";
import { ENHANCE_QUOTE_PROMPT } from "@/lib/enhancePrompts";
```
2. Delete the whole current block from `const handleEnhance = async () => {` down to its closing `};` (lines 20–65) **and** the `const [isEnhancing, setIsEnhancing] = useState(false);` state declaration near the top of the component. Replace with:
```ts
const { enhance, isEnhancing } = useEnhanceText(ENHANCE_QUOTE_PROMPT);

const handleEnhance = async () => {
  const improved = await enhance(message);
  if (improved) setMessage(improved);
};
```
The button JSX (lines ~204–213) stays unchanged — it already reads `isEnhancing` and calls `handleEnhance`.

- [ ] **Step 6: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all tests PASS, no lint/build errors.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/data/useEnhanceText.ts src/hooks/data/useEnhanceText.test.ts src/lib/enhancePrompts.ts src/components/sections/GetStarted.tsx
git commit -m "feat: hook useEnhanceText reutilizável e refactor do formulário de orçamento"
```

---

### Task 5: Extrair abas do drawer para componentes

**Files:**
- Create: `src/components/hq/project-detail/MilestonesTab.tsx`
- Create: `src/components/hq/project-detail/UpdatesTab.tsx`
- Create: `src/components/hq/project-detail/BimTab.tsx`
- Modify: `src/components/hq/HqProjectDrawer.tsx` (passa a importar os componentes)

**Interfaces:**
- Consumes: existing code in `src/components/hq/HqProjectDrawer.tsx` (this is a mechanical move — copy verbatim, do not rewrite logic).
- Produces (used by Task 6):
  - `export default function MilestonesTab({ projectId }: { projectId: string })`
  - `export default function UpdatesTab({ projectId, authorName }: { projectId: string; authorName: string })`
  - `export default function BimTab({ project }: { project: Project })` (`Project` from `@/hooks/data/useProjects`)

- [ ] **Step 1: Create `MilestonesTab.tsx`**

Copy verbatim from `HqProjectDrawer.tsx`: the `fmtDate` helper (lines 20–22), the `MILESTONE_STATUS`, `MILESTONE_STATUS_LABELS`, `MILESTONE_STATUS_COLORS`, `MILESTONE_ICONS` constants (lines 24–39), and the whole `MilestonesTab` function (lines 49–302). File header:

```tsx
// src/components/hq/project-detail/MilestonesTab.tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Plus, Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useMilestones, calcProgress } from "@/hooks/data/useMilestones";
import type { Milestone } from "@/hooks/data/useMilestones";
```

Change `function MilestonesTab` → `export default function MilestonesTab`. Body unchanged.

- [ ] **Step 2: Create `UpdatesTab.tsx`**

Copy verbatim: `fmtDate` (lines 20–22), `UPDATE_COLORS` (lines 41–45), and the `UpdatesTab` function (lines 306–451). Header:

```tsx
// src/components/hq/project-detail/UpdatesTab.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useUpdates } from "@/hooks/data/useUpdates";
import UpdateComments from "@/components/updates/UpdateComments";
```

Change to `export default function UpdatesTab`.

- [ ] **Step 3: Create `BimTab.tsx`**

Copy verbatim the `BimTab` function (lines 455–637). Header:

```tsx
// src/components/hq/project-detail/BimTab.tsx
import { useState, useRef } from "react";
import { Box, Upload, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/hooks/data/useProjects";
import { useProjectIfc, storagePath } from "@/hooks/data/useProjectIfc";
```

Change to `export default function BimTab`.

- [ ] **Step 4: Shrink the drawer to consume the components**

Replace the entire content of `src/components/hq/HqProjectDrawer.tsx` with:

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Flag, Bell, Box, Lock } from "lucide-react";
import type { Project } from "@/hooks/data/useProjects";
import MilestonesTab from "@/components/hq/project-detail/MilestonesTab";
import UpdatesTab from "@/components/hq/project-detail/UpdatesTab";
import BimTab from "@/components/hq/project-detail/BimTab";

const isSeed = (id: string) => id.startsWith("seed-");

interface Props {
  project: Project | null;
  onClose: () => void;
}

const TABS = [
  { id: "milestones", label: "Marcos",       icon: Flag },
  { id: "updates",    label: "Atualizações", icon: Bell },
  { id: "bim",        label: "Modelo BIM",   icon: Box  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function HqProjectDrawer({ project, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("milestones");
  const seed = project ? isSeed(project.id) : false;

  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white dark:bg-[#0f172a] border-l border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl ${project.color} flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0`}>
                  {project.name[0]}
                </div>
                <div className="min-w-0">
                  <h2 className="font-black text-navy dark:text-white text-base leading-tight truncate">{project.name}</h2>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {project.client?.display_name ?? "Sem cliente"} · {project.progress}% concluído
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-navy dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors shrink-0 ml-2">
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 dark:border-white/10 shrink-0 px-2">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors border-b-2 -mb-px ${
                      tab === t.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-zinc-500 hover:text-navy dark:hover:text-white"
                    }`}
                  >
                    <Icon size={13} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {seed ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-zinc-400">
                  <Lock size={36} className="opacity-20" />
                  <p className="text-sm font-bold text-navy dark:text-zinc-300">Projeto de exemplo</p>
                  <p className="text-xs max-w-[240px]">
                    Crie um projeto real vinculado a um cliente para gerenciar marcos e atualizações.
                  </p>
                </div>
              ) : tab === "milestones" ? (
                <MilestonesTab projectId={project.id} />
              ) : tab === "updates" ? (
                <UpdatesTab projectId={project.id} authorName="Admin" />
              ) : (
                <BimTab project={project} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build && npx vitest run`
Expected: clean. Then `npm run dev`, open `/hq/projects`, click a project — drawer must behave exactly as before (marcos, atualizações, BIM).

- [ ] **Step 6: Commit**

```bash
git add src/components/hq/project-detail src/components/hq/HqProjectDrawer.tsx
git commit -m "refactor: extrai abas do drawer de projeto para componentes reutilizáveis"
```

---

### Task 6: Página `/hq/projects/:id` + navegação + remoção do drawer

**Files:**
- Create: `src/pages/hq/HqProjectDetail.tsx`
- Create: `src/components/hq/project-detail/OverviewTab.tsx`
- Modify: `src/App.tsx` (lazy import + rota)
- Modify: `src/pages/hq/HqProjects.tsx` (navega em vez de abrir drawer)
- Delete: `src/components/hq/HqProjectDrawer.tsx`

**Interfaces:**
- Consumes: `MilestonesTab`, `UpdatesTab`, `BimTab` (Task 5); `Project` type; `supabase`.
- Produces: route `/hq/projects/:id`; `OverviewTab({ project, onSaved }: { project: Project; onSaved: (changes: Partial<Project>) => void })`. Task 7 will add a "pranchas" tab to this page's `TABS` array.

- [ ] **Step 1: Create `OverviewTab.tsx`**

```tsx
// src/components/hq/project-detail/OverviewTab.tsx
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/hooks/data/useProjects";

const TYPES = ["Executivo Completo","Arq. e Interiores","Estrutural e Fundações","Projeto Legal + Exec.","Arquitetura Comercial","Executivo + BIM","Projeto Completo","Arquitetura e Elétrico"];

interface ClientOption { id: string; display_name: string; email: string; }

export default function OverviewTab({ project, onSaved }: {
  project: Project;
  onSaved: (changes: Partial<Project>) => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    client_id: project.client_id ?? "",
    type: project.type,
    status: project.status,
    priority: project.priority,
    end_date: project.end_date ?? "",
    description: project.description ?? "",
  });

  useEffect(() => {
    supabase.from("profiles").select("id,display_name,email").eq("role", "client").then(({ data }) => {
      setClients((data as ClientOption[]) ?? []);
    });
  }, []);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Informe o nome do projeto."); return; }
    setSaving(true);
    const changes: Partial<Project> = {
      name: form.name.trim(),
      client_id: form.client_id || null,
      type: form.type,
      status: form.status,
      priority: form.priority,
      end_date: form.end_date || null,
      description: form.description.trim() || null,
    };
    const { error } = await supabase.from("projects").update(changes).eq("id", project.id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar projeto."); return; }
    toast.success("Projeto atualizado.");
    onSaved(changes);
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-4">
      {/* Progresso derivado dos marcos (somente leitura) */}
      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3">
        <div className="flex justify-between text-[11px] font-bold text-zinc-500 mb-1.5">
          <span>Progresso (calculado pelos marcos)</span>
          <span className="text-navy dark:text-white">{project.progress}%</span>
        </div>
        <div className="w-full h-2 bg-zinc-200 dark:bg-black/30 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${project.progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome do Projeto" className="sm:col-span-2">
          <input value={form.name} onChange={e => set("name", e.target.value)} className="detail-input" />
        </Field>

        <Field label="Cliente (portal de acesso)" className="sm:col-span-2">
          <select value={form.client_id} onChange={e => set("client_id", e.target.value)} className="detail-input">
            <option value="">— Sem vínculo —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.display_name} ({c.email})</option>)}
          </select>
          <p className="text-[10px] text-zinc-400 mt-1">O cliente selecionado vê este projeto, suas pranchas e atualizações no portal.</p>
        </Field>

        <Field label="Tipo de Serviço">
          <select value={form.type} onChange={e => set("type", e.target.value)} className="detail-input">
            {!TYPES.includes(form.type) && <option value={form.type}>{form.type}</option>}
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Data de Entrega">
          <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className="detail-input" />
        </Field>

        <Field label="Status">
          <select value={form.status} onChange={e => set("status", e.target.value as Project["status"])} className="detail-input">
            <option>Em Andamento</option>
            <option>Revisão</option>
            <option>Concluído</option>
            <option>Pausado</option>
          </select>
        </Field>

        <Field label="Prioridade">
          <select value={form.priority} onChange={e => set("priority", e.target.value as Project["priority"])} className="detail-input">
            <option>Alta</option>
            <option>Média</option>
            <option>Baixa</option>
          </select>
        </Field>

        <Field label="Descrição" className="sm:col-span-2">
          <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} className="detail-input resize-none" />
        </Field>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="flex items-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-500/20 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <style>{`
        :where(.detail-input) { width:100%;background:rgb(249 250 251);border:1px solid rgb(228 228 231);border-radius:.625rem;padding:.5rem .75rem;font-size:.875rem;color:rgb(15 23 42);outline:none;transition:border-color 150ms; }
        :where(.detail-input:focus) { border-color:rgb(37 99 235); }
        :where(.dark .detail-input) { background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.10);color:white; }
        :where(.dark .detail-input option) { background:#111827; }
      `}</style>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-bold text-navy dark:text-zinc-300 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
```

- [ ] **Step 2: Create `HqProjectDetail.tsx`**

```tsx
// src/pages/hq/HqProjectDetail.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Flag, Bell, Box, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/hooks/data/useProjects";
import OverviewTab from "@/components/hq/project-detail/OverviewTab";
import MilestonesTab from "@/components/hq/project-detail/MilestonesTab";
import UpdatesTab from "@/components/hq/project-detail/UpdatesTab";
import BimTab from "@/components/hq/project-detail/BimTab";

const TABS = [
  { id: "overview",   label: "Visão Geral",  icon: Info },
  { id: "milestones", label: "Marcos",       icon: Flag },
  { id: "updates",    label: "Atualizações", icon: Bell },
  { id: "bim",        label: "Modelo BIM",   icon: Box  },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_COLORS: Record<string, string> = {
  "Em Andamento": "text-blue-600  dark:text-blue-400  bg-blue-50  dark:bg-blue-500/10",
  "Revisão":      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
  "Concluído":    "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10",
  "Pausado":      "text-zinc-500  dark:text-zinc-400  bg-zinc-100 dark:bg-white/5",
};

export default function HqProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase
      .from("projects")
      .select("*, client:profiles!projects_client_id_fkey(display_name,email)")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setProject(data as Project | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-zinc-400">
        <Loader2 size={20} className="animate-spin" /> Carregando projeto...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-24 text-zinc-400 space-y-3">
        <p className="text-sm font-bold text-navy dark:text-zinc-300">Projeto não encontrado.</p>
        <Link to="/hq/projects" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
          <ArrowLeft size={15} /> Voltar aos projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/hq/projects" className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft size={13} /> Projetos
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl ${project.color} flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0`}>
            {project.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-navy dark:text-white leading-tight">{project.name}</h1>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[project.status] ?? ""}`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {project.client?.display_name ?? "Sem cliente vinculado"} · {project.type} · {project.progress}% concluído
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-white/10 overflow-x-auto scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-navy dark:hover:text-white"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div className="pb-8">
        {tab === "overview" && (
          <OverviewTab project={project} onSaved={changes => setProject(p => (p ? { ...p, ...changes } : p))} />
        )}
        {tab === "milestones" && <MilestonesTab projectId={project.id} />}
        {tab === "updates" && <UpdatesTab projectId={project.id} authorName="Admin" />}
        {tab === "bim" && <BimTab project={project} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Register the route in `src/App.tsx`**

Add lazy import next to the other HQ imports:
```ts
const HqProjectDetail = lazy(() => import("./pages/hq/HqProjectDetail"));
```
Add the route inside the `/hq` block, right after `<Route path="projects" ...>`:
```tsx
<Route path="projects/:id" element={<HqProjectDetail />} />
```

- [ ] **Step 4: Navigate from the projects list and delete the drawer**

In `src/pages/hq/HqProjects.tsx`:
1. Add `useNavigate` to the react-router-dom import: `import { useSearchParams, useNavigate } from "react-router-dom";`
2. Remove the import `import HqProjectDrawer from "@/components/hq/HqProjectDrawer";`
3. Inside `HqProjects()`: add `const navigate = useNavigate();` and delete the line `const [drawerProj, setDrawerProj] = useState<Project | null>(null);`
4. Replace both occurrences of `onClick={() => setDrawerProj(proj)}` with `onClick={() => navigate(\`/hq/projects/${proj.id}\`)}`
5. Delete the line `<HqProjectDrawer project={drawerProj} onClose={() => setDrawerProj(null)} />`

Then delete the file:
```bash
git rm src/components/hq/HqProjectDrawer.tsx
```

- [ ] **Step 5: Verify**

Run: `npm run lint && npm run build && npx vitest run`
Expected: clean; no dangling imports of `HqProjectDrawer` (`grep -rn "HqProjectDrawer" src` returns nothing).
Manual: `npm run dev` → `/hq/projects` → click card → detail page opens with all 4 tabs working; browser back returns to list; invalid id (`/hq/projects/xyz`) shows "Projeto não encontrado".

- [ ] **Step 6: Commit**

```bash
git add -A src
git commit -m "feat: página de projeto /hq/projects/:id com abas substitui o drawer"
```

---

### Task 7: Aba Pranchas no admin

**Files:**
- Create: `src/components/hq/project-detail/PranchasTab.tsx`
- Modify: `src/pages/hq/HqProjectDetail.tsx` (registra a aba)

**Interfaces:**
- Consumes: `usePranchas` (Task 3); `DISCIPLINES`, `fmtBytes`, `groupByDiscipline`, `validatePranchaFile`, `DisciplineSlug` (Task 2).
- Produces: `export default function PranchasTab({ projectId }: { projectId: string })`.

- [ ] **Step 1: Create `PranchasTab.tsx`**

```tsx
// src/components/hq/project-detail/PranchasTab.tsx
import { useRef, useState } from "react";
import { FileText, Upload, Trash2, Loader2, Layers, Download } from "lucide-react";
import { toast } from "sonner";
import { usePranchas } from "@/hooks/data/usePranchas";
import {
  DISCIPLINES, fmtBytes, groupByDiscipline, validatePranchaFile,
  type DisciplineSlug, type Prancha,
} from "@/lib/pranchas";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

export default function PranchasTab({ projectId }: { projectId: string }) {
  const { pranchas, loading, uploading, upload, remove, getDownloadUrl } = usePranchas(projectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [discipline, setDiscipline] = useState<DisciplineSlug>("arquitetonico");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const groups = groupByDiscipline(pranchas);
  const fileError = file ? validatePranchaFile(file) : null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
    e.target.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    const { error } = await upload(file, discipline, name);
    if (error) { toast.error(error); return; }
    toast.success("Prancha publicada. O cliente já pode baixá-la no portal.");
    setFile(null);
    setName("");
  }

  async function handleRemove(p: Prancha) {
    setRemoving(p.id);
    const { error } = await remove(p);
    setRemoving(null);
    setConfirmDelete(null);
    if (error) toast.error(`Erro ao remover: ${error}`);
    else toast.success("Prancha removida.");
  }

  async function handleDownload(p: Prancha) {
    const url = await getDownloadUrl(p);
    if (!url) { toast.error("Não foi possível gerar o link de download."); return; }
    window.open(url, "_blank");
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <input ref={fileInputRef} type="file" accept=".pdf,.dwg" onChange={handleFileSelect} className="hidden" />

      {/* Formulário de upload */}
      <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-navy dark:text-white">Publicar nova prancha</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold text-zinc-500 block mb-1">Disciplina</span>
            <select
              value={discipline}
              onChange={e => setDiscipline(e.target.value as DisciplineSlug)}
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
            >
              {DISCIPLINES.map(d => <option key={d.slug} value={d.slug}>{d.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-zinc-500 block mb-1">Nome de exibição</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex: PR-01 Planta Baixa Térreo"
              className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>

        {!file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-zinc-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group"
          >
            <Upload size={18} className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs font-bold text-navy dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Selecionar arquivo</span>
            <span className="text-[10px] text-zinc-400">PDF ou DWG · Máx. 50 MB</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5">
            <FileText size={18} className="text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy dark:text-white truncate">{file.name}</p>
              <p className="text-[11px] text-zinc-500">
                {fmtBytes(file.size)}
                {fileError && <span className="text-red-500 ml-1 font-bold">— {fileError}</span>}
              </p>
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !!fileError}
              className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Enviando..." : "Publicar"}
            </button>
            <button
              onClick={() => setFile(null)}
              disabled={uploading}
              className="text-xs font-bold px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Lista agrupada */}
      {loading && (
        <div className="flex items-center justify-center py-10 gap-2 text-zinc-400">
          <Loader2 size={16} className="animate-spin" /> Carregando pranchas...
        </div>
      )}

      {!loading && pranchas.length === 0 && (
        <div className="text-center py-10 text-zinc-400">
          <Layers size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nenhuma prancha publicada ainda.</p>
        </div>
      )}

      {!loading && groups.map(g => (
        <div key={g.slug}>
          <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-2">
            {g.label} · {g.items.length}
          </p>
          <div className="space-y-2">
            {g.items.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 group">
                <FileText size={17} className="text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy dark:text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-zinc-500">{fmtDate(p.created_at)} · {fmtBytes(p.size_bytes)}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  p.file_type === "pdf"
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  {p.file_type.toUpperCase()}
                </span>
                <button
                  onClick={() => handleDownload(p)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors shrink-0"
                  title="Baixar"
                >
                  <Download size={14} />
                </button>
                {confirmDelete === p.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleRemove(p)}
                      disabled={removing === p.id}
                      className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {removing === p.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Remover
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[11px] font-bold px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(p.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Register the tab in `HqProjectDetail.tsx`**

1. Add imports: `import { Layers } from "lucide-react";` (merge into the existing lucide import) and `import PranchasTab from "@/components/hq/project-detail/PranchasTab";`
2. In `TABS`, insert between "updates" and "bim":
```ts
{ id: "pranchas", label: "Pranchas", icon: Layers },
```
3. In the tab content block, add:
```tsx
{tab === "pranchas" && <PranchasTab projectId={project.id} />}
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Manual (`npm run dev`, logged in as admin): open a project → aba Pranchas → upload a small PDF → appears grouped under the chosen discipline → download works (signed URL opens) → remove works. Upload a `.png` → inline error "Apenas arquivos PDF ou DWG…".

- [ ] **Step 4: Commit**

```bash
git add src/components/hq/project-detail/PranchasTab.tsx src/pages/hq/HqProjectDetail.tsx
git commit -m "feat: aba Pranchas na página de projeto do admin (upload, download, remoção)"
```

---

### Task 8: Página Pranchas do cliente + navegação do portal

**Files:**
- Create: `src/pages/portal/Pranchas.tsx`
- Modify: `src/App.tsx` (lazy import + rota `pranchas` no portal)
- Modify: `src/components/portal/PortalLayout.tsx` (NavItem na sidebar + aba mobile)

**Interfaces:**
- Consumes: `useClientProject` (existing: returns `{ project, loading }` for the logged client); `usePranchas` (Task 3); `groupByDiscipline`, `fmtBytes` (Task 2).
- Produces: route `/portal/pranchas`.

- [ ] **Step 1: Create `src/pages/portal/Pranchas.tsx`**

```tsx
// src/pages/portal/Pranchas.tsx
// Pranchas do projeto do cliente, agrupadas por disciplina, com download.
import { useState } from "react";
import { ChevronDown, Download, FileText, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useClientProject } from "@/hooks/data/useClientProject";
import { usePranchas } from "@/hooks/data/usePranchas";
import { fmtBytes, groupByDiscipline, type Prancha } from "@/lib/pranchas";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

export default function Pranchas() {
  const { project, loading: loadingProject } = useClientProject();
  const { pranchas, loading: loadingPranchas, getDownloadUrl } = usePranchas(project?.id);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<string | null>(null);

  const loading = loadingProject || loadingPranchas;
  const groups = groupByDiscipline(pranchas);

  async function handleDownload(p: Prancha) {
    setDownloading(p.id);
    const url = await getDownloadUrl(p);
    setDownloading(null);
    if (!url) { toast.error("Não foi possível gerar o link de download. Tente novamente."); return; }
    window.open(url, "_blank");
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-6">
        <span className="font-mono text-[10px] lg:text-xs uppercase tracking-widest text-zinc-500">Documentos do projeto</span>
        <h1 className="text-xl lg:text-3xl font-black text-navy dark:text-white mt-1">Pranchas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Arquivos oficiais do seu projeto, organizados por disciplina. Baixe em PDF ou DWG.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-zinc-400">
          <Loader2 size={20} className="animate-spin" /> Carregando pranchas...
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-white/10 text-zinc-400">
          <Layers size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold text-navy dark:text-zinc-300 mb-1">Nenhuma prancha publicada ainda</p>
          <p className="text-xs max-w-xs mx-auto">
            Assim que a equipe Vertice publicar as pranchas do seu projeto, elas aparecerão aqui para download.
          </p>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-3">
          {groups.map(g => {
            const isOpen = open[g.slug] ?? true;
            return (
              <div key={g.slug} className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpen(o => ({ ...o, [g.slug]: !isOpen }))}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Layers size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy dark:text-white">{g.label}</p>
                    <p className="text-[11px] text-zinc-500">{g.items.length} {g.items.length === 1 ? "prancha" : "pranchas"}</p>
                  </div>
                  <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-100 dark:border-white/5 divide-y divide-zinc-100 dark:divide-white/5">
                    {g.items.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <FileText size={17} className="text-zinc-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy dark:text-white truncate">{p.name}</p>
                          <p className="text-[11px] text-zinc-500">{fmtDate(p.created_at)} · {fmtBytes(p.size_bytes)}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          p.file_type === "pdf"
                            ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        }`}>
                          {p.file_type.toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleDownload(p)}
                          disabled={downloading === p.id}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 dark:border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                        >
                          {downloading === p.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                          Baixar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Route in `src/App.tsx`**

Add lazy import next to the other portal imports:
```ts
const Pranchas = lazy(() => import("./pages/portal/Pranchas"));
```
Add inside the `/portal` route block, after `updates`:
```tsx
<Route path="pranchas" element={<Pranchas />} />
```

- [ ] **Step 3: Navigation in `PortalLayout.tsx`**

1. Add `Layers` to the lucide-react import.
2. Sidebar — after the "Atualizações" NavItem:
```tsx
<NavItem icon={<Layers />} label="Pranchas" to="/portal/pranchas" />
```
3. MobileTabBar — insert before the "Perfil" tab:
```tsx
{ icon: <Layers size={20} />, label: "Pranchas", to: "/portal/pranchas" },
```
(5 tabs total; the bar flexes each to `flex-1`, still fits.)

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build && npx vitest run`
Manual: logged as client with a project that has pranchas (published in Task 7) → `/portal/pranchas` shows groups, download opens the file; empty project shows the friendly empty state. Confirm a client **cannot** list another project's pranchas (RLS): quick check via browser console `await supabase.from("pranchas").select("*")` returns only own rows.

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/Pranchas.tsx src/App.tsx src/components/portal/PortalLayout.tsx
git commit -m "feat: página Pranchas no portal do cliente com download por disciplina"
```

---

### Task 9: Botão "Melhorar com IA" no mural e nas atualizações do admin

**Files:**
- Modify: `src/components/hq/project-detail/UpdatesTab.tsx` (botão no textarea do form)
- Modify: `src/pages/hq/HqFeed.tsx` (botão no NewPostModal)

**Interfaces:**
- Consumes: `useEnhanceText`, `ENHANCE_UPDATE_PROMPT`, `ENHANCE_MURAL_PROMPT` (Task 4).
- Produces: nothing new.

- [ ] **Step 1: UpdatesTab — botão acima do textarea**

In `src/components/hq/project-detail/UpdatesTab.tsx`:

1. Add imports:
```ts
import { Sparkles } from "lucide-react"; // merge into existing lucide import
import { useEnhanceText } from "@/hooks/data/useEnhanceText";
import { ENHANCE_UPDATE_PROMPT } from "@/lib/enhancePrompts";
```
2. Inside `UpdatesTab`, after the `form` state:
```ts
const { enhance, isEnhancing } = useEnhanceText(ENHANCE_UPDATE_PROMPT);

async function handleEnhance() {
  const improved = await enhance(form.content);
  if (improved) setForm(f => ({ ...f, content: improved }));
}
```
3. Wrap the `<textarea …>` so a header row sits above it — replace the bare textarea with:
```tsx
<div>
  <div className="flex justify-end mb-1">
    <button
      type="button"
      onClick={handleEnhance}
      disabled={isEnhancing || !form.content.trim()}
      className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 transition-colors"
    >
      <Sparkles size={12} className={isEnhancing ? "animate-spin" : ""} />
      {isEnhancing ? "Melhorando..." : "Melhorar com IA"}
    </button>
  </div>
  <textarea
    ref={textRef}
    value={form.content}
    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
    rows={3}
    placeholder="Descreva a entrega (opcional)..."
    className="w-full bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500 resize-none"
  />
</div>
```

- [ ] **Step 2: HqFeed — botão no modal de nova publicação**

In `src/pages/hq/HqFeed.tsx`, inside `NewPostModal`:

1. Add imports at the top of the file:
```ts
// Sparkles já está importado de lucide-react neste arquivo
import { useEnhanceText } from "@/hooks/data/useEnhanceText";
import { ENHANCE_MURAL_PROMPT } from "@/lib/enhancePrompts";
```
2. Inside `NewPostModal`, after the `saving` state:
```ts
const { enhance, isEnhancing } = useEnhanceText(ENHANCE_MURAL_PROMPT);

async function handleEnhance() {
  const improved = await enhance(content);
  if (improved) setContent(improved);
}
```
3. Replace the "Conteúdo" label block header — change:
```tsx
<label className="block text-xs font-bold text-zinc-500 mb-1.5">Conteúdo</label>
```
to:
```tsx
<div className="flex items-center justify-between mb-1.5">
  <label className="block text-xs font-bold text-zinc-500">Conteúdo</label>
  <button
    type="button"
    onClick={handleEnhance}
    disabled={isEnhancing || !content.trim()}
    className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-40 transition-colors"
  >
    <Sparkles size={12} className={isEnhancing ? "animate-spin" : ""} />
    {isEnhancing ? "Melhorando..." : "Melhorar com IA"}
  </button>
</div>
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build && npx vitest run`
Manual: mural → nova publicação → escrever texto tosco → "Melhorar com IA" reescreve mantendo menções; projeto → aba Atualizações → mesmo comportamento no conteúdo. Botão desabilitado com texto vazio.

- [ ] **Step 4: Commit**

```bash
git add src/components/hq/project-detail/UpdatesTab.tsx src/pages/hq/HqFeed.tsx
git commit -m "feat: botão Melhorar com IA no mural e nas atualizações de projeto"
```

---

### Task 10: Helpers do dashboard (TDD)

**Files:**
- Create: `src/lib/hqDashboard.ts`
- Test: `src/lib/hqDashboard.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces (used by Task 11):
  - `interface DashProject { id: string; name: string; progress: number; status: string; end_date: string | null; color: string; created_at: string }`
  - `interface DashMilestone { id: string; name: string; status: "done" | "active" | "pending"; date: string | null; approved_at: string | null; project_id: string }`
  - `buildProgressData(projects: DashProject[]): { name: string; progress: number }[]` — só status "Em Andamento"/"Revisão", ordenado por progresso crescente, no máx. 8.
  - `buildFunnelData(milestones: DashMilestone[]): { stage: string; count: number }[]` — sempre os 4 estágios: Pendente, Em Andamento, Entregue, Aprovado (aprovado = `approved_at` preenchido; entregue = `done` sem aprovação).
  - `buildLeadsData(rows: { created_at: string }[], now?: Date): { name: string; value: number }[]` — últimos 12 meses incluindo o atual, rótulo "Jul/26".
  - `buildDeadlines(projects: DashProject[], milestones: DashMilestone[], now?: Date): { kind: "projeto" | "marco"; name: string; date: string; daysLeft: number }[]` — vencimentos nos próximos 30 dias (projetos não concluídos via `end_date`; marcos não aprovados/não done via `date`), ordenado por data.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/hqDashboard.test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/hqDashboard.test.ts`
Expected: FAIL — cannot resolve `./hqDashboard`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/hqDashboard.ts
// Agregações puras do dashboard HQ — testáveis sem Supabase.

export interface DashProject {
  id: string;
  name: string;
  progress: number;
  status: string;
  end_date: string | null;
  color: string;
  created_at: string;
}

export interface DashMilestone {
  id: string;
  name: string;
  status: "done" | "active" | "pending";
  date: string | null;
  approved_at: string | null;
  project_id: string;
}

const ACTIVE_STATUSES = ["Em Andamento", "Revisão"];

export function buildProgressData(projects: DashProject[]) {
  return projects
    .filter(p => ACTIVE_STATUSES.includes(p.status))
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 8)
    .map(p => ({ name: p.name, progress: p.progress }));
}

export function buildFunnelData(milestones: DashMilestone[]) {
  const counts = { pending: 0, active: 0, delivered: 0, approved: 0 };
  for (const m of milestones) {
    if (m.approved_at) counts.approved++;
    else if (m.status === "done") counts.delivered++;
    else if (m.status === "active") counts.active++;
    else counts.pending++;
  }
  return [
    { stage: "Pendente",     count: counts.pending },
    { stage: "Em Andamento", count: counts.active },
    { stage: "Entregue",     count: counts.delivered },
    { stage: "Aprovado",     count: counts.approved },
  ];
}

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export function buildLeadsData(rows: { created_at: string }[], now: Date = new Date()) {
  const buckets: { key: string; name: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({
      key,
      name: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      value: 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const row of rows) {
    const d = new Date(row.created_at);
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) buckets[i].value++;
  }
  return buckets.map(({ name, value }) => ({ name, value }));
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDeadlines(
  projects: DashProject[],
  milestones: DashMilestone[],
  now: Date = new Date(),
) {
  const horizon = now.getTime() + 30 * DAY_MS;

  const items: { kind: "projeto" | "marco"; name: string; date: string; daysLeft: number }[] = [];

  const inWindow = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= now.getTime() - DAY_MS && t <= horizon; // -1 dia: inclui "vence hoje"
  };

  for (const p of projects) {
    if (p.status === "Concluído" || !p.end_date || !inWindow(p.end_date)) continue;
    items.push({
      kind: "projeto",
      name: p.name,
      date: p.end_date,
      daysLeft: Math.max(0, Math.round((new Date(p.end_date).getTime() - now.getTime()) / DAY_MS)),
    });
  }

  for (const m of milestones) {
    if (m.approved_at || m.status === "done" || !m.date || !inWindow(m.date)) continue;
    items.push({
      kind: "marco",
      name: m.name,
      date: m.date,
      daysLeft: Math.max(0, Math.round((new Date(m.date).getTime() - now.getTime()) / DAY_MS)),
    });
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/hqDashboard.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hqDashboard.ts src/lib/hqDashboard.test.ts
git commit -m "feat: agregações puras do dashboard HQ (progresso, funil, leads, prazos)"
```

---

### Task 11: Reescrever `HqDashboard.tsx`

**Files:**
- Modify (full rewrite): `src/pages/hq/HqDashboard.tsx`

**Interfaces:**
- Consumes: everything from `@/lib/hqDashboard` (Task 10); recharts; `supabase`.
- Produces: nothing consumed by other tasks.
- Chart constraints (Global Constraints apply): mark hue `#3B82F6` everywhere, single series per chart, no legend needed (title names the series), direct value labels on bars, recessive grid, tooltip via `CustomTooltip`.

- [ ] **Step 1: Replace the entire file content**

```tsx
// src/pages/hq/HqDashboard.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, CheckSquare, Inbox, Clock, CalendarClock, Flag } from "lucide-react";
import { motion, useInView } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
  AreaChart, Area, LabelList,
} from "recharts";
import { supabase } from "@/lib/supabase";
import {
  buildProgressData, buildFunnelData, buildLeadsData, buildDeadlines,
  type DashProject, type DashMilestone,
} from "@/lib/hqDashboard";

// Única cor de marca dos gráficos — validada p/ contraste em light e dark.
const MARK = "#3B82F6";

// ── Dados ─────────────────────────────────────────────────────────────────────

interface DashData {
  clients: number;
  projects: DashProject[];
  milestones: DashMilestone[];
  leads: { created_at: string }[];
  loading: boolean;
}

function useDashData(): DashData {
  const [data, setData] = useState<DashData>({ clients: 0, projects: [], milestones: [], leads: [], loading: true });

  useEffect(() => {
    async function load() {
      const [
        { count: clientCount },
        { data: projects },
        { data: milestones },
        { data: leads },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
        supabase.from("projects").select("id, name, progress, status, end_date, color, created_at"),
        supabase.from("milestones").select("id, name, status, date, approved_at, project_id"),
        supabase.from("Orçamentos").select("created_at"),
      ]);
      setData({
        clients: clientCount ?? 0,
        projects: (projects ?? []) as DashProject[],
        milestones: (milestones ?? []) as DashMilestone[],
        leads: (leads ?? []) as { created_at: string }[],
        loading: false,
      });
    }
    load();
  }, []);

  return data;
}

// ── Contador animado ──────────────────────────────────────────────────────────

function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1200;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{display}{suffix}</span>;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipItem { name?: string; value?: number | string; color?: string }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipItem[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-navy border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      <p className="font-bold text-navy dark:text-white mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-zinc-600 dark:text-zinc-300">{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

// ── Card container ────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, delay, children }: {
  title: string; subtitle: string; delay: number; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 lg:p-6 shadow-sm flex flex-col"
    >
      <div className="mb-4">
        <h3 className="font-bold text-sm text-navy dark:text-white">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-2 text-zinc-400">
      <Inbox size={28} className="opacity-40" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

const colorMap: Record<string, string> = {
  blue:   "bg-blue-50   dark:bg-blue-500/10   text-blue-600",
  violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-600",
  amber:  "bg-amber-50  dark:bg-amber-500/10  text-amber-600",
  green:  "bg-green-50  dark:bg-green-500/10  text-green-600",
};

function fmtDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export default function HqDashboard() {
  const navigate = useNavigate();
  const { clients, projects, milestones, leads, loading } = useDashData();

  const progressData = buildProgressData(projects);
  const funnelData   = buildFunnelData(milestones);
  const leadsData    = buildLeadsData(leads);
  const deadlines    = buildDeadlines(projects, milestones);

  const now = new Date();
  const leadsThisMonth = leads.filter(l => {
    const d = new Date(l.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const awaitingApproval = milestones.filter(m => m.status === "done" && !m.approved_at).length;
  const activeProjects = projects.filter(p => p.status === "Em Andamento").length;

  const statCards = [
    { label: "Clientes Ativos",             value: clients,          icon: Users,       color: "blue" },
    { label: "Projetos em Andamento",       value: activeProjects,   icon: Briefcase,   color: "violet" },
    { label: "Marcos Aguardando Aprovação", value: awaitingApproval, icon: CheckSquare, color: "amber" },
    { label: "Orçamentos no Mês",           value: leadsThisMonth,   icon: Inbox,       color: "green" },
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[stat.color]}`}>
                <Icon size={20} />
              </div>
              <p className="text-lg lg:text-2xl font-black text-navy dark:text-white mb-1">
                {loading ? "—" : <AnimatedNumber target={stat.value} />}
              </p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Progresso por projeto — barras horizontais */}
        <ChartCard title="Progresso por Projeto" subtitle="Projetos ativos, do mais atrasado ao mais adiantado" delay={0.3}>
          {progressData.length === 0 ? (
            <EmptyChart label="Nenhum projeto ativo" />
          ) : (
            <div style={{ height: Math.max(200, progressData.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="progress" name="Progresso" fill={MARK} radius={[0, 4, 4, 0]} barSize={14}>
                    <LabelList dataKey="progress" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#71717a", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Funil de marcos */}
        <ChartCard title="Funil de Marcos" subtitle="Onde o trabalho está no pipeline de entregas" delay={0.35}>
          {milestones.length === 0 ? (
            <EmptyChart label="Nenhum marco cadastrado" />
          ) : (
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 20, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="count" name="Marcos" fill={MARK} radius={[4, 4, 0, 0]} barSize={36}>
                    <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "#71717a", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Leads por mês */}
        <ChartCard title="Orçamentos Recebidos" subtitle="Leads que chegaram pelo site nos últimos 12 meses" delay={0.4}>
          {leads.length === 0 ? (
            <EmptyChart label="Nenhum orçamento recebido ainda" />
          ) : (
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={leadsData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={MARK} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={MARK} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} dy={8} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Orçamentos" stroke={MARK} strokeWidth={2} fill="url(#leadsFill)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Prazos próximos */}
        <ChartCard title="Prazos Próximos" subtitle="Marcos e projetos vencendo nos próximos 30 dias" delay={0.45}>
          {deadlines.length === 0 ? (
            <EmptyChart label="Nada vencendo nos próximos 30 dias" />
          ) : (
            <div className="space-y-2">
              {deadlines.slice(0, 8).map((d, i) => (
                <motion.div
                  key={`${d.kind}-${d.name}-${d.date}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    d.kind === "marco" ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "bg-violet-50 dark:bg-violet-500/10 text-violet-600"
                  }`}>
                    {d.kind === "marco" ? <Flag size={14} /> : <Briefcase size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-navy dark:text-white truncate">{d.name}</p>
                    <p className="text-[10px] text-zinc-500 capitalize">{d.kind} · {fmtDeadline(d.date)}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${
                    d.daysLeft <= 7
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-zinc-100 dark:bg-white/5 text-zinc-500"
                  }`}>
                    {d.daysLeft <= 7 ? <Clock size={10} /> : <CalendarClock size={10} />}
                    {d.daysLeft === 0 ? "hoje" : `${d.daysLeft}d`}
                  </span>
                </motion.div>
              ))}
              <button
                onClick={() => navigate("/hq/projects")}
                className="mt-2 w-full text-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                Ver todos os projetos
              </button>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run lint && npm run build && npx vitest run`
Expected: clean; unused imports from the old file are gone (recharts `PieChart/Pie/Cell` no longer imported).
Manual (`npm run dev`, admin): dashboard shows 4 KPIs + 4 cards with real data; leads chart populated (RLS policy from Task 1); toggle dark/light — bars/line legible in both; each empty state renders when data missing. **Render it and look at it**: check label collisions on the horizontal bars with long project names (YAxis width 120 truncates — acceptable) and that nothing overflows on mobile width.

- [ ] **Step 3: Commit**

```bash
git add src/pages/hq/HqDashboard.tsx
git commit -m "feat: dashboard HQ com progresso por projeto, funil de marcos, leads e prazos"
```

---

### Task 12: Verificação final

**Files:** none new.

- [ ] **Step 1: Full suite**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 2: End-to-end manual pass** (`npm run dev`)

1. Admin: `/hq` dashboard renders charts; `/hq/projects` → click → detail page; edit Visão Geral e salvar; criar marco; publicar atualização usando "Melhorar com IA"; publicar prancha PDF; upload IFC intacto.
2. Cliente: login → `/portal/pranchas` lista e baixa a prancha; `/portal/updates` mostra a atualização.
3. Mural: nova publicação com "Melhorar com IA".
4. Site público: `/orcamento` → botão "Melhorar com IA" continua funcionando e o envio grava em `Orçamentos`.

- [ ] **Step 3: Commit any leftover fixes and stop**

Implementation complete — use superpowers:finishing-a-development-branch to decide merge/PR.
