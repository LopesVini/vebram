# Otimização Mobile do Site Institucional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Densidade de feed e animações leves no celular para as 7 páginas do site institucional, mantendo a identidade desktop (só micro-retoques aprovados).

**Architecture:** Polish responsivo Tailwind nos componentes existentes (mobile primeiro, `md:` restaura desktop) + novo utilitário `src/lib/motion.ts` sobre `gsap.matchMedia()` que roteia animações por viewport e respeita `prefers-reduced-motion`. Único consumidor pesado é o parallax da Philosophy; entradas GSAP simples (Hero, Serviços, Projetos) permanecem. Processo já usa framer-motion com `useReducedMotion` — só recebe densidade.

**Tech Stack:** React 18 + TS, Tailwind, GSAP 3 (`gsap.matchMedia`), framer-motion (Processo, já existente), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-04-landing-mobile-design.md`

## Global Constraints

- Mudanças visuais só abaixo de `md` (768px) — exceto 1 retoque global aprovado: gradiente do hero `via-navy/80` → `via-navy/85`.
- Toda mudança na forma `X md:<original>`; nunca alterar valor `md:`/`lg:` existente.
- CTAs mantêm ≥ 44px de toque.
- Inputs de formulário com fonte ≥ 16px no mobile (`text-base`) — evita zoom automático do iOS.
- UI pt-BR. Sem lib nova. Sem mudança de rota/conteúdo textual.
- Verificação por task: `npm run lint && npx vitest run` limpos.
- Dev server porta 8080.

---

### Task 1: Utilitário `responsiveMotion`

**Files:**
- Create: `src/lib/motion.ts`
- Test: `src/lib/motion.test.ts`

**Interfaces:**
- Produces: `responsiveMotion(scope: Element | null, handlers: { full?: () => void; light?: () => void }): gsap.MatchMedia` (named export). Comportamento: `prefers-reduced-motion: reduce` → nenhum handler roda; viewport ≥768px → `full()`; <768px → `light()`. Caller faz cleanup com `mm.revert()`. Task 2 consome.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/motion.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Controla o que window.matchMedia responde por query.
function stubMatchMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Object.entries(matches).find(([k]) => query.includes(k))?.[1] ?? false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("responsiveMotion", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("roda full no desktop", async () => {
    stubMatchMedia({ "min-width: 768px": true, "max-width": false, "prefers-reduced-motion": false });
    const { responsiveMotion } = await import("@/lib/motion");
    const full = vi.fn();
    const light = vi.fn();
    const mm = responsiveMotion(null, { full, light });
    expect(full).toHaveBeenCalledOnce();
    expect(light).not.toHaveBeenCalled();
    mm.revert();
  });

  it("roda light no mobile", async () => {
    stubMatchMedia({ "min-width: 768px": false, "max-width": true, "prefers-reduced-motion": false });
    const { responsiveMotion } = await import("@/lib/motion");
    const full = vi.fn();
    const light = vi.fn();
    const mm = responsiveMotion(null, { full, light });
    expect(light).toHaveBeenCalledOnce();
    expect(full).not.toHaveBeenCalled();
    mm.revert();
  });

  it("não roda nada com prefers-reduced-motion", async () => {
    stubMatchMedia({ "min-width: 768px": true, "max-width": false, "prefers-reduced-motion": true });
    const { responsiveMotion } = await import("@/lib/motion");
    const full = vi.fn();
    const light = vi.fn();
    const mm = responsiveMotion(null, { full, light });
    expect(full).not.toHaveBeenCalled();
    expect(light).not.toHaveBeenCalled();
    mm.revert();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: FAIL — módulo `@/lib/motion` não existe.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/motion.ts
import gsap from "gsap";

export const DESKTOP_MQ = "(min-width: 768px)";
export const MOBILE_MQ = "(max-width: 767.98px)";
export const REDUCED_MQ = "(prefers-reduced-motion: reduce)";

// Roteia animações GSAP por viewport e preferência de movimento:
// desktop → full, mobile → light, reduced-motion → nada (conteúdo estático).
export function responsiveMotion(
  scope: Element | null,
  handlers: { full?: () => void; light?: () => void },
): gsap.MatchMedia {
  const mm = gsap.matchMedia(scope ?? undefined);
  mm.add(
    { isDesktop: DESKTOP_MQ, isMobile: MOBILE_MQ, reduced: REDUCED_MQ },
    (ctx) => {
      const c = ctx.conditions as { isDesktop: boolean; isMobile: boolean; reduced: boolean };
      if (c.reduced) return;
      if (c.isDesktop) handlers.full?.();
      else if (c.isMobile) handlers.light?.();
    },
  );
  return mm;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat: utilitário responsiveMotion para animações por viewport"
```

