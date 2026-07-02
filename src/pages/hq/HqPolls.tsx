import { useState } from "react";
import { Plus, X, BarChart3 } from "lucide-react";
import { useTheVertice, TheVerticePoll } from "@/hooks/data/useTheVertice";
import { profileName, timeAgo, avatarColor, initials } from "@/lib/theVertice";
import { Avatar, VerifiedBadge, PageHeader, Card, EmptyState } from "@/components/hq/thevertice/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function HqPolls() {
  const { polls, profiles, myProfile, addPoll, votePoll, loading } = useTheVertice();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"geral" | "reuniao">("geral");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [saving, setSaving] = useState(false);

  const userName = (id: string) => profileName(profiles.find((p) => p.id === id));

  function onType(v: "geral" | "reuniao") {
    setType(v);
    if (v === "reuniao") {
      setOptions(["🖥️ Online (Google Meet)", "🏢 Presencial (escritório)"]);
      if (!question.trim()) setQuestion("Reunião de alinhamento — qual o formato?");
    }
  }

  function reset() {
    setType("geral");
    setQuestion("");
    setOptions(["", ""]);
  }

  async function submit() {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q) return alert("Escreva a pergunta da enquete.");
    if (opts.length < 2) return alert("Adicione pelo menos 2 opções.");
    setSaving(true);
    const { error } = await addPoll(q, opts);
    setSaving(false);
    if (error) return alert(error.message);
    setOpen(false);
    reset();
  }

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <PageHeader
        eyebrow="Decisões da equipe"
        title="Enquetes"
        action={
          <button
            onClick={() => {
              reset();
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors"
          >
            <Plus size={16} /> Nova enquete
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-zinc-400 text-center py-16">Carregando enquetes…</p>
      ) : polls.length === 0 ? (
        <Card>
          <EmptyState title="Nenhuma enquete ainda">
            Crie a primeira para decidir reuniões e prazos com a equipe.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} meId={myProfile?.id} userName={userName} onVote={votePoll} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white dark:bg-navy border-zinc-200 dark:border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-navy dark:text-white">Nova Enquete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Tipo</label>
              <select
                value={type}
                onChange={(e) => onType(e.target.value as "geral" | "reuniao")}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-blue-400"
              >
                <option value="geral">Enquete geral</option>
                <option value="reuniao">Reunião (Online / Presencial)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Pergunta</label>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex: Qual o melhor horário para a reunião?"
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1.5">Opções</label>
              <div className="space-y-2">
                {options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={o}
                      onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="Opção…"
                      className="flex-1 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-blue-400"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                        className="w-11 rounded-xl border border-zinc-200 dark:border-white/10 text-red-500 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setOptions((prev) => [...prev, ""])}
                className="mt-2 px-3 py-2 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300"
              >
                + Adicionar opção
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
              >
                {saving ? "Criando…" : "Criar enquete"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PollCard({
  poll,
  meId,
  userName,
  onVote,
}: {
  poll: TheVerticePoll;
  meId?: string;
  userName: (id: string) => string;
  onVote: (pollId: string, optionId: string) => Promise<{ error: unknown }>;
}) {
  const total = poll.options.reduce((s, o) => s + o.voters.length, 0);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <Avatar id={poll.author_id} name={userName(poll.author_id)} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-navy dark:text-white flex items-center gap-1">
            {userName(poll.author_id)} <VerifiedBadge />
          </div>
          <div className="text-xs text-zinc-500">Enquete · {timeAgo(poll.created_at)}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
          <BarChart3 size={12} /> {total} voto{total !== 1 ? "s" : ""}
        </span>
      </div>
      <h3 className="text-base font-bold text-navy dark:text-white mb-3">{poll.question}</h3>
      <div className="space-y-2.5">
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.voters.length / total) * 100) : 0;
          const mine = meId ? o.voters.includes(meId) : false;
          return (
            <button
              key={o.id}
              onClick={() => onVote(poll.id, o.id)}
              className={`relative w-full rounded-xl border px-4 py-3 overflow-hidden text-left transition-colors ${
                mine ? "border-green-500" : "border-zinc-200 dark:border-white/10 hover:border-green-400/60"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 transition-all bg-green-500/10 dark:bg-green-500/20"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-navy dark:text-white">
                  {mine && "✓ "}
                  {o.text}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="flex">
                    {o.voters.slice(0, 5).map((vid) => (
                      <span
                        key={vid}
                        title={userName(vid)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold -ml-1.5 border-2 border-white dark:border-navy"
                        style={{ background: avatarColor(vid) }}
                      >
                        {initials(userName(vid))}
                      </span>
                    ))}
                  </span>
                  <span className="text-sm font-bold text-zinc-500 min-w-[40px] text-right">{pct}%</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
