import { useState } from "react";
import { Loader2, Send, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/data/useAuth";
import { useUpdateComments } from "@/hooks/data/useUpdateComments";
import { timeAgo } from "@/lib/theVertice";

// Painel de comentários de uma entrega. Reutilizado na área do cliente
// (Registro de Entregas) e no HQ (drawer do projeto) para conversar em cada item.
export default function UpdateComments({ updateId }: { updateId: string }) {
  const { user, isAdmin } = useAuth();
  const { comments, loading, addComment, deleteComment } = useUpdateComments(updateId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const { error } = await addComment(content);
    setSending(false);
    if (error) { toast.error("Não foi possível enviar o comentário."); return; }
    setText("");
  }

  async function remove(id: string) {
    const { error } = await deleteComment(id);
    if (error) toast.error("Não foi possível remover o comentário.");
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/5 font-sans">
      <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-zinc-500 mb-3">
        <MessageSquare size={13} /> COMENTÁRIOS {comments.length > 0 && `(${comments.length})`}
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
          <Loader2 size={14} className="animate-spin" /> Carregando comentários...
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-zinc-400 mb-3">Nenhum comentário ainda. Seja o primeiro a comentar.</p>
      ) : (
        <div className="space-y-3 mb-3">
          {comments.map((c) => {
            const mine = c.author_id === user?.id;
            const canDelete = mine || isAdmin;
            return (
              <div key={c.id} className="flex gap-2.5 group">
                <div className={`mt-0.5 w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${c.author_is_admin ? "bg-blue-600" : "bg-zinc-400 dark:bg-zinc-600"}`}>
                  {(c.author_name[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-navy dark:text-white">{c.author_name}</span>
                    {c.author_is_admin && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">EQUIPE</span>
                    )}
                    <span className="text-[10px] text-zinc-400">{timeAgo(c.created_at)}</span>
                    {canDelete && (
                      <button
                        onClick={() => remove(c.id)}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                        title="Remover comentário"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-black/30 border border-zinc-200 dark:border-white/10 rounded-full pl-3.5 pr-1 py-1 focus-within:border-primary/50 transition-colors">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
          placeholder="Escreva um comentário..."
          className="flex-1 bg-transparent text-xs text-navy dark:text-white placeholder:text-zinc-400 outline-none"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Enviar"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  );
}