---

### Task 2: Philosophy — parallax só no desktop + densidade

**Files:**
- Modify: `src/components/sections/Philosophy.tsx`

**Interfaces:**
- Consumes: `responsiveMotion` de `@/lib/motion` (Task 1).

- [ ] **Step 1: Migrar animações para o helper**

Substituir o `useEffect` atual (linhas ~12–40) por:

```tsx
useEffect(() => {
  const mm = responsiveMotion(sectionRef.current, {
    full: () => {
      gsap.to(".parallax-bg", {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
        y: 150,
        ease: "none",
      });
      gsap.utils.toArray<HTMLElement>(".reveal-text").forEach((text) => {
        gsap.from(text, {
          scrollTrigger: { trigger: text, start: "top 80%" },
          y: 40,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
        });
      });
    },
    light: () => {
      // Mobile: só reveals suaves, sem parallax scrub.
      gsap.utils.toArray<HTMLElement>(".reveal-text").forEach((text) => {
        gsap.from(text, {
          scrollTrigger: { trigger: text, start: "top 85%" },
          y: 20,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
        });
      });
    },
  });
  return () => mm.revert();
}, []);
```

Import no topo: `import { responsiveMotion } from "@/lib/motion";` (manter imports gsap/ScrollTrigger existentes).

- [ ] **Step 2: Densidade**

- Section: `py-40` → `py-20 md:py-40`.
- Container: `gap-24` → `gap-12 md:gap-24`.
- Parágrafos: `text-xl md:text-2xl` mantém (já responsivo).

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpos.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Philosophy.tsx
git commit -m "ux: Philosophy com parallax só no desktop e ritmo mobile"
```

---

### Task 3: Home — Hero + cards de navegação

**Files:**
- Modify: `src/components/sections/HeroSection.tsx`
- Modify: `src/pages/institutional/Index.tsx`

- [ ] **Step 1: HeroSection**

- Section: `pt-28 pb-24 md:pb-32` → `pt-24 pb-16 md:pt-28 md:pb-32`.
- Gradiente (retoque global aprovado): `from-navy via-navy/80 to-transparent` → `from-navy via-navy/85 to-transparent`.
- Título drama: `text-7xl md:text-8xl lg:text-[10rem]` → `text-6xl md:text-8xl lg:text-[10rem]`.
- Parágrafo: `text-lg md:text-xl` → `text-base md:text-xl`; `mt-8` → `mt-6 md:mt-8`.
- Chips: no container `flex items-center gap-3` → `flex flex-wrap items-center gap-2 md:gap-3`; no 3º chip remover `hidden sm:block` (volta a aparecer).
- CTA: `px-10 py-5 rounded-full text-lg` → `px-7 py-3.5 text-base md:px-10 md:py-5 md:text-lg rounded-full`; container `mt-10` → `mt-8 md:mt-10`.

- [ ] **Step 2: Index — seção de navegação**

- Section: `py-32` → `py-16 md:py-32`.
- Header: `mb-20` → `mb-10 md:mb-20`; h2 `text-4xl md:text-5xl` mantém.
- Nos 3 cards (mesmo padrão): `p-10` → `p-6 md:p-10`; `min-h-[300px]` → `min-h-0 md:min-h-[300px]`; título `text-3xl` → `text-2xl md:text-3xl`; descrição `text-lg` → `text-base md:text-lg` e `mb-8` → `mb-6 md:mb-8`; ícone decorativo `size={150}` → `size={100}` com `className="md:hidden"` + duplicata `size={150}` com `className="hidden md:block"` — OU mais simples: envolver o ícone em `<div className="scale-[0.66] md:scale-100 origin-top-right">`. Usar a opção do wrapper com scale (1 linha por card, sem duplicar SVG).
- Grid: `gap-8` → `gap-4 md:gap-8`.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpos.

Manual: `npm run dev` → viewport 375×812 em `/`: hero com 3 chips visíveis, CTA proporcional, cards densos; desktop 1280px idêntico exceto gradiente ligeiramente mais escuro no meio do hero.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/HeroSection.tsx src/pages/institutional/Index.tsx
git commit -m "ux: hero e cards da home com densidade mobile"
```

