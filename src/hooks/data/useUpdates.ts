import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Update {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  author_name: string;
  color: string; // Used for timeline styling status: 'bg-green-500' | 'bg-accent' | 'bg-primary'
  image?: string | null; // Optional base64 image from integrated posts
  created_at: string;
}

export function useUpdates(projectId: string | null | undefined) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Canal oficial para o cliente: SOMENTE a tabela "updates", publicada
    // de propósito pela equipe. O Mural (posts) é 100% interno e nunca é
    // mesclado aqui — nada chega ao cliente por acidente.
    const { data } = await supabase
      .from("updates")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    setUpdates((data as Update[]) || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  async function saveUpdate(u: Omit<Update, "id" | "created_at">) {
    const { data, error } = await supabase.from("updates").insert(u).select().single();
    if (!error && data) setUpdates((prev) => [data as Update, ...prev]);
    return { error };
  }

  async function deleteUpdate(id: string) {
    const { error } = await supabase.from("updates").delete().eq("id", id);
    if (!error) setUpdates((prev) => prev.filter((u) => u.id !== id));
    return { error };
  }

  return { updates, loading, refetch: fetch, saveUpdate, deleteUpdate };
}
