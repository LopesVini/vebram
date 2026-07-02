-- SCHEMA PROJETO X (MULTI-TENANT SAAS)
-- Cole este script no SQL Editor do Supabase e clique em "Run"

-- 1. Criação da tabela de Tenants (Inquilinos/Escritórios)
CREATE TABLE public.tenants (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insere a Vertice Engineering como o Tenant ID 1
INSERT INTO public.tenants (name) VALUES ('Vertice Engineering');

-- 2. Criação da tabela de Clientes
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Link com a tabela de login do Supabase
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Criação da tabela de Projetos
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id INTEGER NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Em andamento',
    progress_percentage INTEGER DEFAULT 0,
    expected_delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Criação da tabela de Milestones (Etapas)
CREATE TABLE public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Criação da tabela de Atualizações (Timeline)
CREATE TABLE public.project_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Criação da tabela de Arquivos (Storage References)
CREATE TABLE public.project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Caminho do arquivo no bucket do Supabase Storage
    file_type TEXT NOT NULL, -- ex: 'pdf', 'ifc'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Política para Clientes: Um cliente só pode ler sua própria linha (baseado no auth.uid)
CREATE POLICY "Clients can view their own data" ON public.clients
    FOR SELECT USING (auth.uid() = auth_id);

-- Política para Projetos: Um cliente só pode ver projetos associados ao ID dele
CREATE POLICY "Clients can view their own projects" ON public.projects
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM public.clients WHERE auth_id = auth.uid()
        )
    );

-- Política para Milestones: Visível se o projeto associado for visível
CREATE POLICY "Clients can view their project milestones" ON public.project_milestones
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE client_id IN (
                SELECT id FROM public.clients WHERE auth_id = auth.uid()
            )
        )
    );

-- Política para Updates: Visível se o projeto associado for visível
CREATE POLICY "Clients can view their project updates" ON public.project_updates
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE client_id IN (
                SELECT id FROM public.clients WHERE auth_id = auth.uid()
            )
        )
    );

-- Política para Files: Visível se o projeto associado for visível
CREATE POLICY "Clients can view their project files" ON public.project_files
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM public.projects WHERE client_id IN (
                SELECT id FROM public.clients WHERE auth_id = auth.uid()
            )
        )
    );

-- OBSERVAÇÃO PARA ADMINS (Sua Equipe):
-- Neste MVP, se você (Vertice) precisar ler/escrever projetos, você usará a Service Role Key do Supabase (que ignora RLS) no back-end,
-- ou fará via o próprio Dashboard do Supabase. Para usuários finais (Clientes), as regras acima blindam o sistema.
