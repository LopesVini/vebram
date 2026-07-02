import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Mail, Phone, MapPin, Briefcase, ChevronRight, Star, MoreHorizontal, X, UserPlus, Loader2, Inbox, Trash2, AlertTriangle, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type ClientStatus = "Ativo" | "Em Pausa" | "Concluído";

interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  status: ClientStatus;
  projects: number;
  since: string;
  vip: boolean;
  initials: string;
  color: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS = ["bg-blue-500","bg-violet-500","bg-orange-500","bg-teal-500","bg-rose-500","bg-cyan-500","bg-slate-500","bg-pink-500","bg-green-500","bg-indigo-500","bg-amber-500","bg-purple-500"];

const statusStyles: Record<ClientStatus, string> = {
  "Ativo":     "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400",
  "Em Pausa":  "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Concluído": "bg-zinc-100  dark:bg-white/10      text-zinc-500  dark:text-zinc-400",
};

function makeInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function colorFromId(id: string) {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function fmtSince(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    .replace(".", "").replace(/^\w/, c => c.toUpperCase());
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email, created_at, metadata")
      .eq("role", "client");

    if (!profiles) { setLoading(false); return; }

    const { data: projCounts } = await supabase
      .from("projects")
      .select("client_id");

    const countMap: Record<string, number> = {};
    for (const p of projCounts ?? []) {
      countMap[p.client_id] = (countMap[p.client_id] ?? 0) + 1;
    }

    const real: Client[] = profiles.map(p => ({
      id:       p.id,
      name:     p.display_name || p.email?.split("@")[0] || "Cliente",
      company:  p.metadata?.company || "Particular",
      email:    p.email || "",
      phone:    p.metadata?.phone || "—",
      city:     p.metadata?.city || "—",
      status:   (p.metadata?.status as ClientStatus) || "Ativo",
      vip:      p.metadata?.vip === true,
      projects: countMap[p.id] ?? 0,
      since:    fmtSince(p.created_at),
      initials: makeInitials(p.display_name || p.email || "?"),
      color:    colorFromId(p.id),
    }));

    setClients(real);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Chama a Edge Function "manage-client" (roda no servidor, com a chave-mestra
  // secreta) e extrai a mensagem de erro de forma amigável.
  async function callManageClient(payload: Record<string, unknown>): Promise<{ error: Error | null }> {
    const { data, error } = await supabase.functions.invoke("manage-client", { body: payload });
    if (error) {
      let msg = error.message;
      try {
        const withContext = error as { context?: { json?: () => Promise<{ error?: string }> } };
        const ctx = await withContext.context?.json?.();
        if (ctx?.error) msg = ctx.error;
      } catch { /* mantém msg padrão */ }
      return { error: new Error(msg) };
    }
    const body = data as { error?: string } | null;
    if (body?.error) return { error: new Error(body.error) };
    return { error: null };
  }

  async function addClient(form: { name: string; company: string; email: string; phone: string; city: string; status: ClientStatus; vip: boolean; password: string }) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", form.email.trim().toLowerCase())
      .maybeSingle();

    // Já existe: atualiza os dados (não recria a conta de login).
    if (existing) {
      const { error } = await callManageClient({
        action: "update",
        id: existing.id,
        name: form.name.trim(),
        company: form.company, phone: form.phone, city: form.city, status: form.status, vip: form.vip,
      });
      if (error) return { error };
      await load();
      return { error: null };
    }

    // Novo: cria a conta de login (com senha) + a ficha, no servidor.
    const { error } = await callManageClient({
      action: "create",
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      company: form.company, phone: form.phone, city: form.city, status: form.status, vip: form.vip,
    });
    if (!error) await load();
    return { error };
  }

  async function deleteClient(id: string) {
    const { error } = await callManageClient({ action: "delete", id });
    if (!error) setClients(prev => prev.filter(c => c.id !== id));
    return { error };
  }

  return { clients, loading, addClient, deleteClient };
}

// ── Client Card ───────────────────────────────────────────────────────────────

function ClientCard({ client, index, onDelete }: { client: Client; index: number; onDelete: (c: Client) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3, boxShadow: "0 12px 28px rgba(0,0,0,0.09)" }}
      className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 cursor-pointer group transition-shadow"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${client.color} flex items-center justify-center text-white font-black text-sm shadow-md`}>
            {client.initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-navy dark:text-white leading-tight group-hover:text-blue-600 transition-colors">{client.name}</h3>
              {client.vip && <Star size={12} className="text-amber-400 fill-amber-400" />}
            </div>
            <p className="text-[11px] text-zinc-500">{client.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusStyles[client.status]}`}>
            {client.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(client); }}
            className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
          >
            <Trash2 size={14} />
          </button>
          <button className="text-zinc-400 hover:text-navy dark:hover:text-white transition-colors opacity-0 group-hover:opacity-100">
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Mail size={11} className="shrink-0 text-zinc-400" /><span className="truncate">{client.email}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Phone size={11} className="shrink-0 text-zinc-400" /><span>{client.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <MapPin size={11} className="shrink-0 text-zinc-400" /><span>{client.city}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          <Briefcase size={11} className="text-zinc-400" />
          <span>{client.projects} projeto{client.projects !== 1 ? "s" : ""}</span>
          <span className="text-zinc-300 dark:text-zinc-600 mx-1">•</span>
          <span>desde {client.since}</span>
        </div>
        <ChevronRight size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
      </div>
    </motion.div>
  );
}

// ── New Client Modal ──────────────────────────────────────────────────────────

const EMPTY = { name: "", company: "", email: "", phone: "", city: "", status: "Ativo" as ClientStatus, vip: false, password: "" };

function NewClientModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = "Informe o nome.";
    if (!form.email.trim()) e.email = "Informe o email.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Email inválido.";
    if (!form.password)  e.password = "Defina uma senha de acesso.";
    else if (form.password.length < 6) e.password = "A senha deve ter ao menos 6 caracteres.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const { error } = await (onSave as unknown as ReturnType<typeof useClients>["addClient"])(form);
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar cliente: " + error.message);
    } else {
      toast.success(`Cliente "${form.name.trim()}" cadastrado com sucesso.`);
      onClose();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-lg bg-white dark:bg-[#111827] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <UserPlus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-navy dark:text-white text-sm">Novo Cliente</h2>
              <p className="text-[11px] text-zinc-500">Preencha os dados do cliente</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-navy dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <MField label="Nome *" error={errors.name} className="col-span-2">
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="ex: Carlos Alberto Silva" className="modal-input" />
            </MField>

            <MField label="Empresa">
              <input value={form.company} onChange={e => set("company", e.target.value)} placeholder="ex: Silva & Cia. (ou Particular)" className="modal-input" />
            </MField>

            <MField label="Cidade">
              <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="ex: Belo Horizonte" className="modal-input" />
            </MField>

            <MField label="Email *" error={errors.email} className="col-span-2">
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="ex: contato@empresa.com" className="modal-input" />
            </MField>

            <MField label="Senha de acesso *" error={errors.password} className="col-span-2">
              <div className="relative">
                <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={e => set("password", e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="modal-input"
                  style={{ paddingLeft: "2rem", paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-navy dark:hover:text-white p-1"
                  tabIndex={-1}
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Você define a senha inicial e a repassa ao cliente (ele pode trocá-la depois).</p>
            </MField>

            <MField label="Telefone">
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="ex: 31 99999-0000" className="modal-input" />
            </MField>

            <MField label="Status">
              <select value={form.status} onChange={e => set("status", e.target.value as ClientStatus)} className="modal-input">
                <option>Ativo</option>
                <option>Em Pausa</option>
                <option>Concluído</option>
              </select>
            </MField>

            <label className="col-span-2 flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => set("vip", !form.vip)}
                className={`w-10 h-5 rounded-full transition-colors relative ${form.vip ? "bg-amber-400" : "bg-zinc-200 dark:bg-white/10"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.vip ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs font-bold text-navy dark:text-zinc-300 flex items-center gap-1.5">
                <Star size={12} className={form.vip ? "text-amber-400 fill-amber-400" : "text-zinc-400"} />
                Cliente VIP
              </span>
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100 dark:border-white/10">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-navy dark:hover:text-white bg-zinc-100 dark:bg-white/5 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin" />}
              Cadastrar Cliente
            </button>
          </div>
        </form>
      </motion.div>

      <style>{`
        :where(.modal-input) {
          width: 100%;
          background: rgb(249 250 251);
          border: 1px solid rgb(228 228 231);
          border-radius: 0.625rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.813rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 150ms;
        }
        :where(.modal-input:focus) { border-color: rgb(37 99 235); }
        :where(.dark .modal-input) {
          background: rgba(255,255,255,.05);
          border-color: rgba(255,255,255,.10);
          color: white;
        }
        :where(.dark .modal-input option) { background: #111827; }
      `}</style>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
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
          Tem certeza que deseja excluir o cliente <span className="font-bold text-navy dark:text-white">"{name}"</span>?
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

export default function HqClients() {
  const { clients, loading, addClient, deleteClient } = useClients();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search,    setSearch]   = useState("");
  const [filter,    setFilter]   = useState<ClientStatus | "Todos">("Todos");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { error } = await deleteClient(deleteTarget.id);
    if (error) toast.error("Erro ao excluir cliente.");
    else toast.success(`Cliente "${deleteTarget.name}" excluído.`);
    setDeleteTarget(null);
  }

  const summary = useMemo(() => [
    { label: "Total de Clientes", value: clients.length,                                      color: "text-navy dark:text-white"         },
    { label: "Ativos",            value: clients.filter(c => c.status === "Ativo").length,     color: "text-green-600 dark:text-green-400" },
    { label: "VIP",               value: clients.filter(c => c.vip).length,                    color: "text-amber-500"                     },
    { label: "Concluídos",        value: clients.filter(c => c.status === "Concluído").length, color: "text-zinc-500"                      },
  ], [clients]);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
    const matchFilter = filter === "Todos" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy dark:text-white">Gestão de Clientes</h1>
          <p className="text-sm text-zinc-500 mt-0.5">CRM — portfólio completo de clientes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Buscar cliente ou cidade..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-navy dark:text-white focus:outline-none focus:border-blue-500 transition-colors shadow-sm" />
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-md shadow-blue-500/20">
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summary.map((s, i) => (
          <div key={i} className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filter Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex gap-2 flex-wrap">
        {(["Todos", "Ativo", "Em Pausa", "Concluído"] as const).map(tab => (
          <button key={tab}
            onClick={() => setFilter(tab === "Todos" ? "Todos" : tab as ClientStatus)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === tab
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-navy dark:hover:text-white"
            }`}>
            {tab}
          </button>
        ))}
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-2 text-zinc-400">
          <Loader2 size={20} className="animate-spin" /> Carregando clientes...
        </div>
      )}

      {/* Empty */}
      {!loading && clients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
          <Inbox size={40} className="opacity-30" />
          <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
        </div>
      )}

      {/* Client Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((client, i) => <ClientCard key={client.id} client={client} index={i} onDelete={setDeleteTarget} />)}
          </AnimatePresence>
          {filtered.length === 0 && clients.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="col-span-full text-center py-16 text-zinc-400">
              Nenhum cliente encontrado{search ? ` para "${search}"` : ""}.
            </motion.div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <NewClientModal
            onClose={() => setShowModal(false)}
            onSave={addClient as unknown as () => void}
          />
        )}
        {deleteTarget && (
          <ConfirmDeleteModal
            name={deleteTarget.name}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function MField({ label, error, children, className = "" }: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-bold text-navy dark:text-zinc-300 mb-1.5">{label}</span>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </label>
  );
}
