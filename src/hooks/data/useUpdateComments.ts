import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/data/useAuth";

export interface UpdateComment {
  id: string;
  update_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_is_admin: boolean;
}

interface CommentRow {
  id: string;
  update_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: { display_name?: string | null; email?: string | null; role?: string | null } | null;
}

function mapRow(c: CommentRow): UpdateComment {
  return {
    id: c.id,
    update_id: c.update_id,
    author_id: c.author_id,
    content: c.content,
    created_at: c.created_at,
    author_name: c.author?.display_name || c.author?.email?.split("@")[0] || "Usuário",
    author_is_admin: c.author?.role === "admin",
  };
}

// Comentários de uma entrega (tabela update_comments). Cliente e equipe
// conversam aqui; a RLS garante que cada um só acessa as suas entregas.
export function useUpdateComments(updateId: string | null | undefined) {
  const { user } = useAuth();
  const [comments, setComments] = useState<UpdateComment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!updateId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("update_comments")
      .select("*, author:profiles!update_comments_author_id_fkey(display_name, email, role)")
      .eq("update_id", updateId)
      .order("created_at", { ascending: true });

    setComments((data ?? []).map(mapRow));
    setLoading(false);
  }, [updateId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function addComment(content: string) {
    if (!user) return { error: new Error("Usuário não autenticado") };
    if (!updateId) return { error: new Error("Entrega inválida") };
    const { data, error } = await supabase
      .from("update_comments")
      .insert({ update_id: updateId, author_id: user.id, content })
      .select("*, author:profiles!update_comments_author_id_fkey(display_name, email, role)")
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, mapRow(data as CommentRow)]);
    }
    return { error };
  }

  async function deleteComment(id: string) {
    const { error } = await supabase.from("update_comments").delete().eq("id", id);
    if (!error) setComments((prev) => prev.filter((c) => c.id !== id));
    return { error };
  }

  return { comments, loading, refetch: fetch, addComment, deleteComment };
}
