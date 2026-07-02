import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/data/useAuth";

export interface AppNotification {
  id: string;
  actor_id: string | null;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

// Notificações do usuário logado (o RLS já garante que só as dele chegam).
// Novas notificações entram ao vivo via Realtime; marcar como lida é
// otimista (atualiza a tela na hora e persiste no banco em seguida).
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, actor_id, type, title, body, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as AppNotification[]) || []);
  }, [user]);

  useEffect(() => {
    refetch();
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) =>
            prev.some((x) => x.id === n.id) ? prev : [n, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function markRead(id: string) {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n))
    );
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .is("read_at", null);
  }

  async function markAllRead() {
    if (!user) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", user.id)
      .is("read_at", null);
  }

  return { notifications, unreadCount, markRead, markAllRead, refetch };
}

/** "há 5 min", "há 2 h", "há 3 dias" — para exibição no sino. */
export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}
