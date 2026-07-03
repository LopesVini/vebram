# Otimização Mobile (Portal + HQ) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar Portal do Cliente e HQ utilizáveis em celular: bottom tab bar no lugar da sidebar, densidade estilo Instagram, BIM viewer em tela cheia com bottom sheet, HQ mobile restrito a Dashboard + The Vertice.

**Architecture:** Responsivo puro via Tailwind breakpoints (`lg` = 1024px) nos componentes existentes. Um componente compartilhado novo (`MobileTabBar`), um bottom sheet novo no BIM viewer. Zero mudança de rotas, banco ou dependências. Desktop intocado.

**Tech Stack:** React 18 + TypeScript, Tailwind, react-router-dom (NavLink), Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-07-03-mobile-optimization-design.md`

## Global Constraints

- Todas as mudanças visuais valem apenas abaixo de `lg` (1024px); desktop permanece idêntico.
- Área de toque mínima 40–44px em qualquer controle interativo.
- Strings de UI em pt-BR.
- Sem libs novas; sem mudança de rotas ou banco.
- Import alias `@/` → `src/`.
- Dev server: porta 8080 (`npm run dev`).
- Testes: `npx vitest run <arquivo>` (config em `vitest.config.ts`, setup `src/test/setup.ts`).

---

### Task 1: Componente `MobileTabBar`

**Files:**
- Create: `src/components/layout/MobileTabBar.tsx`
- Test: `src/components/layout/MobileTabBar.test.tsx`

**Interfaces:**
- Produces: `MobileTabBar({ tabs }: { tabs: MobileTab[] })` (default export) e `interface MobileTab { icon: React.ReactNode; label: string; to: string; end?: boolean }` (named export). Tasks 2 e 3 importam ambos de `@/components/layout/MobileTabBar`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/MobileTabBar.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { LayoutDashboard, Box, History } from "lucide-react";
import MobileTabBar, { MobileTab } from "@/components/layout/MobileTabBar";

const tabs: MobileTab[] = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard", to: "/portal", end: true },
  { icon: <Box size={20} />, label: "BIM", to: "/portal/bim" },
  { icon: <History size={20} />, label: "Atualizações", to: "/portal/updates" },
];

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar tabs={tabs} />
    </MemoryRouter>
  );
}

describe("MobileTabBar", () => {
  it("renderiza todas as abas com label e link", () => {
    renderAt("/portal");
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/portal");
    expect(screen.getByRole("link", { name: /bim/i })).toHaveAttribute("href", "/portal/bim");
    expect(screen.getByRole("link", { name: /atualizações/i })).toHaveAttribute("href", "/portal/updates");
  });

  it("marca a aba ativa com text-primary", () => {
    renderAt("/portal/bim");
    expect(screen.getByRole("link", { name: /bim/i }).className).toContain("text-primary");
    expect(screen.getByRole("link", { name: /dashboard/i }).className).not.toContain("text-primary");
  });

  it("aba Dashboard com end não fica ativa em sub-rotas", () => {
    renderAt("/portal/updates");
    expect(screen.getByRole("link", { name: /dashboard/i }).className).not.toContain("text-primary");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/layout/MobileTabBar.test.tsx`
Expected: FAIL — "Cannot find module '@/components/layout/MobileTabBar'" (ou equivalente).

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/layout/MobileTabBar.tsx
import { NavLink } from "react-router-dom";

export interface MobileTab {
  icon: React.ReactNode;
  label: string;
  to: string;
  end?: boolean;
}

// Barra de abas fixa inferior, visível só abaixo de lg (a sidebar assume no desktop).
export default function MobileTabBar({ tabs }: { tabs: MobileTab[] }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-navy-light/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-14">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? "text-primary" : "text-zinc-500 dark:text-zinc-400"
              }`
            }
          >
            {tab.icon}
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/layout/MobileTabBar.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/MobileTabBar.tsx src/components/layout/MobileTabBar.test.tsx
git commit -m "feat: barra de abas inferior para navegação mobile"
```

---

### Task 2: Shell mobile do PortalLayout

**Files:**
- Modify: `src/components/portal/PortalLayout.tsx`

**Interfaces:**
- Consumes: `MobileTabBar`, `MobileTab` de `@/components/layout/MobileTabBar` (Task 1).

