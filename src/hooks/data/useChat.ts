import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/data/useAuth";

export interface ChatMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export function useChat(partnerId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || !partnerId) {
      setMessages([]);
      return;
    }

    // Carrega histórico
    supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages(data || []));

    // Canal único por receptor — evita conflito quando dois usuários usam o mesmo nome de canal
    const channelName = `chat:recv:${user.id}:from:${partnerId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const msg = payload.new as ChatMsg;
          if (msg.sender_id === partnerId) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user?.id, partnerId]);

  async function sendMessage(content: string) {
    if (!user || !partnerId || !content.trim() || sending) return;
    setSending(true);

    // Optimistic update
    const optimistic: ChatMsg = {
      id: `opt-${Date.now()}`,
      sender_id: user.id,
      receiver_id: partnerId,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { data } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: partnerId, content: content.trim() })
      .select()
      .single();

    // Substitui o optimistic pelo registro real
    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? (data as ChatMsg) : m))
      );
    }

    setSending(false);
  }

  async function markRead() {
    if (!user || !partnerId) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("receiver_id", user.id)
      .eq("sender_id", partnerId)
      .is("read_at", null);
  }

  function clearMessages() { setMessages([]); }

  return { messages, sendMessage, sending, markRead, clearMessages };
}
