import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/data/useAuth";

export interface TheVerticeProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  tag: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Formato bruto que o Supabase devolve nos selects com joins,
// antes de convertermos para os tipos de cima.
type PostRow = Omit<TheVerticePost, "views" | "likes" | "comments"> & {
  views: number | null;
  post_likes: { user_id: string }[] | null;
  comments: TheVerticeComment[] | null;
};

type PollRow = Omit<TheVerticePoll, "options"> & {
  poll_options:
    | (Omit<TheVerticePollOption, "voters"> & { poll_votes: { user_id: string }[] | null })[]
    | null;
};

export interface TheVerticeComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string | null;
  image: string | null;
  created_at: string;
}

export interface TheVerticePost {
  id: string;
  author_id: string;
  project_id: string | null;
  tag: string;
  title: string;
  content: string;
  image: string | null;
  views: number;
  created_at: string;
  likes: string[]; // array of user IDs
  comments: TheVerticeComment[];
}

export interface TheVerticeEvent {
  id: string;
  user_id: string;
  date: string;
  type: string;
  color?: string | null;
  note: string | null;
  created_at: string;
}

export interface TheVerticePollOption {
  id: string;
  poll_id: string;
  text: string;
  position: number;
  voters: string[]; // array of user IDs
}

export interface TheVerticePoll {
  id: string;
  author_id: string;
  question: string;
  created_at: string;
  options: TheVerticePollOption[];
}

