# Otimização Mobile do Site Institucional (Landing)

**Data:** 2026-07-04
**Status:** Aprovado (design)

## Objetivo

Levar o mesmo cuidado mobile do portal/HQ para as 7 páginas do site
institucional: densidade de feed no celular (metade do ritmo vertical do
desktop), tipografia e CTAs proporcionais, animações GSAP leves em telas
pequenas. Desktop mantém a identidade — apenas micro-retoques aprovados
(gradiente do hero, consistência de espaçamento).

## Escopo

Páginas: Home (`Index` + `HeroSection` + `Philosophy` + `GetStarted`),
Serviços, Projetos, Processo, Sobre, Orçamento, Contato. Navbar já tem menu
hambúrguer — fora do escopo.

## Abordagem

Polish responsivo nos componentes existentes (Tailwind breakpoints, mobile
primeiro com `md:` restaurando desktop) + um utilitário novo de animação.
Sem lib nova, sem mudança de rota, sem variantes mobile separadas.

## Seção 1 — Fundações globais

- **Espaçamento:** seções `py-32` → `py-16 md:py-32`; headers de seção
  `mb-20` → `mb-10 md:mb-20`. `px-6` mantém.
- **Tipografia:** hero drama `text-7xl` → `text-6xl md:text-8xl lg:text-[10rem]`
  (não corta "Precisão." em 320px); parágrafos `text-lg` → `text-base md:text-lg`.
- **Animações — novo `src/lib/motion.ts`:** helper sobre `gsap.matchMedia()`:
  - Desktop (`≥768px`): timelines completas como hoje.
  - Mobile (`<768px`): versão leve — fade + `y:20`, sem pin/scrub/parallax.
  - `prefers-reduced-motion`: sem animação, conteúdo visível direto.
  - Páginas/sections migram de `gsap.context` cru para o helper.
- **CTAs:** ≥44px de toque, sem exagero: `px-10 py-5 text-lg` →
  `px-7 py-3.5 text-base md:px-10 md:py-5 md:text-lg`.

## Seção 2 — Home

- **Hero:** chips com `flex-wrap` e gap menor (3º chip volta a aparecer no
  mobile); parágrafo `text-base md:text-xl`; CTA compactado; `pb-24` →
  `pb-16 md:pb-32`. Retoque global: gradiente de fundo `via-navy/80` →
  `via-navy/85` (legibilidade, ambas versões).
- **Cards de navegação (3):** `p-10 min-h-[300px]` → `p-6 min-h-0 md:p-10
  md:min-h-[300px]`; título `text-2xl md:text-3xl`; descrição
  `text-base md:text-lg`; ícone decorativo menor no mobile (100 vs 150).
- **Philosophy:** reveal ScrollTrigger vira fade leve no mobile (helper).
- **GetStarted:** `py-16 md:py-32`; inputs com `text-base` (≥16px evita
  zoom automático do iOS).

## Seção 3 — Serviços + Projetos

- **Serviços:** cards ilustrados `h-80` → `h-auto min-h-[16rem] md:h-80`;
  `p-8` → `p-5 md:p-8`.
- **Projetos:** grid `gap-8 md:gap-12` → `gap-6 md:gap-12`; `aspect-[4/3]`
  mantém; título/meta compactos no mobile.

## Seção 4 — Processo

- Mobile: timeline vertical contínua — marcador à esquerda (linha + dot),
  conteúdo à direita, sem pin/scrub; etapas entram com fade+y leve (helper).
- `animate-ping` do dot permanece (leve).
- Grid `lg:grid-cols-6` já empilha; ajustar espaçamentos mobile.
- Desktop intocado.

## Seção 5 — Testes e verificação

- `npm run lint && npx vitest run && npm run build` limpos.
- Manual: Safari Responsive Design Mode (preset iPhone) nas 7 rotas;
  desktop 1280px para confirmar identidade preservada.

## Fora de escopo

- Portal/HQ (já feitos), Navbar/Footer estruturais, novas dependências,
  mudanças de rota ou conteúdo textual.
