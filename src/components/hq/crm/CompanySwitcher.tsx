import { Building2, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import type { MembershipWithCompany } from '@/hooks/data/crmTypes';

// Apresentação pura — testável sem contexto.
export function CompanySwitcherView({
  companies, companyId, onSelect,
}: {
  companies: MembershipWithCompany[];
  companyId: string | null;
  onSelect: (id: string) => void;
}) {
  if (companies.length < 2) return null;
  const active = companies.find((m) => m.company_id === companyId)?.company;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-full pl-3 pr-2.5 py-2 text-sm text-navy dark:text-white shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-colors">
          <Building2 size={15} className="text-zinc-400 shrink-0" />
          <span className="font-semibold truncate max-w-[8rem]">{active?.name ?? 'Empresa'}</span>
          <ChevronDown size={13} className="text-zinc-400 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-navy border-zinc-200 dark:border-white/10 text-navy dark:text-white rounded-xl shadow-2xl">
        {companies.map((m) => (
          <DropdownMenuItem
            key={m.company_id}
            onClick={() => onSelect(m.company_id)}
            className="cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between"
          >
            <span className="truncate">{m.company.name}</span>
            {m.company_id === companyId && <Check size={14} className="text-blue-600 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function CompanySwitcher() {
  const { companies, companyId, setCompanyId } = useCrmCompany();
  return <CompanySwitcherView companies={companies} companyId={companyId} onSelect={setCompanyId} />;
}
