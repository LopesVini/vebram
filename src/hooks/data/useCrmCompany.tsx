import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/data/useAuth';
import type { MembershipWithCompany, CrmRole } from '@/hooks/data/crmTypes';

const LS_KEY = 'crm-active-company';

// Regra pura de escolha do tenant ativo (testável sem banco).
export function pickActiveCompany(
  memberships: MembershipWithCompany[],
  persistedId: string | null,
): string | null {
  if (memberships.length === 0) return null;
  if (persistedId && memberships.some((m) => m.company_id === persistedId)) return persistedId;
  return memberships[0].company_id;
}

interface CrmCompanyValue {
  companyId: string | null;
  companies: MembershipWithCompany[];
  role: CrmRole | null;
  setCompanyId: (id: string) => void;
  loading: boolean;
}

const Ctx = createContext<CrmCompanyValue | null>(null);

export function CrmCompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<MembershipWithCompany[]>([]);
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setCompanyIdState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select('*, company:companies(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    const list = (data as MembershipWithCompany[]) || [];
    setCompanies(list);
    setCompanyIdState(pickActiveCompany(list, localStorage.getItem(LS_KEY)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setCompanyId = useCallback((id: string) => {
    localStorage.setItem(LS_KEY, id);
    setCompanyIdState(id);
  }, []);

  const role = companies.find((m) => m.company_id === companyId)?.role ?? null;

  return (
    <Ctx.Provider value={{ companyId, companies, role, setCompanyId, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCrmCompany(): CrmCompanyValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCrmCompany precisa estar dentro de <CrmCompanyProvider>');
  return v;
}