- [ ] **Step 1: Esconder sidebar abaixo de `lg`**

Em `PortalLayout.tsx`, no `<aside>`, trocar:

```
className="w-20 lg:w-64 border-r ...
```

por:

```
className="hidden lg:flex lg:w-64 border-r ...
```

(remover `w-20`; manter o resto da string de classes igual — o `flex flex-col` original continua, `hidden lg:flex` só controla exibição).

- [ ] **Step 2: Mini-header mobile (logo + toggle de tema)**

Logo após a tag de fechamento `</aside>`, antes de `<main>`, inserir:

```tsx
{/* Header mobile: logo + tema (a sidebar some abaixo de lg) */}
<header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 px-3 flex items-center justify-between bg-white/95 dark:bg-navy-dark/95 backdrop-blur-md border-b border-zinc-200 dark:border-white/10">
  <div className="flex items-center gap-2">
    <VerticeLogo className="w-7 h-7" />
    <span className="font-sans font-bold tracking-widest uppercase text-sm text-navy dark:text-white">
      Vertice
    </span>
  </div>
  <button
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-500 hover:text-navy dark:hover:text-white transition-colors"
    aria-label="Alternar tema"
  >
    {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
  </button>
</header>
```

Nota: o layout raiz é `flex`; o header é `fixed`, não participa do flex. `<main>` compensa com padding (passo 3).

- [ ] **Step 3: Padding do conteúdo (header em cima, tab bar embaixo)**

No `<main>`, trocar:

```
<div className="p-6 lg:p-8 w-full mx-auto relative z-10">
```

por:

```
<div className="px-3 pt-[4.5rem] pb-24 lg:p-8 w-full mx-auto relative z-10">
```

(`pt-[4.5rem]` = 56px do header + 16px de respiro; `pb-24` libera o tab bar.)

- [ ] **Step 4: Adicionar tab bar**

Import no topo (ícones `LayoutDashboard`, `Box`, `History`, `UserCircle` já são importados no arquivo — não duplicar):

```tsx
import MobileTabBar from "@/components/layout/MobileTabBar";
```

Antes de `<FloatingChat />`, inserir:

```tsx
<MobileTabBar
  tabs={[
    { icon: <LayoutDashboard size={20} />, label: "Início", to: "/portal", end: true },
    { icon: <Box size={20} />, label: "BIM", to: "/portal/bim" },
    { icon: <History size={20} />, label: "Novidades", to: "/portal/updates" },
    { icon: <UserCircle size={20} />, label: "Perfil", to: "/portal/profile" },
  ]}
/>
```

- [ ] **Step 5: Verificar**

Run: `npm run lint && npx vitest run`
Expected: lint limpo, testes passam.

Manual: `npm run dev`, abrir `http://localhost:8080/portal` com viewport 375×812 (DevTools). Verificar: sem sidebar, header fino no topo, 4 abas embaixo, aba ativa destacada. Em 1280px: layout desktop idêntico ao anterior.

- [ ] **Step 6: Commit**

```bash
git add src/components/portal/PortalLayout.tsx
git commit -m "feat: shell mobile do portal com header compacto e tab bar"
```

---

### Task 3: Shell mobile do HqLayout

**Files:**
- Modify: `src/components/hq/HqLayout.tsx`

**Interfaces:**
- Consumes: `MobileTabBar`, `MobileTab` de `@/components/layout/MobileTabBar` (Task 1).

- [ ] **Step 1: Esconder sidebar abaixo de `lg`**

No `<aside>`, trocar:

```
className="w-20 lg:w-[260px] bg-white ...
```

por:

```
className="hidden lg:flex lg:w-[260px] bg-white ...
```

- [ ] **Step 2: Compactar header no mobile**

No `<header>`, trocar:

```
className="h-24 px-8 flex items-center justify-between sticky top-0 ...
```

por:

```
className="h-14 px-3 lg:h-24 lg:px-8 flex items-center justify-between sticky top-0 ...
```

No avatar, trocar `w-10 h-10 rounded-full` por `w-8 h-8 lg:w-10 lg:h-10 rounded-full`.

No bloco da saudação, trocar `<div className="hidden sm:block">` por `<div>` e na linha da data trocar `<p className="text-xs text-zinc-500">` por `<p className="hidden lg:block text-xs text-zinc-500">` (nome aparece sempre, data só no desktop).

