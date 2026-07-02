# Plano de Integração e Refatoração — Vértice e The Vertice

Este plano detalha o diagnóstico das estruturas atuais, a refatoração do layout de pastas para manter o site institucional 100% idêntico, a arquitetura do "The Vertice", a consolidação dos bancos de dados Supabase e as políticas de segurança (RLS).

## User Review Required

> [!WARNING]
> A refatoração da estrutura de pastas moverá todos os arquivos institucionais e de portal para diretórios organizados de forma a preparar o ambiente para receber a integração do app The Vertice. O front-end continuará 100% idêntico, o que será verificado via `npm run build` e validação visual de layout e animações.

> [!IMPORTANT]
> A consolidação do Supabase unificará as bases. A segurança será garantida através de Row Level Security (RLS) baseada na role do usuário (Sócios e Clientes).

## Open Questions

> [!NOTE]
> **Estratégia de Armazenamento de Imagens:** O The Vertice armazena imagens codificadas em base64 no banco de dados. Para a integração, prefere manter esta abordagem de base64 (simples e sem alteração lógica) ou devemos migrar para o Supabase Storage que já está configurado no site principal?
> *Nossa recomendação inicial é prosseguir com base64 para minimizar alterações no frontend do The Vertice, mas podemos migrar para Storage se preferir.*

---

## Diagnóstico da Estrutura Atual

### 1. Vértice (Site Institucional + Área do Cliente)

O projeto principal (`main`) é um SPA construído com **React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui**. As páginas e componentes são divididos de forma simples:

- **Páginas (`src/pages/`):**
  - **Institucional:** `Index.tsx` (página principal), `Sobre.tsx`, `Servicos.tsx`, `Projetos.tsx`, `Processo.tsx`, `Orcamento.tsx`, `Contato.tsx`.
  - **Clientes/Geral:** `ClientLogin.tsx` (login de clientes e equipe), `Profile.tsx` (compartilhado), `NotFound.tsx`.
  - **Portal do Cliente (`src/pages/portal/`):** `ProjectDashboard.tsx`, `BimViewer.tsx`, `ProjectUpdates.tsx`.
  - **HQ Admin (`src/pages/hq/`):** `HqDashboard.tsx`, `HqProjects.tsx`, `HqClients.tsx`.
- **Componentes (`src/components/`):**
  - `sections/`: Seções específicas da página inicial (Hero, Philosophy, etc.).
  - `layout/`: Navbar, Footer, ThemeProvider, ErrorBoundary.
  - `portal/` e `hq/`: Componentes específicos de cada layout.
  - `ui/`: Primitivas do shadcn/ui.
- **Camada de Dados (`src/hooks/data/`):**
  - Geração de hooks customizados para chamadas diretas ao Supabase (ex: `useAuth`, `useProjects`, `useMilestones`, etc.).
  - Controle de Acesso: O acesso ao HQ é restrito a emails contendo `@vertice` ou `admin`. O controle é feito no `HqLayout.tsx`.

### 2. The Vertice (App Interno dos Sócios)

O projeto `the-vertice` é uma aplicação corporativa compacta de arquivo único:

- **Frontend:** Um único arquivo `index.html` contendo markup, CSS customizado inline (~270 linhas) e lógica JS pura vanilla (~700 linhas) sem build step.
- **Conectividade:** Usa CDN para o Supabase client v2 e consome dados do seu próprio banco a partir de credenciais em `config.js`.
- **Interface:** Organizado em seções dinâmicas (Feed, Calendário de Disponibilidade/Carga Horária, Enquetes, Membros, Perfil).
- **Dados:** Mantém um estado global na memória (`state = { profiles, posts, events, polls }`), lê do banco, e recarrega tudo via subscrição em tempo real (`supabase_realtime`) ao detectar mudanças na base.

---

## Etapa 1: Refatoração da Estrutura de Pastas do Site

Para preparar o código para receber o "The Vertice" mantendo a base organizada, propomos separar claramente o código do site institucional (público) das áreas SaaS (portal do cliente e HQ administrativo).

### Proposta de Nova Estrutura de Pastas

```
src/
├── components/
│   ├── ui/               # Primitivas shadcn (compartilhadas)
│   ├── shared/           # Componentes utilitários ou comuns
│   ├── institutional/    # Navbar, Footer e Seções institucionais (antigo sections/ e partes do layout/)
│   ├── portal/           # Layout e componentes do Portal do Cliente
│   └── hq/               # Layout e componentes do HQ / The Vertice
├── pages/
│   ├── institutional/    # Páginas institucionais (Index, Sobre, Servicos, Projetos, Processo, Orcamento, Contato)
│   ├── portal/           # Dashboard do Cliente, Visualizador BIM, etc. + ClientLogin.tsx
│   ├── hq/               # Páginas do HQ (Painel Integrado: Feed, Calendário, Enquetes de The Vertice)
│   ├── Profile.tsx       # Perfil compartilhado
│   └── NotFound.tsx      # Erro 404
```