---

### Task 4: GetStarted (Home/Orçamento/Contato)

**Files:**
- Modify: `src/components/sections/GetStarted.tsx`

- [ ] **Step 1: Espaçamento e card**

- Section: `py-32` → `py-16 md:py-32`.
- Card: `rounded-[3rem] shadow-2xl p-8 md:p-16` → `rounded-[2rem] md:rounded-[3rem] shadow-2xl p-5 md:p-16`.
- Header: `mb-12` → `mb-8 md:mb-12`; h2 `text-4xl md:text-5xl` mantém; parágrafo `text-lg` → `text-base md:text-lg`.

- [ ] **Step 2: Inputs ≥16px (anti-zoom iOS)**

Nos 4+ inputs/textarea/select com `px-4 py-3` (nome, email, celular, município, detalhes): adicionar `text-base` à className (nenhum tem classe de fonte hoje — herdam a base; explicitar `text-base` garante ≥16px).

Botões de disciplina (`px-5 py-2.5 rounded-xl text-sm`): `px-4 py-2.5 text-sm md:px-5` (toque ok ~42px, largura menor pra caber 2 por linha em 375px).

Form: `space-y-6` → `space-y-4 md:space-y-6`; grid `gap-6` → `gap-4 md:gap-6`.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpos.

Manual: 375×812 em `/orcamento` — card ocupa quase toda a largura, inputs confortáveis, sem zoom ao focar (testar no preset iPhone).

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/GetStarted.tsx
git commit -m "ux: formulário de orçamento denso no mobile e sem zoom no iOS"
```

---

### Task 5: Serviços + Projetos

**Files:**
- Modify: `src/pages/institutional/Servicos.tsx`
- Modify: `src/pages/institutional/Projetos.tsx`

- [ ] **Step 1: Serviços**

- Main: `pt-40 pb-32` → `pt-28 pb-16 md:pt-40 md:pb-32`.
- Header: `mb-16` → `mb-10 md:mb-16`; parágrafo `text-lg` → `text-base md:text-lg`.
- Nos 4 cards ilustrados (ArqCard, EstCard, EletricoCard, HidroCard — mesmo padrão `rounded-[2rem] p-8 shadow-2xl h-80`): `p-8` → `p-5 md:p-8`; `h-80` → `h-auto min-h-[16rem] md:h-80`.
- Grid: `gap-8` → `gap-4 md:gap-8`.
- Animações de entrada (`gsap.from .feature-card`) ficam — leves.

- [ ] **Step 2: Projetos**

- Main: mesmo padrão `pt-40 pb-32` → `pt-28 pb-16 md:pt-40 md:pb-32` (conferir classes exatas no arquivo).
- Header: `mb-16` (ou equivalente) → `mb-10 md:mb-16`; parágrafo `text-lg` → `text-base md:text-lg`.
- Grid: `gap-8 md:gap-12` → `gap-6 md:gap-12`.
- Card de projeto: imagem `aspect-[4/3]` mantém; `mb-6` → `mb-4 md:mb-6`; título/meta do card: se `text-2xl`+ sem prefixo, reduzir um degrau (`text-xl md:text-2xl`).
- Animação de entrada (`gsap.from .project-card`) fica.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpos.

Manual: 375×812 em `/servicos` (cards ilustrados sem corte de conteúdo) e `/projetos`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/institutional/Servicos.tsx src/pages/institutional/Projetos.tsx
git commit -m "ux: serviços e projetos com densidade mobile"
```