Nos botões de sino e engrenagem, trocar `w-10 h-10` por `w-9 h-9 lg:w-10 lg:h-10` (nos dois).

No dropdown do sino, trocar `w-80` por `w-80 max-w-[calc(100vw-1.5rem)]` (não estourar tela pequena).

Command palette já é `hidden md:block` — abaixo de `md` já some; nada a fazer.

- [ ] **Step 3: Padding do conteúdo**

Trocar:

```
<div className="p-6 lg:p-8 flex-1">
```

por:

```
<div className="px-3 py-4 pb-24 lg:p-8 flex-1">
```

- [ ] **Step 4: Adicionar tab bar (Dashboard + The Vertice, sem Projetos/Clientes)**

Import no topo:

```tsx
import MobileTabBar from "@/components/layout/MobileTabBar";
```

Antes de `<FloatingChat />`, inserir:

```tsx
<MobileTabBar
  tabs={[
    { icon: <LayoutDashboard size={20} />, label: "Painel", to: "/hq", end: true },
    { icon: <Rss size={20} />, label: "Mural", to: "/hq/feed" },
    { icon: <CalendarDays size={20} />, label: "Agenda", to: "/hq/calendar" },
    { icon: <BarChart3 size={20} />, label: "Enquetes", to: "/hq/polls" },
    { icon: <Users size={20} />, label: "Membros", to: "/hq/members" },
  ]}
/>
```

(Todos os ícones já são importados no arquivo.)

- [ ] **Step 5: Verificar**

Run: `npm run lint && npx vitest run`
Expected: lint limpo, testes passam.

Manual: viewport 375×812 em `/hq` (logado como admin). Sem sidebar, header 56px, 5 abas embaixo, sem entrada para Projetos/Clientes. Desktop 1280px inalterado.

- [ ] **Step 6: Commit**

```bash
git add src/components/hq/HqLayout.tsx
git commit -m "feat: shell mobile do HQ com header compacto e tab bar The Vertice"
```

---

### Task 4: FloatingChat acima do tab bar

**Files:**
- Modify: `src/components/chat/FloatingChat.tsx`

- [ ] **Step 1: Reposicionar botão flutuante**

Na linha do botão fechado (~246), trocar:

```
className="fixed bottom-8 right-8 w-14 h-14 ...
```

por:

```
className="fixed bottom-[4.5rem] right-4 lg:bottom-8 lg:right-8 w-12 h-12 lg:w-14 lg:h-14 ...
```

(4.5rem = 72px, limpa os 56px do tab bar.)

- [ ] **Step 2: Painel aberto não estourar tela pequena**

No `motion.div` do painel (~280), trocar:

```
className={`w-[350px] bg-white ...
```

por:

```
className={`w-[calc(100vw-1rem)] max-w-[350px] bg-white ...
```

E no `style` inline (~276), trocar o ramo `isPinned`:

```tsx
...(isPinned
  ? { bottom: "2rem", right: "2rem" }
  : { top: "20%", left: "50%", x: "-50%" }),
```

por:

```tsx
...(isPinned
  ? window.innerWidth < 1024
    ? { bottom: "4.5rem", right: "0.5rem" }
    : { bottom: "2rem", right: "2rem" }
  : { top: "20%", left: "50%", x: "-50%" }),
```

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpo.

Manual: viewport 375×812 no portal — botão do chat flutua acima do tab bar; aberto, painel cabe na tela. Desktop: posição original.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/FloatingChat.tsx
git commit -m "fix: chat flutuante não colide com tab bar mobile"
```

---

### Task 5: Componente `BimBottomSheet`

**Files:**
- Create: `src/components/portal/BimBottomSheet.tsx`
- Test: `src/components/portal/BimBottomSheet.test.tsx`

**Interfaces:**
- Produces: `BimBottomSheet({ children }: { children: React.ReactNode })` (default export). Estados internos `"peek" | "half" | "full"`, expostos via atributo `data-state` no container. Task 6 importa de `@/components/portal/BimBottomSheet`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/portal/BimBottomSheet.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BimBottomSheet from "@/components/portal/BimBottomSheet";

describe("BimBottomSheet", () => {
  it("inicia recolhida (peek) e renderiza o conteúdo", () => {
    render(<BimBottomSheet><p>conteúdo do painel</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    expect(sheet.dataset.state).toBe("peek");
    expect(screen.getByText("conteúdo do painel")).toBeInTheDocument();
  });

  it("toque na alça cicla peek → half → full → peek", () => {
    render(<BimBottomSheet><p>x</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    const handle = screen.getByRole("button", { name: /painel do modelo/i });
    fireEvent.click(handle);
    expect(sheet.dataset.state).toBe("half");
    fireEvent.click(handle);
    expect(sheet.dataset.state).toBe("full");
    fireEvent.click(handle);
    expect(sheet.dataset.state).toBe("peek");
  });

  it("arrastar para cima a partir de peek abre half", () => {
    render(<BimBottomSheet><p>x</p></BimBottomSheet>);
    const sheet = screen.getByTestId("bim-bottom-sheet");
    const handle = screen.getByRole("button", { name: /painel do modelo/i });
    fireEvent.pointerDown(handle, { clientY: 700 });
    fireEvent.pointerUp(handle, { clientY: 600 }); // -100px = swipe up
    expect(sheet.dataset.state).toBe("half");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/portal/BimBottomSheet.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/portal/BimBottomSheet.tsx
import { useRef, useState } from "react";

type SheetState = "peek" | "half" | "full";

const HEIGHTS: Record<SheetState, string> = {
  peek: "2.5rem",
  half: "45dvh",
  full: "85dvh",
};

const ORDER: SheetState[] = ["peek", "half", "full"];

// Gaveta inferior do BIM viewer (só mobile). Três estados; arrasto na alça
// via pointer events — swipe de 40px+ muda um nível, toque cicla.
export default function BimBottomSheet({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SheetState>("peek");
  const dragStartY = useRef<number | null>(null);
  const dragged = useRef(false);

  function step(dir: 1 | -1) {
    setState((s) => ORDER[Math.min(Math.max(ORDER.indexOf(s) + dir, 0), ORDER.length - 1)]);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    dragged.current = false;
  }

  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    dragStartY.current = null;
    if (delta <= -40) { dragged.current = true; step(1); }   // swipe up → abre
    else if (delta >= 40) { dragged.current = true; step(-1); } // swipe down → fecha
  }

  function onClick() {
    if (dragged.current) { dragged.current = false; return; }
    setState((s) => ORDER[(ORDER.indexOf(s) + 1) % ORDER.length]);
  }

  return (
    <div
      data-testid="bim-bottom-sheet"
      data-state={state}
      style={{ height: HEIGHTS[state] }}
      className="lg:hidden fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 bg-white dark:bg-navy-light border-t border-zinc-200 dark:border-white/10 rounded-t-2xl shadow-2xl transition-[height] duration-300 flex flex-col overflow-hidden"
    >
      <button
        type="button"
        aria-label="Painel do modelo"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onClick}
        className="h-10 shrink-0 flex items-center justify-center touch-none cursor-grab"
      >
        <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-white/20" />
      </button>
      <div className={`flex-1 overflow-y-auto px-4 pb-4 ${state === "peek" ? "invisible" : ""}`}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/portal/BimBottomSheet.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/BimBottomSheet.tsx src/components/portal/BimBottomSheet.test.tsx
git commit -m "feat: bottom sheet de 3 estados para o BIM viewer mobile"
```

---

### Task 6: BIM viewer mobile (tela cheia + sheet)

**Files:**
- Modify: `src/pages/portal/BimViewer.tsx`

**Interfaces:**
- Consumes: `BimBottomSheet` de `@/components/portal/BimBottomSheet` (Task 5).

- [ ] **Step 1: Extrair conteúdo do painel para subcomponente `PanelContent`**

O miolo do painel lateral (busca + hierarquia + info, linhas ~396–420 de `BimViewer.tsx`) vira função no mesmo arquivo, usada pelo painel desktop e pela sheet mobile:

```tsx
function PanelContent({
  search, setSearch, tree, info, loading,
}: {
  search: string;
  setSearch: (v: string) => void;
  tree: SpatialNode | null;
  info: ModelInfo | null;
  loading: boolean;
}) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar elementos..."
          className="w-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-navy dark:text-white focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <p className="text-[10px] font-bold text-zinc-500 mb-2 tracking-widest">HIERARQUIA DO PROJETO</p>
        {!tree && !loading && (
          <p className="text-xs text-zinc-400 px-2 py-3">Sem modelo carregado.</p>
        )}
        {tree && <TreeNodeView node={tree} />}
      </div>

      {info && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/10 text-[10px] text-zinc-500 space-y-1">
          <div className="flex justify-between"><span>Arquivo</span><span className="text-navy dark:text-white truncate ml-2 max-w-[180px]" title={info.name}>{info.name}</span></div>
          <div className="flex justify-between"><span>Meshes</span><span className="text-navy dark:text-white">{info.meshCount}</span></div>
          <div className="flex justify-between"><span>Triângulos</span><span className="text-navy dark:text-white">{info.triangleCount.toLocaleString("pt-BR")}</span></div>
          <div className="flex justify-between"><span>Dimensões</span><span className="text-navy dark:text-white">{info.bbox.width.toFixed(1)} × {info.bbox.height.toFixed(1)} × {info.bbox.depth.toFixed(1)} m</span></div>
        </div>
      )}
    </>
  );
}
```

O `<div className="w-80 ...">` desktop passa a renderizar `<PanelContent search={search} setSearch={setSearch} tree={tree} info={info} loading={loading} />` no lugar do miolo duplicado.

- [ ] **Step 2: Esconder chrome desktop no mobile**

- Header da página (`<div className="flex justify-between items-end border-b ...">`): prefixar com `hidden lg:flex ` (trocar `flex justify-between` por `hidden lg:flex justify-between`).
- Painel lateral (`<div className="w-80 bg-white ...">`): trocar `w-80 bg-white` por `hidden lg:flex w-80 bg-white` (o `flex flex-col` original permanece na string).
- Overlay grande de info do viewer (`<div className="bg-white/80 dark:bg-black/60 ... p-3 rounded-lg flex items-center gap-4 ...">`): trocar `p-3 rounded-lg flex` por `p-3 rounded-lg hidden lg:flex`.
- Botão flutuante "Enquadrar" dentro do canvas permanece nos dois breakpoints (40×40px, não obstrui).

- [ ] **Step 3: Canvas full-bleed no mobile**

- Root da página, trocar:

```
<div className="flex flex-col h-[calc(100vh-6rem)] w-full font-mono text-zinc-300 relative gap-6">
```

por:

```
<div className="flex flex-col h-[calc(100dvh-7rem)] -mx-3 -mt-[4.5rem] -mb-24 pt-14 lg:m-0 lg:pt-0 lg:h-[calc(100vh-6rem)] w-auto lg:w-full font-mono text-zinc-300 relative gap-0 lg:gap-6">
```

(Margens negativas cancelam o padding do `PortalLayout` no mobile: `px-3 pt-[4.5rem] pb-24`. `pt-14` devolve o espaço do header fixo. Altura = viewport − header 56px − tab bar 56px.)

- Container flex do meio, trocar:

```
<div className="flex flex-1 gap-6 min-h-0">
```

por:

```
<div className="flex flex-1 gap-0 lg:gap-6 min-h-0">
```

- Container do viewer, trocar:

```
<div className="flex-1 bg-zinc-100 dark:bg-[#0A0A0E] border border-zinc-200 dark:border-white/15 rounded-2xl relative overflow-hidden shadow-inner">
```

por:

```
<div className="flex-1 bg-zinc-100 dark:bg-[#0A0A0E] border-y lg:border border-zinc-200 dark:border-white/15 rounded-none lg:rounded-2xl relative overflow-hidden shadow-inner">
```

- [ ] **Step 4: Pill mobile com nome do projeto (some após 3s)**

No componente `BimViewer`, adicionar estado + efeito:

```tsx
const [showPill, setShowPill] = useState(true);
useEffect(() => {
  if (!info) return;
  setShowPill(true);
  const t = setTimeout(() => setShowPill(false), 3000);
  return () => clearTimeout(t);
}, [info]);
```

Dentro do container do viewer (junto dos overlays), adicionar:

```tsx
{/* Pill mobile: nome do modelo, some sozinha */}
{info && (
  <div
    className={`lg:hidden absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-500 ${showPill ? "opacity-100" : "opacity-0"}`}
  >
    <div className="bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full max-w-[70vw] truncate">
      {info.name}
    </div>
  </div>
)}
```

- [ ] **Step 5: Bottom sheet no mobile**

Import: `import BimBottomSheet from "@/components/portal/BimBottomSheet";`

Após o fechamento do container do viewer (antes do fechamento do root), adicionar:

```tsx
<BimBottomSheet>
  <PanelContent search={search} setSearch={setSearch} tree={tree} info={info} loading={loading} />
</BimBottomSheet>
```

(O componente já é `lg:hidden` — desktop não muda.)

- [ ] **Step 6: Verificar toque nos OrbitControls**

`OrbitControls` do three-stdlib já mapeia touch (1 dedo = orbit, 2 dedos = zoom/pan) por padrão. Verificação manual no passo seguinte; se sensibilidade ruim, ajustar `controls.rotateSpeed`/`zoomSpeed` em `useThreeScene` (valores default costumam bastar — só mexer se necessário no teste real).

- [ ] **Step 7: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpo.

Manual (viewport 375×812, `/portal/bim`): canvas ocupa a tela entre header e tab bar, sem cards por cima; pill com nome some após 3s; alça da sheet visível; arrastar/tocar abre busca + hierarquia + info; loading/erro centrais funcionam. Desktop 1280px: painel lateral e overlays idênticos ao anterior.

- [ ] **Step 8: Commit**

```bash
git add src/pages/portal/BimViewer.tsx
git commit -m "feat: BIM viewer em tela cheia no mobile com bottom sheet"
```

---

### Task 7: Densidade mobile — Portal (ProjectDashboard + ProjectUpdates)

**Files:**
- Modify: `src/pages/portal/ProjectDashboard.tsx`
- Modify: `src/pages/portal/ProjectUpdates.tsx`

Regras de mapeamento (aplicar via Edit em cada ocorrência que casar; só onde a classe atual NÃO tem prefixo responsivo):

| Onde | De | Para |
|---|---|---|
| `<h1>` de página | `text-4xl` | `text-2xl lg:text-4xl` |
| `<h1>`/título `text-3xl` | `text-3xl` | `text-xl lg:text-3xl` |
| Números de stat card | `text-3xl` | `text-xl lg:text-3xl` |
| Cards `rounded-2xl p-6` | `p-6` | `p-4 lg:p-6` |
| Botões de ação | `px-4 py-2` (quando altura resultante > 44px) | `px-3 py-2 text-xs lg:px-4 lg:text-sm` |
| Root com `h-[calc(100vh-6rem)]` | `h-[calc(100vh-6rem)]` | `h-auto lg:h-[calc(100vh-6rem)]` |

- [ ] **Step 1: ProjectDashboard**

Aplicar as regras. Pontos conhecidos:
- Linha ~709: `<h1 className="text-4xl font-black ...">` → `text-2xl lg:text-4xl font-black ...`.
- Linha ~717: grid de stats `grid grid-cols-2 md:grid-cols-4 gap-3` já quebra em 2 colunas — manter, só reduzir gap: `gap-2 lg:gap-3`.
- Linha ~1002 (StatCard): `text-3xl font-black` → `text-xl lg:text-3xl font-black`.
- Linha ~366: root `grid grid-cols-12 gap-2 w-full h-full relative overflow-hidden` → adicionar `overflow-visible lg:overflow-hidden` e conferir que colunas internas com `col-span-*` tenham fallback mobile (`col-span-12 lg:col-span-X`) — onde já houver breakpoint, não mexer.
- Timeline de marcos: reduzir ícones para `w-8 h-8` e texto para `text-[13px]` apenas nas linhas sem prefixo responsivo, sempre via `X lg:Y`.

- [ ] **Step 2: ProjectUpdates (feed estilo Instagram)**

- Linha ~81: root `h-[calc(100vh-6rem)]` → `h-auto lg:h-[calc(100vh-6rem)]`; `gap-6` → `gap-3 lg:gap-6`.
- Linha ~87: `text-3xl` → `text-xl lg:text-3xl`.
- Linha ~39: card `rounded-2xl p-6` → `rounded-xl p-3 lg:rounded-2xl lg:p-6`.
- Imagens de update: garantir `w-full max-w-full` no mobile (edge-to-edge dentro do card); se houver `max-w-[260px]` em imagem de post, trocar por `max-w-full lg:max-w-[260px]`.
- Meta info (autor + data): uma linha só no mobile — se estiver em coluna, aplicar `flex-row items-center gap-2`.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpo.

Manual (375×812): `/portal` — stats em 2 colunas compactas, título menor, sem botão ocupando tela; `/portal/updates` — feed corrido, imagens na largura do card. Desktop inalterado.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/ProjectDashboard.tsx src/pages/portal/ProjectUpdates.tsx
git commit -m "ux: densidade mobile no dashboard e atualizações do portal"
```

---

### Task 8: Densidade mobile — HQ (Dashboard + Mural)

**Files:**
- Modify: `src/pages/hq/HqDashboard.tsx`
- Modify: `src/pages/hq/HqFeed.tsx`

Mesmas regras de mapeamento da Task 7.

- [ ] **Step 1: HqDashboard**

- Linha ~187: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` → `grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4` (stat tiles 2×2 no mobile).
- Linha ~206: stat `text-2xl font-black` → `text-lg lg:text-2xl font-black`.
- Cards de gráfico (linhas ~223, ~302, ~351, ~391): `rounded-2xl p-6` → `rounded-2xl p-4 lg:p-6`.
- Containers de gráfico com altura fixa (procurar `h-64`, `h-72`, `h-80` dentro dos cards): reduzir no mobile via `h-48 lg:h-64` (ou o valor original com prefixo `lg:`). Gráficos ficam 1 coluna no mobile — o grid `grid-cols-1 lg:grid-cols-3` da linha ~216 já faz isso; não mexer.

- [ ] **Step 2: HqFeed (Mural)**

- Container já é `max-w-[760px] mx-auto` — ok.
- Cards de post: `p-6` → `p-3 lg:p-6`; `rounded-2xl` → `rounded-xl lg:rounded-2xl`.
- Composer (caixa de novo post): textarea inicia com 1 linha no mobile (`rows={1}` + `min-h-0`) e expande ao focar — se já expandir por conteúdo, só reduzir padding para `p-3 lg:p-4`.
- Botões like/comentário: ícone `size={16}`, container `p-2` (mantém área ≥ 40px), texto `text-xs`.
- Imagens de post `max-w-[260px] max-h-[210px]` → `max-w-full lg:max-w-[260px] max-h-[280px] lg:max-h-[210px] w-full lg:w-auto` (edge-to-edge no mobile).

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpo.

Manual (375×812): `/hq` — tiles 2×2, gráficos 1 coluna com ~200px; `/hq/feed` — posts densos, imagens na largura do card, composer 1 linha. Desktop inalterado.

- [ ] **Step 4: Commit**

```bash
git add src/pages/hq/HqDashboard.tsx src/pages/hq/HqFeed.tsx
git commit -m "ux: densidade mobile no dashboard e mural do HQ"
```

---

### Task 9: Verificação final

**Files:** nenhum novo (só correções pontuais se a verificação achar problema).

- [ ] **Step 1: Suite completa**

Run: `npm run lint && npx vitest run && npm run build`
Expected: tudo limpo; build sem erro.

- [ ] **Step 2: Passada manual mobile (viewport 375×812)**

`npm run dev` e conferir cada rota:

| Rota | Checar |
|---|---|
| `/portal` | header fino, 4 abas, stats 2 col, nada atrás do tab bar |
| `/portal/bim` | canvas cheio, pill some, sheet 3 estados, orbit por toque |
| `/portal/updates` | feed denso, imagens full-width |
| `/portal/profile` | acessível pela aba Perfil |
| `/hq` | header 56px, 5 abas, tiles 2×2, gráficos 1 col |
| `/hq/feed` | posts densos, composer compacto |
| `/hq/calendar`, `/hq/polls`, `/hq/members` | acessíveis pelas abas, conteúdo não atrás do tab bar |
| chat flutuante | acima do tab bar, painel cabe na tela |

- [ ] **Step 3: Passada manual desktop (1280px)**

Mesmas rotas — layout idêntico ao estado anterior ao plano (sidebar, header alto, painel BIM lateral).

- [ ] **Step 4: Commit final (se houve correções)**

```bash
git add -A && git commit -m "fix: ajustes finais da passada de verificação mobile"
```