> [!IMPORTANT]
> **Garantia de Identidade Visual:** Para assegurar que o front-end permaneça 100% idêntico, a refatoração consistirá apenas em mover os arquivos de lugar e atualizar os caminhos de importação.
> Nenhum estilo CSS, JSX ou elemento de animação (GSAP) será alterado.
> Após mover os arquivos, executaremos `npm run build` e testes visuais locais via `npm run dev`.

> [!NOTE]
> **Status da execução (revisão):** As **páginas** foram movidas para `pages/institutional/` e `pages/portal/` e o `App.tsx` foi atualizado — `npm run build` passa. Os **componentes** (`components/sections/`, `components/layout/`) foram mantidos no lugar por ora para minimizar risco de quebra de imports; o site permanece idêntico. A migração dos componentes para `components/institutional/` pode ser feita como passo opcional posterior.

---

## Etapa 2: Diagnóstico Detalhado do The Vertice

O The Vertice opera sobre as seguintes tabelas em seu próprio Supabase:

- `profiles` (estende a tabela padrão com cargo `role` e disciplina `tag` padrão do sócio)
- `posts` (feed interno com título, tags de disciplina, conteúdo e imagens em formato base64)
- `comments` (comentários em posts, com suporte a imagens base64)
- `post_likes` (relação de curtidas em posts)
- `events` (calendário de disponibilidade com datas e notas de férias/ocupado)
- `polls`, `poll_options`, `poll_votes` (enquetes e votações em tempo real)

> [!NOTE]
> **Detalhe de mapeamento de colunas:** O The Vertice original usa `profiles.name` e `profiles.role` (cargo livre, ex: "Arquiteta"). O schema consolidado do Vértice usa `profiles.display_name`, `profiles.role` como papel de acesso (`admin`/`client`), e guarda o cargo em `metadata.role_title`. O hook `useTheVertice.ts` já faz essa tradução.

---

## Etapa 3: Plano de Integração e Consolidação do Supabase

### 1. Consolidação do Banco de Dados (Supabase Único)

Usaremos o banco de dados do Vértice como a base central. Consolidaremos as tabelas do `the-vertice` nele. O script idempotente está em [`docs/consolidated_schema.sql`](consolidated_schema.sql).

### 2. Separação de Dados (Privados vs. Compartilhados)

- **Feed / Posts:**
  - Coluna opcional `project_id` na tabela `posts`.
  - Se `project_id` estiver preenchido (**Compartilhado**), o post é uma atualização do projeto e aparece na timeline do Dashboard do Cliente (integrado via `useUpdates.ts`).
  - Se `project_id` estiver vazio (**Privado**), a publicação é estritamente interna da equipe/sócios.
- **Calendário, Enquetes, Membros:** uso estritamente corporativo interno. Permanecem 100% privados (gated pelo layout do HQ).

### 3. Configuração de RLS (Row Level Security)

- **`profiles`:** Sócios/Equipe veem todos os perfis; Clientes só o próprio. A verificação de "sócio" usa o e-mail do JWT do usuário atual (`is_admin()`), evitando recursão de RLS e o erro de checar o e-mail da linha selecionada.
- **`posts`:** Sócios têm acesso total; Clientes têm leitura **apenas** de posts cujo `project_id` pertença a um projeto deles.
- **`comments`, `post_likes`, `events`, `polls`, `poll_options`, `poll_votes`:** leitura/escrita restritas a Sócios/Equipe.

---

## Plano de Verificação

### Testes Automatizados
```bash
npm run lint
npm run build
```

### Verificação Manual
1. `npm run dev` e navegar pelas páginas institucionais (layout, GSAP e textos idênticos).
2. Login como cliente: acesso limitado do portal.
3. Login como administrador: renderização do HQ integrado (Feed/Calendário/Enquetes/Membros).

---

## Próximos Passos (Ordem de Execução)

1. ~~Obter aprovação do usuário para este plano.~~ ✅
2. ~~Executar a Refatoração de Pastas (páginas) e validar build.~~ ✅
3. **Consolidar o banco (schema + RLS corrigida).** ← em andamento
4. **Implementar a interface do HQ integrando as funcionalidades do The Vertice como componentes React.**
5. **Security Review (`/security-review`) final.**
