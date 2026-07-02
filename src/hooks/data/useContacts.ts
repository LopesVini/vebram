import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/data/useAuth";

export interface Contact {
  id: string;
  display_name: string;
  email: string;
  unread_count: number;
}

export function useContacts() {
  const { user, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargo decidido por profiles.role (via useAuth), não pelo texto do e-mail.
  const myRole = isAdmin ? "admin" : "client";
  const targetRole = myRole === "admin" ? "client" : "admin";

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Garante que o próprio perfil existe no banco
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name:
          user.user_metadata?.display_name ||
          user.email?.split("@")[0] ||
          "Usuário",
        email: user.email,
        role: myRole,
      },
      { onConflict: "id" }
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .eq("role", targetRole);

    if (!profiles) {
      setLoading(false);
      return;
    }

    const { data: unread } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .is("read_at", null);

    const unreadMap: Record<string, number> = {};
    unread?.forEach((m) => {
      unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1;
    });

    setContacts(
      profiles.map((p) => ({
        ...p,
        unread_count: unreadMap[p.id] || 0,
      }))
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function markContactRead(contactId: string) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, unread_count: 0 } : c))
    );
  }

  function incrementUnread(senderId: string) {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === senderId ? { ...c, unread_count: c.unread_count + 1 } : c
      )
    );
  }

  return { contacts, loading, myRole, markContactRead, incrementUnread, refetch: fetchContacts };
}
