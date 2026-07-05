import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Loader2, Inbox, Trash2, Pencil, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCrmCompany } from '@/hooks/data/useCrmCompany';
import { useCrmClients, filterSortClients, type LeadFilter, type LeadSort, type NewLead } from '@/hooks/data/useCrmClients';
import { useCrmStages } from '@/hooks/data/useCrmStages';
import { useCrmMembers } from '@/hooks/data/useCrmMembers';
import LeadFormDialog from '@/components/hq/crm/LeadFormDialog';
import { CrmLoading, CrmNoAccess } from '@/components/hq/crm/CrmStates';
import type { Client } from '@/hooks/data/crmTypes';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function CrmLeads() {
  const { companyId, loading: companyLoading } = useCrmCompany();
  const { clients, loading, saveClient, updateClient, deleteClient, moveClientStage } = useCrmClients(companyId);
  const { stages } = useCrmStages(companyId);
  const { members } = useCrmMembers(companyId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeadFilter>({ stageId: 'all', ownerId: 'all', source: 'all' });
  const [sort, setSort] = useState<LeadSort>('recent');
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') { setShowNew(true); setSearchParams({}, { replace: true }); }
  }, [searchParams, setSearchParams]);

  const stageById = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])), [stages]);
  const visible = useMemo(() => filterSortClients(clients, search, filter, sort), [clients, search, filter, sort]);

  const summary = useMemo(() => {
    const total = clients.length;
    const pipelineValue = clients.reduce((sum, c) => sum + (c.estimated_value ?? 0), 0);
    const won = clients.filter((c) => stageById[c.stage_id ?? '']?.stage_type === 'won').length;
    const lost = clients.filter((c) => stageById[c.stage_id ?? '']?.stage_type === 'lost').length;
    return { total, pipelineValue, won, lost };
  }, [clients, stageById]);

  async function handleSubmit(lead: NewLead, id?: string) {
    return id ? updateClient(id, lead) : saveClient(lead);
  }
  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await deleteClient(deleteTarget.id);
    if (error) toast.error('Erro ao excluir lead.'); else toast.success(`Lead "${deleteTarget.name}" excluído.`);
    setDeleteTarget(null);
  }
  async function changeStage(c: Client, stageId: string) {
    const { error } = stageId
      ? await moveClientStage(c.id, stageId)
      : await updateClient(c.id, { stage_id: null });
    if (error) toast.error('Erro ao mudar etapa.');
  }
  async function changeOwner(c: Client, ownerId: string) {
    const { error } = await updateClient(c.id, { owner_id: ownerId || null });
    if (error) toast.error('Erro ao mudar responsável.');
  }

  if (companyLoading) return <CrmLoading />;
  if (!companyId) return <CrmNoAccess />;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white">Leads</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Clientes e oportunidades do funil</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead ou origem..."
              className="w-56 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
            <Plus size={16} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Leads', value: String(summary.total), color: 'text-navy dark:text-white' },
          { label: 'Valor do Pipeline', value: BRL.format(summary.pipelineValue), color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Ganhos', value: String(summary.won), color: 'text-green-600 dark:text-green-400' },
          { label: 'Perdidos', value: String(summary.lost), color: 'text-rose-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilter((f) => ({ ...f, stageId: 'all' }))}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter.stageId === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white'}`}>
          Todas etapas
        </button>
        {stages.map((s) => (
          <button key={s.id} onClick={() => setFilter((f) => ({ ...f, stageId: s.id }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter.stageId === s.id ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white'}`}>
            {s.name}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value as LeadSort)}
          className="ml-auto bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-500 focus:outline-none">
          <option value="recent">Mais recentes</option>
          <option value="value">Maior valor</option>
          <option value="name">Nome (A–Z)</option>
        </select>
      </div>

      {/* List */}
      {loading && <div className="flex items-center justify-center py-20 gap-2 text-zinc-400"><Loader2 size={20} className="animate-spin" /> Carregando leads...</div>}
      {!loading && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <Inbox size={40} className="opacity-30" /><p className="text-sm">Nenhum lead ainda. Crie o primeiro.</p>
        </div>
      )}
      {!loading && clients.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence>
            {visible.map((c) => (
              <motion.div key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
                className="group bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 py-3 flex items-center gap-4 hover:shadow-md transition-shadow">
                <button onClick={() => navigate(`/hq/crm/clients/${c.id}`)} className="flex-1 min-w-0 text-left flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-navy dark:text-white truncate group-hover:text-blue-600 transition-colors">{c.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{c.source || 'Origem não informada'}</p>
                  </div>
                </button>
                <span className="hidden md:block text-sm font-bold text-navy dark:text-white shrink-0">
                  {c.estimated_value != null ? BRL.format(c.estimated_value) : '—'}
                </span>
                <select value={c.stage_id ?? ''} onChange={(e) => changeStage(c, e.target.value)} onClick={(e) => e.stopPropagation()}
                  className="hidden sm:block bg-transparent border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none">
                  <option value="">Sem etapa</option>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={c.owner_id ?? ''} onChange={(e) => changeOwner(c, e.target.value)} onClick={(e) => e.stopPropagation()}
                  className="hidden lg:block bg-transparent border border-zinc-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none max-w-[9rem]">
                  <option value="">Sem responsável</option>
                  {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditTarget(c)} className="p-1.5 text-zinc-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all" aria-label="Editar"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all" aria-label="Excluir"><Trash2 size={14} /></button>
                  <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {visible.length === 0 && <p className="text-center py-14 text-zinc-400 text-sm">Nenhum lead encontrado{search ? ` para "${search}"` : ''}.</p>}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showNew || editTarget) && (
          <LeadFormDialog
            initial={editTarget}
            stages={stages}
            members={members}
            onClose={() => { setShowNew(false); setEditTarget(null); }}
            onSubmit={handleSubmit}
          />
        )}
        {deleteTarget && (
          <ConfirmDelete name={deleteTarget.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Confirmação de exclusão — mirror da estrutura de HqClients.tsx:404-441 (mesmas classes),
// com a cópia adaptada para "lead".
function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-sm bg-white dark:bg-[#111827] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-navy dark:text-white">Confirmar exclusão</h3>
            <p className="text-[11px] text-zinc-500">Esta ação não pode ser desfeita</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
          Tem certeza que deseja excluir o lead <span className="font-bold text-navy dark:text-white">"{name}"</span>?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-navy dark:hover:text-white bg-zinc-100 dark:bg-white/5 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-md shadow-red-500/20">
            Excluir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
