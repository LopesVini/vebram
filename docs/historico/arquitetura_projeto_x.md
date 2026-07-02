# Arquitetura do Projeto X (Dashboard & SaaS B2B)

Este documento define os padrões arquiteturais, decisões técnicas e regras de negócio para a construção da "Área do Cliente" e sua futura evolução para um modelo SaaS B2B (Multi-tenant).

**Qualquer desenvolvimento futuro neste projeto deve respeitar rigorosamente as diretrizes abaixo.**

## 1. Visão do Produto
A Área do Cliente não é apenas uma página de status; é um Portal Imersivo onde os clientes da Vertice acompanham em tempo real o andamento de seus projetos, acessam documentos e, o mais importante, navegam no projeto 3D de forma interativa diretamente pelo navegador.

O sistema foi arquitetado desde o dia zero para ser **Multi-tenant**, permitindo que a tecnologia seja licenciada para outros escritórios de engenharia/arquitetura no futuro, isolando completamente os dados entre diferentes inquilinos (Tenants).

## 2. Padrões de Arquitetura de Dados (Multi-tenant)
Todo o backend é sustentado pelo **Supabase (PostgreSQL)**.

### A. Regra de Ouro do Multi-tenant
**Nunca crie uma tabela de dados sem a coluna `tenant_id`.**
A estrutura de segurança de dados (RLS - Row Level Security) depende dessa coluna para garantir que um escritório não acesse os projetos de outro.

* `tenant_id = 1` representa a Vertice Engineering.
* Futuros concorrentes licenciados receberão `tenant_id = 2, 3...`

### B. Schema Principal
1. **`tenants`**: Os escritórios que usam o software.
   - `id`, `name`, `created_at`
2. **`clients`**: Os clientes finais (que farão login para ver os projetos).
   - `id`, `tenant_id`, `name`, `email`, `auth_id` (vinculado ao Supabase Auth)
3. **`projects`**: As obras ou projetos contratados.
   - `id`, `tenant_id`, `client_id`, `name`, `status`, `progress_percentage`, `expected_delivery_date`
4. **`project_milestones`**: Fases do projeto para o gráfico de evolução.
   - `id`, `project_id`, `title`, `is_completed`, `order_index`
5. **`project_updates`**: Feed de notícias/timeline do projeto.
   - `id`, `project_id`, `message`, `created_at`
6. **`project_files`**: Registros de PDFs, memoriais e modelos 3D no Storage.
   - `id`, `project_id`, `file_url`, `file_type` (ex: `pdf`, `ifc`)

### C. Autenticação e Segurança
- O login é fechado. Não existe "Sign up" público.
- A autenticação é gerenciada pelo **Supabase Auth**.
- **RLS (Row Level Security)** deve estar ativo em TODAS as tabelas. As políticas (policies) devem garantir que:
  - Administradores veem todos os dados onde o `tenant_id` seja o da sua empresa.
  - Clientes (usuários finais) veem apenas os projetos vinculados ao seu próprio `client_id`.

## 3. O Visualizador 3D (BIM na Web)
Para manter o custo de infraestrutura 3D da Vertice (e dos futuros clientes SaaS) em **$0/mês**, não utilizamos renderizadores pagos proprietários (como o Autodesk Forge).

**Diretriz Tecnológica para 3D:**
1. **Exportação:** Todo modelo Revit (`.rvt`) deve ser exportado internamente pela equipe para o formato aberto **`.IFC`**.
2. **Armazenamento:** O arquivo `.IFC` é armazenado no `Supabase Storage` (no bucket `projects_assets`).
3. **Renderização no Frontend:** Utilizamos a biblioteca open-source **`That Open Engine`** (evolução do IFC.js) importando `@thatopen/components` e `three`.
4. **Performance (Lazy Loading):** Modelos 3D são pesados. O componente do Viewer deve implementar carregamento assíncrono (lazy loading) e utilizar animações GSAP de carregamento (Loading Screens) para reter a atenção do usuário enquanto o WebAssembly compila a geometria no navegador.

## 4. Padrões de Frontend (Client Portal)
A interface deve seguir a mesma estética premium/cinematográfica do site institucional (Protocolo VLAEG).
- **Stack:** React, Vite, Tailwind CSS, Radix UI (Shadcn), GSAP.
- **Roteamento:** Uso do `react-router-dom` para proteger a rota `/portal` e suas sub-rotas (Dashboard, Viewer 3D). Contexto de Autenticação (`useAuth`) gerenciará sessões.
- **Micro-interações:** Toda transição de dados deve ter peso. O carregamento de gráficos e milestones deve ser acompanhado por animações stagger do GSAP.
