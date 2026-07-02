# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vertice Engineering's web product: a marketing site plus a multi-area SaaS portal for an engineering/architecture firm. Two deployables live in this repo:

- **Frontend** (repo root) — a Vite + React 18 + TypeScript SPA, Tailwind + shadcn/ui, deployed via Lovable.
- **Automation backend** (`automation/`) — a standalone Python FastAPI service that processes quote/lead submissions (AI reply via Groq, email, Google Sheets logging) and is deployed separately to Render (`automation/render.yaml`).

The UI language and most comments are Portuguese (pt-BR). Match that when editing user-facing strings.

## Commands

Frontend (run from repo root; `npm` is the package manager — `package-lock.json` is committed):

```bash
npm install               # install dependencies
npm run dev               # Vite dev server on http://localhost:8080
npm run build             # production build
npm run build:dev         # build in development mode
npm run lint              # eslint .
npm run test              # vitest run (jsdom, Testing Library)
npm run test:watch        # vitest watch
```

Run a single test:

```bash
npx vitest run src/test/example.test.ts          # one file
npx vitest run -t "name of the test"             # by test name
```

Vitest config (`vitest.config.ts`) globs `src/**/*.{test,spec}.{ts,tsx}` and loads `src/test/setup.ts`. Playwright (`playwright.config.ts`) wraps Lovable's shared config.

Automation backend (run from `automation/`):

```bash
pip install -r requirements.txt
uvicorn main:app --reload          # local dev
```

## Frontend architecture

`src/App.tsx` is the single source of routing and provider nesting. Three distinct route areas share the same SPA:

- **Institutional site** — `/`, `/sobre`, `/servicos`, `/projetos`, `/processo`, `/orcamento`, `/contato`. Marketing pages with heavy GSAP/ScrollTrigger animation.
- **Client portal** — `/portal/*`, gated by `PortalLayout` (`src/components/portal/`). A logged-in client sees their single project dashboard, BIM 3D viewer, and update timeline.
- **Admin HQ** — `/hq/*`, gated by `HqLayout` (`src/components/hq/`). Internal staff manage all projects and clients.

**Auth and role gating.** `src/hooks/useAuth.tsx` wraps Supabase Auth in a React context (`session`, `user`, `displayName`, `updateProfile`, `updatePassword`, `signOut`). The user profile lives in Supabase `user_metadata` (display_name, phone, city, bio), not a separate query. There is **no role column**: admin access is decided in `HqLayout` by checking whether the email contains `admin` or `@vertice` — non-admins hitting `/hq` are redirected to `/portal`. Keep that check in mind when touching access control.

**Data layer.** Despite `QueryClientProvider` being mounted, data is **not** fetched through React Query. Each domain has a hand-rolled hook in `src/hooks/` (`useProjects`, `useMilestones`, `useClientProject`, `useUpdates`, `useContacts`, `useChat`) that calls Supabase directly and keeps results in local `useState` with optimistic updates. Follow this existing pattern rather than introducing React Query for new data.

**Supabase clients** (`src/lib/supabase.ts`) — two clients are exported:
- `supabase` — anon key, subject to Row Level Security.
- `supabaseAdmin` — **service-role key, bypasses RLS**, used directly in the browser for privileged writes (e.g. milestone approval and progress sync in `useMilestones.ts`). Both keys, including the service role key, are currently hardcoded in this file and shipped in the client bundle. Be aware of this when reasoning about security; prefer `supabase` (anon) for anything a normal user should be allowed to do, and only reach for `supabaseAdmin` to match the existing privileged-write pattern.

**Live tables** (what the code actually queries): `profiles`, `projects`, `milestones`, `updates`, `messages`. Note that `supabase_schema.sql` and `arquitetura_projeto_x.md` describe an *aspirational* multi-tenant schema (`clients`, `project_milestones`, `project_updates`, `tenant_id` columns) that does **not** match the running app — treat those files as design intent/history, not as the current schema.

**Project progress** is derived, not stored manually: `calcProgress()` in `useMilestones.ts` computes a weighted percentage across milestones (priority: `approved_at` → `delivered_items/total_items` → `status`) and writes it back to `projects.progress` via `supabaseAdmin` whenever milestones change.

**BIM 3D viewer.** Client `.ifc` models are uploaded to the Supabase Storage bucket `ifc-models` (`src/hooks/useProjectIfc.ts`, 50 MB cap, path `{projectId}/{slug}.ifc`) and rendered client-side with `three` + `web-ifc` directly in `src/pages/portal/BimViewer.tsx` (this page is the actual viewer despite its route being `/portal/bim`; it parses the IFC via `web-ifc`'s `IfcAPI` and builds Three.js meshes by hand, with WASM served from `public/wasm/`). It falls back to `public/models/demo.ifc` when the client's project has no `ifc_url`. This keeps 3D infra cost at $0 — do not introduce paid/proprietary renderers.

**AI chat.** `FloatingChat` (in both layouts) uses `useGroqChat` (`src/hooks/useGroqChat.ts`), which calls the Groq API directly from the browser (`VITE_GROQ_API_KEY`, model `llama-3.3-70b-versatile`) and persists history to `localStorage` keyed per conversation.

## Automation backend (`automation/`)

A FastAPI app (`main.py`) with two ingress endpoints, each guarded by a shared-secret header:

- `POST /webhook/supabase` (header `x-webhook-secret`) — fired by a Supabase row-insert webhook.
- `POST /process-quote` (header `x-api-key`) — called directly by the frontend quote form (`VITE_AUTOMATION_URL` / `VITE_AUTOMATION_KEY`).

Both run the same pipeline over a lead record: `generate_response` (Groq AI reply) → `send_client_email` → `log_to_sheets` (Google Sheets) → `notify_team_email`. Each step is a module in `automation/tools/`, and `automation/architecture/POP_*.md` documents the intended behavior of each step. Config is via environment variables (see `render.yaml` env list); secrets are not synced and must be set in the Render dashboard.

## Conventions

- Import alias `@/` → `src/` (configured in `vite.config.ts`, `tsconfig`, `components.json`, and the vitest config — update all of them together if it changes).
- shadcn/ui primitives live in `src/components/ui/` and are managed by the shadcn CLI (`components.json`); avoid hand-editing them.
- ESLint has `@typescript-eslint/no-unused-vars` turned **off** — don't rely on it to catch dead code.
- Theming is class-based dark mode via `ThemeProvider` (default `dark`, persisted under `vertice-theme`); custom colors like `navy`, `navy-dark`, `navy-light` come from `tailwind.config.ts`.
- The dev server runs on port **8080**, not the Vite default.