---

### Task 6: Processo + Sobre

**Files:**
- Modify: `src/pages/institutional/Processo.tsx`
- Modify: `src/components/sections/AboutSection.tsx`
- Modify: `src/components/sections/DifferentialsSection.tsx`

- [ ] **Step 1: Processo (densidade; animações já são framer-motion com useReducedMotion — não mexer)**

- Main: `pt-40 pb-32` → `pt-28 pb-16 md:pt-40 md:pb-32`.
- Hero da página: `mb-14` → `mb-8 md:mb-14`; parágrafo `text-lg` → `text-base md:text-lg`.
- Toggle (`ViewToggle`, botões `px-6 py-5`): `px-4 py-3.5 md:px-6 md:py-5`; ícone container `h-12 w-12` → `h-10 w-10 md:h-12 md:w-12`; `mb-16` do wrapper → `mb-8 md:mb-16`.
- Cards de etapa (`p-8 rounded-[2rem]`): `p-5 md:p-8`.
- CTAs internos (`px-6 py-3 rounded-full`): mantém (já ~48px, ok).
- Grid `lg:grid-cols-6` e timeline: não mexer na estrutura — só espaçamentos `gap-6` → `gap-4 md:gap-6` onde sem prefixo.

- [ ] **Step 2: Sobre (AboutSection + DifferentialsSection)**

- AboutSection: seção com `py-*` sem prefixo → metade no mobile (`py-16 md:py-32` se for `py-32`; conferir valor real no arquivo); h2 `text-3xl md:text-4xl lg:text-5xl` mantém; parágrafos `text-lg` → `text-base md:text-lg` se sem prefixo.
- DifferentialsSection: header `mb-16` → `mb-10 md:mb-16`; grid `sm:grid-cols-2 lg:grid-cols-4 gap-6` → `gap-4 md:gap-6`; cards internos com `p-8`/`p-6` sem prefixo → um degrau menor no mobile (`p-5 md:p-8` / `p-4 md:p-6`).

- [ ] **Step 3: Verificar**

Run: `npm run lint && npx vitest run`
Expected: limpos.

Manual: 375×812 em `/processo` (toggle cabe, timeline flui, dot pulsante ok) e `/sobre`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/institutional/Processo.tsx src/components/sections/AboutSection.tsx src/components/sections/DifferentialsSection.tsx
git commit -m "ux: processo e sobre com densidade mobile"
```

---

### Task 7: Verificação final

**Files:** nenhum novo (correções pontuais se necessário).

- [ ] **Step 1: Suite completa**

Run: `npm run lint && npx vitest run && npm run build`
Expected: tudo limpo (warning de chunk >500kB é pré-existente).

- [ ] **Step 2: Passada manual mobile (viewport 375×812, Safari RDM ou Chrome DevTools)**

| Rota | Checar |
|---|---|
| `/` | hero: 3 chips, drama não corta, CTA proporcional; cards densos; Philosophy sem parallax mas com reveals; form denso |
| `/servicos` | 4 cards ilustrados sem corte, animação de entrada suave |
| `/projetos` | grid 1 coluna, imagens 4:3 |
| `/processo` | toggle cabe na largura, timeline flui, sem jank |
| `/sobre` | seções com ritmo compacto |
| `/orcamento`, `/contato` | form denso, inputs sem zoom ao focar |

- [ ] **Step 3: Passada desktop (1280px)**

Mesmas rotas — única diferença visível permitida: gradiente do hero um tom mais presente (`via-navy/85`).

- [ ] **Step 4: Commit final (se houve correções)**

```bash
git add -A && git commit -m "fix: ajustes finais da verificação mobile da landing"
```
