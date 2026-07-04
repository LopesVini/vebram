# Design: Pranchas, IA nos formulários, Dashboard HQ e Página de Projeto

**Data:** 2026-07-04
**Status:** Aprovado

## Contexto

Quatro melhorias no portal (cliente + admin HQ):

1. Nova página **Pranchas** na área do cliente, com upload pelo admin.
2. Botão **"Melhorar com IA"** reutilizado no mural (The Vertice) e no formulário de atualizações do admin.
3. **Dashboard HQ repaginado** com gráficos úteis.
4. Painel de projeto do admin promovido de drawer estreito (~450px) para **página cheia** — é onde o admin alimenta a área do cliente.

Ordem de implementação: 4 → 1 → 2 → 3 (a página de projeto é a base das demais).

## 1. Página de projeto no admin (`/hq/projects/:id`)

- Nova rota `/hq/projects/:id` dentro de `HqLayout`, página `src/pages/hq/HqProjectDetail.tsx` (lazy, como as demais).
- Clicar num projeto em `HqProjects` navega para a página (o drawer `HqProjectDrawer.tsx` é removido; seu conteúdo migra para as abas).
- Cabeçalho: breadcrumb "Projetos / {nome}", status, progresso, cliente.
- Abas:
  - **Visão geral** — edição dos dados do projeto (nome, tipo, status, endereço, datas), cliente vinculado, progresso derivado (leitura; o trigger `trg_sync_project_progress` calcula).
  - **Marcos** — CRUD de milestones (lógica atual do drawer).
  - **Atualizações** — criação/lista de updates do projeto, com botão "Melhorar com IA" no textarea.
  - **Pranchas** — upload e gestão (seção 2 abaixo).
  - **BIM** — upload do `.ifc` (lógica atual de `useProjectIfc`).
- Segue o gating existente do `HqLayout` (admin only). Projeto inexistente/ID inválido → volta para `/hq/projects`.

## 2. Pranchas

### Banco

Tabela `public.pranchas`:

| coluna | tipo | notas |
|---|---|---|
| id | uuid pk default gen_random_uuid() | |
| project_id | uuid fk → projects(id) on delete cascade | |
| discipline | text not null | um de: `arquitetonico`, `estrutural`, `eletrico`, `hidrossanitario`, `outros` (check constraint) |
| name | text not null | nome de exibição, ex. "PR-01 Planta Baixa Térreo" |
| file_path | text not null | caminho no bucket |
| file_type | text not null | `pdf` \| `dwg` (check constraint) |
| size_bytes | bigint | |
| created_at | timestamptz default now() | |

RLS:
- `select`: dono do projeto (`projects.client_id = auth.uid()`) **ou** `is_admin()`.
- `insert/update/delete`: `is_admin()` apenas.

Migration em `supabase/migrations/`.

### Storage

- Bucket **privado** `pranchas` (diferente do `ifc-models`, que é público — prancha é documento do cliente).
- Caminho: `{projectId}/{discipline}/{filename}`.
- Policies: leitura para dono do projeto (join com `projects` pelo primeiro segmento do path) ou admin; escrita/remoção só admin.
- Download no cliente via `createSignedUrl` (validade curta, ex. 60s).
- Limite de upload: 50 MB por arquivo (mesmo teto do IFC). Formatos aceitos: `.pdf` e `.dwg` (validados no front pelo nome/extensão).

### Frontend

- Hook `src/hooks/data/usePranchas.ts` (padrão hand-rolled: `useState` + Supabase direto, optimistic updates): `list(projectId)`, `upload(file, discipline, name)`, `remove(id)`, `getDownloadUrl(prancha)`.
- Constante compartilhada de disciplinas (label pt-BR + slug) em `src/lib/pranchas.ts`.
- **Cliente** — rota `/portal/pranchas`, página `src/pages/portal/Pranchas.tsx`, link no menu do `PortalLayout`. Accordion por disciplina com contagem; cada linha: nome, badge PDF/DWG, tamanho formatado, botão baixar. Disciplinas vazias não aparecem. Estado vazio amigável quando não há pranchas.
- **Admin** — aba "Pranchas" da página de projeto: seletor de disciplina + input de arquivo + nome, lista agrupada, excluir com confirmação.

## 3. Botão "Melhorar com IA"

- Extrair a chamada Groq de `src/components/sections/GetStarted.tsx` para `src/hooks/data/useEnhanceText.ts`: `useEnhanceText(systemPrompt)` → `{ enhance(text): Promise<string>, isEnhancing }`. Mesmo modelo (`llama-3.3-70b-versatile`), `VITE_GROQ_API_KEY`, erros via toast (não `alert`).
- Três consumidores, cada um com system prompt próprio (pt-BR):
  1. **Formulário de orçamento** (`GetStarted.tsx`) — refatorado para o hook, comportamento idêntico ao atual.
  2. **Composer do mural** (`HqFeed.tsx`) — tom de comunicação interna de equipe, coeso e claro.
  3. **Formulário de atualização** (aba Atualizações da página de projeto) — comunicação com cliente: profissional, clara, positiva.
- Botão desabilitado com texto vazio; estado "Melhorando..." durante a chamada.

## 4. Dashboard HQ repaginado

`src/pages/hq/HqDashboard.tsx` reescrito. Recharts (já instalado).

- **KPIs no topo** (ajustados): clientes ativos, projetos em andamento, marcos aguardando aprovação, orçamentos no mês.
- **Progresso por projeto** — barras horizontais com % de cada projeto ativo (ordenado do menor pro maior progresso).
- **Funil de marcos** — contagem por status (pendente → em andamento → entregue → aprovado).
- **Leads por mês** — linha/área dos últimos 12 meses da tabela `Orçamentos` (verificar RLS de leitura para admin na implementação; se não houver policy, criar `select` para `is_admin()`).
- **Prazos próximos** — lista de marcos e projetos com vencimento nos próximos 30 dias, ordenada por data.
- Gráficos atuais (projetos criados/mês, pie por tipo) saem.

## Fora de escopo

- Revisões/versionamento de pranchas (R00, R01…).
- Visualizador de PDF embutido (download apenas).
- Notificação ao cliente quando prancha sobe (possível follow-up integrando `useNotifications`).
- React Query — mantém padrão hand-rolled existente.

## Testes

- Vitest: `usePranchas` (agrupamento por disciplina, validação de extensão), `useEnhanceText` (fetch mockado), helpers do dashboard (agregações de funil/leads/prazos).
- Manual: fluxo admin sobe prancha → cliente vê e baixa; RLS confirma que cliente A não lê pranchas do cliente B.
