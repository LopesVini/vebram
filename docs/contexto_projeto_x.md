# Contexto de Desenvolvimento: Vertice Zenith (Área do Cliente / SaaS B2B)

**Resumo Executivo:** O site institucional da Vertice Engineering foi expandido para atuar como um software SaaS B2B. O objetivo é fornecer uma "Área do Cliente" de altíssima fidelidade onde clientes com orçamentos fechados podem acompanhar o andamento da obra (Cronograma Físico-Financeiro), conversar com a equipe técnica e visualizar o modelo 3D (BIM) da edificação em tempo real e de forma gratuita, sem a necessidade de licenças de terceiros (como Autodesk). 

---

## 🛠️ Stack Tecnológica Atual
- **Frontend:** React, Vite, Tailwind CSS v3.
- **Animações:** GSAP (ScrollTrigger, Staggers) e Framer Motion (Modais, Chat).
- **Gráficos e UI:** Recharts (Gráficos), Lucide React (Ícones).
- **Visualizador 3D (BIM):** `@thatopen/components` e `three.js` (Renderização de arquivos `.IFC` no navegador).
- **Backend / DB:** Supabase (Autenticação e PostgreSQL).
- **Padrão de Qualidade:** Protocolo de Desenvolvimento "VLAEG".

---

## ✅ O que já foi desenvolvido (Frontend & UX concluídos)

1. **Arquitetura Multi-Tenant (Bando de Dados):**
   - O schema do banco (`supabase_schema.sql`) já foi estruturado focando em escalabilidade SaaS.
   - Regra rígida estabelecida: Todas as tabelas possuem `tenant_id` atrelado ao `client_id`.
   - Políticas RLS (Row Level Security) já planejadas para isolamento total de dados entre clientes.

2. **Fluxo de Autenticação (`useAuth.tsx`):**
   - Rota `/login` construída com estética premium e aviso de acesso restrito (sem *sign-up* público).
   - Roteamento no `App.tsx` já protegido: rotas dentro de `/portal` exigem sessão ativa.

3. **Dashboard do Cliente (`ProjectDashboard.tsx`):**
   - **Estética "Cyber-Organic":** O painel possui design luxuoso e técnico usando Azul Marinho profundo (`bg-navy-dark`), fontes Monospace e tipografia limpa.
   - **Módulos Concluídos na Tela:**
     - Top Widgets (Progresso Físico %, Desvios de Prazo, Ocorrências).
     - Gráfico Recharts exibindo evolução "Previsto vs Realizado" em linha do tempo.
     - Widget interativo de "Equipe Ativa" / Ranking.
     - Indicador abstrato animado de Status do Modelo BIM.
     - Sidebar de Notificações / Feed de Atualizações com relógio retrô-digital.
   - **Chat Integrado:** Um componente de chat flutuante foi implementado no Dashboard (abrindo ao clicar em "NOVA MENSAGEM") simulando um mensageiro corporativo focado no projeto.

4. **Visualizador BIM (`ThreeDViewer.tsx`):**
   - Lógica do motor gráfico base inicializada. Preparado para receber arquivos de nuvem.

---

## 🚧 Próximo Passo Imediato (Foco do Novo Chat)

A estética da **Fase 1 (Frontend do Cliente)** foi totalmente resolvida e aprovada.

**O Próximo Objetivo é construir a FASE 2: O Painel Administrativo Oculto (Equipe Interna).**
1. Precisamos criar uma rota separada (ex: `/admin` ou `/hq`) exclusiva para os engenheiros/gestores da Vertice.
2. Neste painel, a equipe irá:
   - Cadastrar novos Projetos e Clientes (Gerar credenciais de acesso).
   - Fazer upload dos modelos `.IFC` para o Supabase Storage.
   - Atualizar a porcentagem de conclusão (%) e os desvios de prazo.
   - Enviar mensagens para abastecer o Chat e as Notificações do Dashboard do Cliente.
3. Conectar todos esses inputs do Admin para gravar no **Supabase** e substituir os *Mock Datas* (dados falsos) que estão renderizando atualmente no Dashboard do Cliente.

---

*Nota para o Agente IA do novo chat:* O usuário exige excelência visual cinematográfica ("1:1 Pixel Perfect") e pragmatismo. Sem interfaces genéricas, foque em criar um ambiente que pareça um instrumento militar/arquitetônico de precisão. O arquivo `gemini.md` no root contém os presets completos da marca.