export function useTheVertice() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<TheVerticeProfile[]>([]);
  const [posts, setPosts] = useState<TheVerticePost[]>([]);
  const [events, setEvents] = useState<TheVerticeEvent[]>([]);
  const [polls, setPolls] = useState<TheVerticePoll[]>([]);
  const [myProfile, setMyProfile] = useState<TheVerticeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // silent = atualização em segundo plano: NÃO mostra o spinner de tela
  // cheia. Só o primeiro carregamento (quando ainda não há nada na tela)
  // liga o loading; curtir/votar/postar/apagar apenas atualizam os dados
  // por baixo, mantendo o conteúdo visível.
  const fetchAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);

    const [pr, po, ev, pl] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at"),
      supabase.from("posts").select("*, comments(*), post_likes(user_id)").order("created_at", { ascending: false }),
      supabase.from("events").select("*"),
      supabase.from("polls").select("*, poll_options(*, poll_votes(user_id))").order("created_at", { ascending: false }),
    ]);

    const activeProfiles = (pr.data as TheVerticeProfile[]) || [];
    setProfiles(activeProfiles);

    const mappedPosts: TheVerticePost[] = ((po.data as PostRow[] | null) || []).map((p) => ({
      id: p.id,
      author_id: p.author_id,
      project_id: p.project_id,
      tag: p.tag,
      title: p.title,
      content: p.content,
      image: p.image,
      views: p.views || 0,
      created_at: p.created_at,
      likes: (p.post_likes || []).map((x) => x.user_id),
      comments: (p.comments || []).slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));
    setPosts(mappedPosts);

    setEvents((ev.data as TheVerticeEvent[]) || []);

    const mappedPolls: TheVerticePoll[] = ((pl.data as PollRow[] | null) || []).map((p) => ({
      id: p.id,
      author_id: p.author_id,
      question: p.question,
      created_at: p.created_at,
      options: (p.poll_options || []).slice().sort((a, b) => a.position - b.position)
        .map((o) => ({
          id: o.id,
          poll_id: o.poll_id,
          text: o.text,
          position: o.position,
          voters: (o.poll_votes || []).map((v) => v.user_id),
        })),
    }));
    setPolls(mappedPolls);

    const me = activeProfiles.find((p) => p.id === user.id) || null;
    setMyProfile(me);

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAll();

      // Realtime: mudanças feitas por OUTRAS pessoas chegam sozinhas.
      // Sempre em modo silencioso — nunca deve piscar o spinner.
      const channel = supabase.channel("vertice-rt")
        .on("postgres_changes", { event: "*", schema: "public" }, () => {
          fetchAll(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchAll]);

  // Operations
  const addPost = async (title: string, content: string, tag: string, image: string | null, projectId: string | null = null) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      tag,
      title,
      content,
      image,
      project_id: projectId || null,
    });
    if (!error) fetchAll(true);
    return { error };
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) fetchAll(true);
    return { error };
  };

  const toggleLike = async (postId: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const post = posts.find((p) => p.id === postId);
    if (!post) return { error: new Error("Publicação não encontrada") };

    const liked = post.likes.includes(user.id);
    if (liked) {
      const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      if (!error) fetchAll(true);
      return { error };
    } else {
      const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      if (!error) fetchAll(true);
      return { error };
    }
  };

  const addComment = async (postId: string, content: string | null, image: string | null) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: user.id,
      content,
      image,
    });
    if (!error) fetchAll(true);
    return { error };
  };

  const addEvent = async (date: string, type: string, note: string | null, color: string | null = null) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      date,
      type,
      note,
      color,
    });
    if (!error) fetchAll(true);
    return { error };
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (!error) fetchAll(true);
    return { error };
  };

  const addPoll = async (question: string, optionTexts: string[]) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const { data: poll, error: pollError } = await supabase.from("polls").insert({
      author_id: user.id,
      question,
    }).select().single();

    if (pollError) return { error: pollError };

    const optionsToInsert = optionTexts.map((text, i) => ({
      poll_id: poll.id,
      text,
      position: i,
    }));

    const { error: optError } = await supabase.from("poll_options").insert(optionsToInsert);
    if (!optError) fetchAll(true);
    return { error: optError };
  };

  const votePoll = async (pollId: string, optionId: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const poll = polls.find((pl) => pl.id === pollId);
    if (!poll) return { error: new Error("Enquete não encontrada") };

    const selectedOption = poll.options.find((o) => o.id === optionId);
    if (!selectedOption) return { error: new Error("Opção não encontrada") };

    const hadVotedForThis = selectedOption.voters.includes(user.id);
    if (hadVotedForThis) {
      // Remove vote
      const { error } = await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
      if (!error) fetchAll(true);
      return { error };
    } else {
      // Insert vote (upsert to handle if they already voted for another option in this poll)
      const { error } = await supabase.from("poll_votes").upsert({
        poll_id: pollId,
        option_id: optionId,
        user_id: user.id,
      }, { onConflict: "poll_id,user_id" });
      if (!error) fetchAll(true);
      return { error };
    }
  };

  const incrementViews = async (postId: string) => {
    await supabase.rpc("increment_views", { p_id: postId });
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, views: p.views + 1 } : p))
    );
  };

  const updateProfile = async (displayName: string, roleTitle: string, tag: string) => {
    if (!user) return { error: new Error("Usuário não autenticado") };
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      role: "admin", // Sócios/equipe continuam com role admin para acesso ao site
      tag,
      metadata: { ...myProfile?.metadata, role_title: roleTitle },
    }).eq("id", user.id);
    if (!error) fetchAll(true);
    return { error };
  };

  const seedExamples = async () => {
    if (!user) return;
    const svgSample = `<svg xmlns='http://www.w3.org/2000/svg' width='820' height='440'><defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#9fc6e8'/><stop offset='1' stop-color='#d9e8f3'/></linearGradient></defs><rect width='820' height='440' fill='url(#s)'/><rect y='300' width='820' height='140' fill='#cfe0c6'/><rect x='90' y='150' width='420' height='180' fill='#f3efe7'/><rect x='510' y='110' width='230' height='220' fill='#e4ddd0'/><rect x='510' y='92' width='250' height='24' fill='#3a4250'/><rect x='80' y='134' width='450' height='20' fill='#3a4250'/><rect x='120' y='190' width='150' height='110' fill='#8fbfe0'/><rect x='300' y='190' width='90' height='110' fill='#8fbfe0'/><rect x='540' y='150' width='170' height='150' fill='#8fbfe0'/><rect x='400' y='240' width='70' height='90' fill='#8a6a4a'/><text x='30' y='420' fill='#3a4250' font-family='sans-serif' font-size='15'>Render preliminar — Residência Silva</text></svg>`;
    const sampleImg = 'data:image/svg+xml,' + encodeURIComponent(svgSample);

    await supabase.from("posts").insert([
      {
        author_id: user.id,
        tag: "#contratos",
        title: "Residência Silva — Contrato assinado",
        content: "Bom dia equipe! Assinamos contrato com a família Silva. Prazo: 90 dias.\n\nBriefing: casa térrea 180m², 3 quartos, suíte master com closet, área gourmet integrada. Registrem aqui as decisões técnicas para manter o histórico centralizado.",
      },
      {
        author_id: user.id,
        tag: "#arquitetonico",
        title: "Residência Silva — Fachada e layout 3D",
        content: "Fachada e planta baixa preliminar disponíveis. Balanço frontal de ±2,8m na fachada. Equipes de estrutural, elétrica e hidrossanitário: comentem aqui os pontos de compatibilização.",
        image: sampleImg,
      },
    ]);

    const { data: poll } = await supabase.from("polls").insert({
      author_id: user.id,
      question: "Reunião de compatibilização — Residência Silva. Qual formato?",
    }).select().single();

    if (poll) {
      await supabase.from("poll_options").insert([
        { poll_id: poll.id, text: "🖥️ Online (Google Meet)", position: 0 },
        { poll_id: poll.id, text: "🏢 Presencial (escritório)", position: 1 },
      ]);
    }

    await supabase.from("events").insert([
      { user_id: user.id, date: new Date().toISOString().split("T")[0], type: "disponivel", note: "Disponível p/ compatibilização" },
    ]);

    fetchAll(true);
  };

  return {
    profiles,
    posts,
    events,
    polls,
    myProfile,
    loading,
    // Atualização manual (botão "atualizar") também é silenciosa: troca
    // os dados sem apagar a tela. Ignora qualquer argumento de evento.
    refetch: () => fetchAll(true),
    addPost,
    deletePost,
    toggleLike,
    addComment,
    addEvent,
    deleteEvent,
    addPoll,
    votePoll,
    incrementViews,
    updateProfile,
    seedExamples,
  };
}
