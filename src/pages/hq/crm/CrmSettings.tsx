import { useState } from 'react';
import { ListOrdered, Zap } from 'lucide-react';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import StageEditor from '@/components/hq/crm/StageEditor';
import RuleEditor from '@/components/hq/crm/RuleEditor';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

type Tab = 'stages' | 'rules';

export default function CrmSettings() {
  const { companyId, loading } = useCrmCompany();
  const [tab, setTab] = useState<Tab>('stages');

  if (loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  const tabs: { key: Tab; label: string; icon: typeof ListOrdered }[] = [
    { key: 'stages', label: 'Etapas do funil', icon: ListOrdered },
    { key: 'rules', label: 'Regras de automação', icon: Zap },
  ];

  return (
    <div className="w-full max-w-[900px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Configurações do CRM</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Personalize o funil e as regras da sua empresa</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === t.key ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        {tab === 'stages' ? <StageEditor /> : <RuleEditor />}
      </div>
    </div>
  );
}
