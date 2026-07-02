import { useState } from "react";
import { Plus, Heart, MessageCircle, Eye, Share2, Trash2, Image as ImageIcon, X, RefreshCw, Sparkles, FolderKanban } from "lucide-react";
import { useTheVertice, TheVerticePost } from "@/hooks/data/useTheVertice";
import { useProjects } from "@/hooks/data/useProjects";
import { TAGS, TAG_LABELS, profileName, profileRole, timeAgo, loadImageAsBase64 } from "@/lib/theVertice";
import {
  Avatar,
  VerifiedBadge,
  TagPill,
  RichText,
  PageHeader,
  Card,
  EmptyState,
  useLightbox,
} from "@/components/hq/thevertice/shared";
import { MentionTextarea } from "@/components/hq/thevertice/MentionTextarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function HqFeed() {
  const tv = useTheVertice();
  const { posts, profiles, myProfile, loading, addPost, deletePost, toggleLike, addComment, incrementViews, seedExamples } = tv;
  const { projects } = useProjects();

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const userProfile = (id: string) => profiles.find((p) => p.id === id) || null;

  const counts = {
    all: posts.length,
    ...Object.fromEntries(TAGS.map((t) => [t, posts.filter((p) => p.tag === t).length])),
  } as Record<string, number>;

  let visible = posts;
  if (filter !== "all") visible = visible.filter((p) => p.tag === filter);
  if (search.trim()) {
    const q = search.toLowerCase();
    visible = visible.filter((p) => {
      const a = userProfile(p.author_id);
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.content || "").toLowerCase().includes(q) ||
        profileName(a).toLowerCase().includes(q) ||
        p.comments.some((c) => (c.content || "").toLowerCase().includes(q))
      );
    });
  }

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <PageHeader
        eyebrow="Rede interna de engenharia"
        title="Mural de Projetos"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => tv.refetch()}
              className="w-10 h-10 rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-navy-light/40 flex items-center justify-center text-zinc-500 hover:text-navy dark:hover:text-white transition-colors"
              title="Atualizar"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/30 transition-colors"
            >
              <Plus size={16} /> Nova publicação
            </button>
          </div>
        }
      />

      {/* Busca */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por cliente, autor ou conteúdo…"
        className="w-full mb-4 bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-navy dark:text-white outline-none focus:border-blue-400 shadow-sm"
      />

      {/* Filtros por tag */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
        <FilterChip label="Todos" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        {TAGS.map((t) => (
          <FilterChip key={t} label={t} count={counts[t]} active={filter === t} onClick={() => setFilter(t)} />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 text-center py-16">Carregando publicações…</p>
      ) : visible.length === 0 ? (
        <Card>
          {posts.length === 0 && !search && filter === "all" ? (
            <EmptyState title="Tudo pronto! Nenhuma publicação ainda.">
              <p className="mb-4">Crie a primeira ou gere conteúdo de exemplo para ver o mural em ação.</p>
              <button
                onClick={() => seedExamples()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2.5 text-sm font-bold"
              >
                <Sparkles size={15} /> Criar dados de exemplo
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="Nenhuma publicação encontrada">Ajuste o filtro ou a busca.</EmptyState>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              meId={myProfile?.id}
              authorProfile={userProfile(p.author_id)}
              projectName={projects.find((pr) => pr.id === p.project_id)?.name}
              userProfile={userProfile}
              onLike={toggleLike}
              onDelete={deletePost}
              onComment={addComment}
              onOpenComments={incrementViews}
              profiles={profiles}
            />
          ))}
        </div>
      )}

      <NewPostModal open={open} onOpenChange={setOpen} tv={tv} projects={projects} />
    </div>
  );
}

// ── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold border transition-colors shrink-0 ${
        active
          ? "bg-navy dark:bg-white text-white dark:text-navy border-navy dark:border-white"
          : "bg-white dark:bg-navy-light/40 text-zinc-500 border-zinc-200 dark:border-white/10 hover:text-navy dark:hover:text-white"
      }`}
    >
      {label}
      <span
        className={`text-[11px] font-bold rounded-full px-1.5 min-w-[20px] text-center ${
          active ? "bg-white/25 text-current" : "bg-zinc-100 dark:bg-white/10 text-zinc-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  meId,
  authorProfile,
  projectName,
  userProfile,
  onLike,
  onDelete,
  onComment,
  onOpenComments,
  profiles,
}: {
  post: TheVerticePost;
  meId?: string;
  authorProfile: ReturnType<typeof useTheVertice>["profiles"][number] | null;
  projectName?: string;
  userProfile: (id: string) => ReturnType<typeof useTheVertice>["profiles"][number] | null;
  onLike: (id: string) => Promise<{ error: unknown }>;
  onDelete: (id: string) => Promise<{ error: unknown }>;
  onComment: (postId: string, content: string | null, image: string | null) => Promise<{ error: unknown }>;
  onOpenComments: (id: string) => void;
  profiles: ReturnType<typeof useTheVertice>["profiles"];
}) {
  const lightbox = useLightbox();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [comImg, setComImg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const liked = meId ? post.likes.includes(meId) : false;

  function toggleComments() {
    const opening = !showComments;
    setShowComments(opening);
    if (opening) onOpenComments(post.id);
  }

  async function pickComImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setComImg(await loadImageAsBase64(f));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function send() {
    if (!comment.trim() && !comImg) return;
    setSending(true);
    const { error } = await onComment(post.id, comment.trim() || null, comImg);
    setSending(false);
    if (error) return alert((error as Error).message);
    setComment("");
    setComImg(null);
    setShowComments(true);
  }

  async function del() {
    if (!confirm("Excluir esta publicação? Comentários e curtidas também serão removidos.")) return;
    const { error } = await onDelete(post.id);
    if (error) alert((error as Error).message);
  }

  function share() {
    const url = location.href.split("#")[0] + "#post-" + post.id;
    navigator.clipboard?.writeText(url).catch(() => {});
    alert("🔗 Link da publicação copiado!");
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-3">
        <Avatar id={post.author_id} name={profileName(authorProfile)} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-navy dark:text-white flex items-center gap-1">
            {profileName(authorProfile)} <VerifiedBadge />
          </div>
          <div className="text-xs text-zinc-500">
            {profileRole(authorProfile)} · {timeAgo(post.created_at)}
          </div>
        </div>
        <TagPill tag={post.tag} />
      </div>

      {projectName && (
        <div className="inline-flex items-center gap-1.5 mb-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full">
          <FolderKanban size={12} /> Compartilhado com {projectName}
        </div>
      )}

      <h3 className="text-lg font-bold text-navy dark:text-white leading-snug mb-1.5">{post.title}</h3>
      <div className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
        <RichText text={post.content} />
      </div>

      {post.image && (
        <img
          src={post.image}
          alt="anexo"
          onClick={() => lightbox(post.image!)}
          className="mt-3 rounded-2xl w-full max-h-[420px] object-cover border border-zinc-200 dark:border-white/10 cursor-zoom-in"
        />
      )}

      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center gap-1">
        <StatButton active={liked} activeClass="text-red-500" onClick={() => onLike(post.id)}>
          <Heart size={17} className={liked ? "fill-red-500" : ""} /> {post.likes.length}
        </StatButton>
        <StatButton onClick={toggleComments}>
          <MessageCircle size={17} /> {post.comments.length}
        </StatButton>
        <StatButton onClick={toggleComments}>
          <Eye size={17} /> {post.views || 0}
        </StatButton>
        <button
          onClick={share}
          className="ml-auto w-9 h-9 rounded-full border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:text-green-600 transition-colors"
          title="Compartilhar"
        >
          <Share2 size={15} />
        </button>
        {post.author_id === meId && (
          <button
            onClick={del}
            className="w-9 h-9 rounded-full border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:border-red-300 transition-colors"
            title="Excluir publicação"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {showComments && (
        <div className="mt-2">
          {post.comments.map((cm) => {
            const cu = userProfile(cm.author_id);
            return (
              <div key={cm.id} className="flex gap-2.5 py-3 border-t border-zinc-100 dark:border-white/5">
                <Avatar id={cm.author_id} name={profileName(cu)} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-navy dark:text-white">{profileName(cu)}</span>
                    <span className="text-[11px] text-zinc-500">{profileRole(cu)}</span>
                    <span className="text-[11px] text-zinc-400 ml-auto">{timeAgo(cm.created_at)}</span>
                  </div>
                  {cm.content && (
                    <div className="text-[13px] text-zinc-600 dark:text-zinc-300 mt-0.5 whitespace-pre-wrap">
                      <RichText text={cm.content} />
                    </div>
                  )}
                  {cm.image && (
                    <img
                      src={cm.image}
                      alt="anexo"
                      onClick={() => lightbox(cm.image!)}
                      className="mt-2 rounded-xl max-w-[260px] max-h-[210px] object-cover border border-zinc-200 dark:border-white/10 cursor-zoom-in"
                    />
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-white/5">
            <div className="flex-1">
              <MentionTextarea
                value={comment}
                onChange={setComment}
                profiles={profiles}
                rows={2}
                placeholder="Comentar… digite @ para mencionar"
              />
            </div>
            <button
              onClick={send}
              disabled={sending}
              className="self-stretch px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold disabled:opacity-60"
            >
              Enviar
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-zinc-500 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 hover:text-navy dark:hover:text-white">
              <ImageIcon size={14} /> Imagem
              <input type="file" accept="image/*" className="hidden" onChange={pickComImg} />
            </label>
            {comImg && (
              <div className="relative">
                <img src={comImg} alt="" className="h-10 rounded-lg border border-zinc-200 dark:border-white/10" />
                <button
                  onClick={() => setComImg(null)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                >
                  <X size={11} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatButton({
  children,
  onClick,
  active,
  activeClass = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1.5 rounded-full transition-colors hover:bg-zinc-100 dark:hover:bg-white/5 ${
        active ? activeClass : "text-zinc-500 hover:text-navy dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// ── New post modal ───────────────────────────────────────────────────────────

function NewPostModal({
  open,
  onOpenChange,
  tv,
  projects,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tv: ReturnType<typeof useTheVertice>;
  projects: ReturnType<typeof useProjects>["projects"];
}) {
  const [tag, setTag] = useState(TAGS[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTag(TAGS[0]);
    setTitle("");
    setContent("");
    setImage(null);
  }

  async function pickImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setImage(await loadImageAsBase64(f));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function submit() {
    if (!title.trim() || !content.trim()) return alert("Preencha o título e o conteúdo.");
    setSaving(true);
    // Mural é sempre interno: nenhum post é associado a projeto/cliente.
    const { error } = await tv.addPost(title.trim(), content.trim(), tag, image, null);
    setSaving(false);
    if (error) return alert((error as Error).message);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="bg-white dark:bg-navy border-zinc-200 dark:border-white/10 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-white">Nova Publicação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Tag / Disciplina</label>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-blue-400"
            >
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {t} — {TAG_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Residência Oliveira — Layout aprovado"
              className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-navy dark:text-white outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Conteúdo</label>
            <MentionTextarea
              value={content}
              onChange={setContent}
              profiles={tv.profiles}
              rows={5}
              placeholder="Descreva a atualização, decisão, prazo… Digite @ para mencionar colegas."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-1.5">Imagem (opcional)</label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm font-semibold text-zinc-500 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 hover:text-navy dark:hover:text-white">
              <ImageIcon size={15} /> Anexar imagem
              <input type="file" accept="image/*" className="hidden" onChange={pickImg} />
            </label>
            {image && (
              <div className="relative mt-2 inline-block">
                <img src={image} alt="" className="max-h-40 rounded-xl border border-zinc-200 dark:border-white/10" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 text-white flex items-center justify-center"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              {saving ? "Publicando…" : "Publicar"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
