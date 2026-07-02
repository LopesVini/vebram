import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  User as UserIcon, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  Save, Calendar, Shield, KeyRound, LogOut, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/data/useAuth";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function passwordScore(pwd: string) {
  let score = 0;
  if (pwd.length >= 8)    score++;
  if (/[A-Z]/.test(pwd))  score++;
  if (/[0-9]/.test(pwd))  score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score; // 0–4
}

const scoreLabel = ["Muito fraca", "Fraca", "Média", "Forte", "Excelente"];
const scoreColor = ["bg-zinc-300", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-green-500"];

// ── Component ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { user, isAdmin, displayName, updateProfile, updatePassword, signOut } = useAuth();
  const { pathname } = useLocation();
  const isHq = pathname.startsWith("/hq");

  // Form state — Account info
  const [name,  setName]  = useState(displayName);
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [city,  setCity]  = useState(user?.user_metadata?.city  || "");
  const [bio,   setBio]   = useState(user?.user_metadata?.bio   || "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Form state — Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd,    setShowPwd]    = useState(false);
  const [savingPwd,  setSavingPwd]  = useState(false);

  // Sync inicial quando o user chega do Supabase
  useEffect(() => {
    setName(displayName);
    setPhone(user?.user_metadata?.phone || "");
    setCity(user?.user_metadata?.city  || "");
    setBio(user?.user_metadata?.bio    || "");
  }, [user, displayName]);

  const role = isAdmin ? "Administrador" : "Cliente";

  const initials = useMemo(() => {
    return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "U";
  }, [name]);

  const profileDirty =
    name  !== displayName ||
    phone !== (user?.user_metadata?.phone || "") ||
    city  !== (user?.user_metadata?.city  || "") ||
    bio   !== (user?.user_metadata?.bio   || "");

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("O nome de exibição não pode ficar vazio."); return; }
    setSavingProfile(true);
    const { error } = await updateProfile({
      display_name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      bio: bio.trim(),
    });
    setSavingProfile(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else       toast.success("Perfil atualizado com sucesso.");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 8)        return toast.error("A nova senha precisa ter ao menos 8 caracteres.");
    if (newPwd !== confirmPwd)    return toast.error("A confirmação não bate com a nova senha.");
    if (passwordScore(newPwd) < 2) return toast.error("Escolha uma senha mais forte.");

    setSavingPwd(true);
    const { error } = await updatePassword(newPwd);
    setSavingPwd(false);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada. Use a nova senha no próximo login.");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    }
  }

  const score = passwordScore(newPwd);

  // ── Tema (varia por área) ──────────────────────────────────────────────────
  const accent = isHq ? "blue" : "primary";
  const accentBtn  = isHq ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                          : "bg-primary hover:bg-primary/90 shadow-primary/20";
  const accentText = isHq ? "text-blue-600 dark:text-blue-400"
                          : "text-primary";
  const accentBg   = isHq ? "from-blue-500 to-violet-500"
                          : "from-primary to-accent";

  return (
    <div className="w-full max-w-[1100px] mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-navy dark:text-white">Meu Perfil</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gerencie suas informações pessoais e de segurança.</p>
      </motion.div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm overflow-hidden"
      >
        <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${accentBg} opacity-90`} />
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 pt-12">
          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${accentBg} ring-4 ring-white dark:ring-navy-light flex items-center justify-center text-white font-black text-3xl shadow-lg shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-navy dark:text-white truncate">{displayName}</h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-zinc-100 dark:bg-white/10 ${accentText} flex items-center gap-1`}>
                <Shield size={10} /> {role}
              </span>
            </div>
            <p className="text-sm text-zinc-500 truncate flex items-center gap-1.5">
              <Mail size={13} /> {user?.email}
            </p>
          </div>
          <div className="hidden sm:block text-right text-xs text-zinc-500">
            <p className="flex items-center justify-end gap-1.5"><Calendar size={12} /> Membro desde</p>
            <p className="font-bold text-navy dark:text-white mt-0.5">{formatDate(user?.created_at)}</p>
          </div>
        </div>
      </motion.div>

      {/* Grid: Informações + Segurança */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Informações da Conta ──────────────────────────────────────── */}
        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSaveProfile}
          className="lg:col-span-2 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-navy dark:text-white flex items-center gap-2">
                <UserIcon size={16} className={accentText} />
                Informações da Conta
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">Estes dados aparecem nas saudações e nas mensagens do sistema.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome de exibição" hint="Aparece em 'Olá, [nome]' pelo sistema.">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex: Vinícius Lacerda"
                className="profile-input"
              />
            </Field>

            <Field label="Email" hint="O email não pode ser alterado por aqui.">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={user?.email || ""}
                  disabled
                  className="profile-input pl-9 opacity-60 cursor-not-allowed"
                />
              </div>
            </Field>

            <Field label="Telefone">
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(31) 9 0000-0000"
                  className="profile-input pl-9"
                />
              </div>
            </Field>

            <Field label="Cidade">
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="ex: Belo Horizonte, MG"
                  className="profile-input pl-9"
                />
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field label="Sobre" hint="Opcional. Uma frase rápida sobre você ou sua função.">
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="ex: Engenheiro civil responsável pelo projeto Alphaville."
                  className="profile-input resize-none"
                />
              </Field>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 pt-5 border-t border-zinc-100 dark:border-white/5">
            <p className="text-xs text-zinc-500">
              {profileDirty
                ? <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertCircle size={12} /> Alterações não salvas</span>
                : <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 size={12} /> Tudo salvo</span>}
            </p>
            <button
              type="submit"
              disabled={!profileDirty || savingProfile}
              className={`flex items-center gap-2 ${accentBtn} disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md`}
            >
              <Save size={14} />
              {savingProfile ? "Salvando…" : "Salvar Alterações"}
            </button>
          </div>
        </motion.form>

        {/* ── Sidebar: Resumo da Conta ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h3 className="font-bold text-navy dark:text-white flex items-center gap-2">
            <Shield size={16} className={accentText} />
            Resumo da Conta
          </h3>

          <InfoRow label="Função"          value={role} />
          <InfoRow label="Conta criada em" value={formatDate(user?.created_at)} />
          <InfoRow label="Último login"    value={formatDate(user?.last_sign_in_at)} />
          <InfoRow label="Email confirmado" value={user?.email_confirmed_at ? "Sim" : "Não"} />

          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-4 py-2.5 rounded-xl transition-colors mt-2"
          >
            <LogOut size={14} /> Sair do sistema
          </button>
        </motion.div>
      </div>

      {/* ── Segurança: Senha ───────────────────────────────────────────── */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleChangePassword}
        className="bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-start justify-between mb-5 gap-4">
          <div>
            <h3 className="font-bold text-navy dark:text-white flex items-center gap-2">
              <KeyRound size={16} className={accentText} />
              Alterar Senha
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Para sua segurança, use uma senha com pelo menos 8 caracteres, números e letras maiúsculas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPwd(s => !s)}
            className="text-xs text-zinc-500 hover:text-navy dark:hover:text-white flex items-center gap-1.5 shrink-0"
          >
            {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPwd ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Senha atual">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                className="profile-input pl-9"
              />
            </div>
          </Field>

          <Field label="Nova senha">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="profile-input pl-9"
              />
            </div>
          </Field>

          <Field label="Confirmar nova senha">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Repita a nova senha"
                className="profile-input pl-9"
              />
            </div>
          </Field>
        </div>

        {/* Indicador de força */}
        {newPwd && (
          <div className="mt-4">
            <div className="flex gap-1 mb-1.5">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i < score ? scoreColor[score] : "bg-zinc-200 dark:bg-white/10"}`} />
              ))}
            </div>
            <p className="text-[11px] text-zinc-500">
              Força da senha: <span className="font-bold text-navy dark:text-white">{scoreLabel[score]}</span>
              {confirmPwd && newPwd !== confirmPwd && (
                <span className="ml-3 text-red-500">• As senhas não coincidem</span>
              )}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end pt-5 border-t border-zinc-100 dark:border-white/5">
          <button
            type="submit"
            disabled={!newPwd || !confirmPwd || savingPwd}
            className={`flex items-center gap-2 ${accentBtn} disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md`}
          >
            <KeyRound size={14} />
            {savingPwd ? "Alterando…" : "Atualizar Senha"}
          </button>
        </div>
      </motion.form>

      {/* Estilos compartilhados via classe utilitária — :where() reduz especificidade
          para que utilitários Tailwind (pl-9, py-2 etc.) consigam sobrescrever. */}
      <style>{`
        :where(.profile-input) {
          width: 100%;
          background: rgb(250 250 250);
          border: 1px solid rgb(228 228 231);
          border-radius: 0.75rem;
          padding-top: 0.625rem;
          padding-right: 0.875rem;
          padding-bottom: 0.625rem;
          padding-left: 0.875rem;
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }
        :where(.profile-input:focus) {
          border-color: ${isHq ? "rgb(37 99 235)" : "rgb(204 88 51)"};
          box-shadow: 0 0 0 3px ${isHq ? "rgba(37,99,235,.12)" : "rgba(204,88,51,.12)"};
        }
        :where(.dark .profile-input) {
          background: rgba(255,255,255,.04);
          border-color: rgba(255,255,255,.10);
          color: white;
        }
      `}</style>
    </div>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-navy dark:text-zinc-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-zinc-500 mt-1">{hint}</span>}
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs py-2 border-b border-zinc-100 dark:border-white/5 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className="font-bold text-navy dark:text-white">{value}</span>
    </div>
  );
}
