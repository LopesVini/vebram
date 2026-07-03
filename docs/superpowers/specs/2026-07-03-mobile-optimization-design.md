# Otimização Mobile — Portal do Cliente e HQ

**Data:** 2026-07-03
**Status:** Aprovado (design)

## Objetivo

Tornar o app utilizável em celular com densidade de informação estilo Instagram:
chrome mínimo, conteúdo máximo, sem botões gigantes ocupando a tela. Portal do
cliente ganha visualizador BIM em tela cheia sem cards sobrepostos. HQ mobile
foca em Dashboard (gráficos) + The Vertice (rede social interna). Desktop fica
intocado — todas as mudanças valem apenas abaixo do breakpoint `lg` (1024px).

## Abordagem escolhida

**Responsivo puro (Tailwind breakpoints) nos componentes existentes**, mais um
componente compartilhado novo (`MobileTabBar`) e um bottom sheet no BIM viewer.
Sem duplicação de páginas, sem mudança de rotas, sem lib nova, sem mudança de
banco.

Alternativas descartadas: páginas mobile separadas (dobra manutenção) e app
shell adaptativo via `useIsMobile` (complexidade sem ganho sobre CSS responsivo).

## Seção 1 — Navegação e shell mobile (`< lg`)

### Sidebar → bottom tab bar

- Sidebar dos dois layouts (`PortalLayout.tsx`, `HqLayout.tsx`): `hidden lg:flex`.
- Novo componente único `src/components/layout/MobileTabBar.tsx`:
  - Fixo embaixo (`fixed bottom-0`), `lg:hidden`, ~56px de altura +
    `env(safe-area-inset-bottom)`.
  - Recebe lista de abas (ícone + label + rota). Label 10px. Aba ativa em cor
    primária.
- **Portal (4 abas):** Dashboard (`/portal`), BIM (`/portal/bim`),
  Atualizações (`/portal/updates`), Perfil (`/portal/profile`).
- **HQ (5 abas):** Dashboard (`/hq`), Mural (`/hq/feed`),
  Calendário (`/hq/calendar`), Enquetes (`/hq/polls`), Membros (`/hq/members`).
- **HQ mobile não navega para Projetos/Clientes** — sem entrada no tab bar;
  rotas continuam funcionando se acessadas diretamente.
- Conteúdo das páginas ganha `pb-20` no mobile para não ficar atrás do tab bar.

### Headers

- **HQ:** header `h-24` → `h-14` no mobile. Avatar + saudação compactos, data
  escondida. Command palette (⌘K) escondida no mobile. Sino e engrenagem
  permanecem, reduzidos para 36px.
- **Portal:** ganha mini-header apenas no mobile (logo + toggle de tema), já que
  o toggle de tema morava na sidebar que some.

### FloatingChat

- No mobile, botão sobe para `bottom-20` (não briga com o tab bar).

## Seção 2 — Densidade (estilo Instagram)

Princípio: mudanças só abaixo de `lg`. Área de toque mínima 40–44px mantida.

- **Containers de página:** `p-6 lg:p-8` → `px-3 py-4 lg:p-8`.
- **Títulos:** `text-xl lg:text-3xl`; subtítulos compactos ou escondidos no mobile.
- **Portal — ProjectDashboard:**
  - Stat cards: grid 2 colunas no mobile, padding interno `p-3`, números `text-lg`.
  - Timeline de marcos: linhas compactas — ícone 32px, texto 13px, espaçamento
    vertical reduzido.
  - Botões: `h-9 text-sm`; ação primária única pode ser full-width com altura
    máx. 44px.
- **Portal — ProjectUpdates:** feed estilo Instagram — card em largura total,
  imagem edge-to-edge, meta info em uma linha.
- **HQ — Dashboard:** gráficos em 1 coluna, altura ~200px cada; stat tiles em
  grid 2×2 compacto.
- **HQ — Mural (The Vertice):** paddings reduzidos, composer de 1 linha que
  expande ao focar, botões de like/comentário menores com toque ≥ 40px.

## Seção 3 — BIM viewer mobile

- **Canvas em tela cheia real:** `h-[calc(100dvh-56px)]` (desconta tab bar;
  `dvh` lida com barra de URL do navegador móvel). Nenhum card sobreposto.
- **Overlays atuais no mobile:** viram pill mínima com nome do projeto no topo,
  semi-transparente, que desaparece após 3s. Dica de navegação inferior some.
- **Bottom sheet novo (só mobile):** 3 estados — recolhida (alça ~32px), meia
  altura (~45%), cheia (~85%). Conteúdo: busca de peças/pavimentos, lista de
  elementos, info do projeto. Arrastar via pointer events, sem lib nova.
  Canvas continua interativo com sheet recolhida ou em meia altura.
- **Loading/erro:** overlays centrais existentes permanecem.
- **Toque:** verificar orbit/zoom/pan por toque nos OrbitControls; ajustar
  sensibilidade se necessário.
- **Desktop:** painel lateral e overlays intocados.

## Seção 4 — Testes e verificação

- **Vitest:** `MobileTabBar` (abas corretas por área, aba ativa marcada);
  bottom sheet (transições de estado abrem/fecham).
- **Manual:** dev server com viewport 375×812 nas rotas `/portal`,
  `/portal/bim`, `/portal/updates`, `/hq`, `/hq/feed`.

## Fora de escopo

- Site institucional (páginas de marketing).
- Qualquer mudança de banco, rotas ou dependências.
- Layout desktop.
