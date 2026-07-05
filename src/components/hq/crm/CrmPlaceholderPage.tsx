import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

interface CrmPlaceholderPageProps {
  title: string;
}

// Shell compartilhado pelas páginas do CRM ainda não implementadas: cuida do
// guard de carregamento/sem-acesso (idêntico nas seis rotas) e mostra só o
// título + "Em breve." — evita duplicar o mesmo guard seis vezes.
export function CrmPlaceholderPage({ title }: CrmPlaceholderPageProps) {
  const { companyId, loading } = useCrmCompany();
  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy dark:text-white">{title}</h1>
      <p className="text-sm text-zinc-500 mt-1">Em breve.</p>
    </div>
  );
}
