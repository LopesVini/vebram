import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { UserPlus, Wallet, Trophy, XCircle, Percent, CalendarClock } from 'lucide-react';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClients } from '@/hooks/data/useCrmClients';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmTasks } from '@/hooks/data/useCrmTasks';
import { useCrmActivity } from '@/hooks/data/useCrmActivity';
import { describeInteraction } from '@/hooks/data/useCrmClient';
import { countNewLeads, leadsByStage, pipelineStats, upcomingTasks } from '@/lib/crmDashboard';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function KpiCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof UserPlus; tone: string }) {
  return (
    <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tone}`}><Icon size={17} /></div>
      <p className="text-2xl font-black text-navy dark:text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-sm text-navy dark:text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default function CrmDashboard() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { clients, loading } = useCrmClients(companyId);
  const { stages } = useCrmStages(companyId);
  const { tasks } = useCrmTasks(companyId);
  const { activity } = useCrmActivity(companyId);

  const sevenDaysAgo = useMemo(() => new Date(Date.now() - 7 * 86400000).toISOString(), []);
  const stats = useMemo(() => pipelineStats(clients, stages), [clients, stages]);
  const bars = useMemo(() => leadsByStage(clients, stages), [clients, stages]);
  const newLeads = useMemo(() => countNewLeads(clients, sevenDaysAgo), [clients, sevenDaysAgo]);
  const soon = useMemo(() => upcomingTasks(tasks, 5), [tasks]);
  const stageName = (sid: string | null | undefined) => (sid && stages.find((s) => s.id === sid)?.name) || 'Sem etapa';

  if (companyLoading || loading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy dark:text-white">Painel CRM</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Visão do funil e das próximas ações</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Leads novos (7d)" value={String(newLeads)} icon={UserPlus} tone="bg-blue-50 dark:bg-blue-500/10 text-blue-600" />
        <KpiCard label="Valor do pipeline" value={BRL.format(stats.pipelineValue)} icon={Wallet} tone="bg-violet-50 dark:bg-violet-500/10 text-violet-600" />
        <KpiCard label="Ganhos" value={String(stats.won)} icon={Trophy} tone="bg-green-50 dark:bg-green-500/10 text-green-600" />
        <KpiCard label="Perdidos" value={String(stats.lost)} icon={XCircle} tone="bg-rose-50 dark:bg-rose-500/10 text-rose-600" />
        <KpiCard label="Conversão" value={`${stats.conversionRate}%`} icon={Percent} tone="bg-amber-50 dark:bg-amber-500/10 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leads por etapa */}
        <div className="lg:col-span-2">
          <Card title="Leads por etapa">
            {bars.every((b) => b.count === 0) ? (
              <p className="text-sm text-zinc-400 py-10 text-center">Sem leads para exibir.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#a1a1aa" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#a1a1aa" />
                    <Tooltip
                      cursor={{ fill: 'rgba(59,130,246,0.08)' }}
                      formatter={(v: number, _n, p) => [`${v} lead(s) · ${BRL.format((p.payload as { value: number }).value)}`, 'Etapa']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {bars.map((b) => <Cell key={b.id} fill="#2563eb" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Próximas tarefas */}
        <Card title="Próximas tarefas">
          {soon.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Nenhuma tarefa pendente.</p>}
          <ul className="space-y-2">
            {soon.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-navy dark:text-white truncate">{t.title}</span>
                {t.due_date && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                    <CalendarClock size={11} /> {t.due_date.slice(8, 10)}/{t.due_date.slice(5, 7)}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <Link to="/hq/crm/tasks" className="inline-block mt-3 text-xs font-bold text-blue-600 hover:text-blue-700">Ver todas →</Link>
        </Card>
      </div>

      {/* Atividades recentes */}
      <Card title="Atividades recentes">
        {activity.length === 0 && <p className="text-sm text-zinc-400 py-6 text-center">Nenhuma atividade ainda.</p>}
        <ul className="divide-y divide-zinc-100 dark:divide-white/5">
          {activity.map((a) => (
            <li key={a.id} className="py-2 flex items-center justify-between gap-3">
              <span className="text-sm text-navy dark:text-white truncate">
                {describeInteraction(a, stageName)}
              </span>
              <span className="text-[11px] text-zinc-400 shrink-0">{a.client?.name ?? '—'}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
