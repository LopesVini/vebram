import { useTheVertice } from "@/hooks/data/useTheVertice";
import { TAG_COLORS, profileName, profileRole } from "@/lib/theVertice";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Avatar, VerifiedBadge, PageHeader, Card, EmptyState } from "@/components/hq/thevertice/shared";

export default function HqMembers() {
  const { profiles, myProfile, loading } = useTheVertice();
  const { theme } = useTheme();

  // Só sócios/equipe fazem parte da rede interna.
  const team = profiles.filter((p) => p.role === "admin");

  return (
    <div className="w-full max-w-[1100px] mx-auto">
      <PageHeader eyebrow="Equipe" title="Membros" />

      {loading ? (
        <p className="text-sm text-zinc-400 text-center py-16">Carregando membros…</p>
      ) : team.length === 0 ? (
        <Card>
          <EmptyState title="Nenhum membro ainda">Os sócios aparecerão aqui assim que criarem conta.</EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {team.map((u) => {
            const t = TAG_COLORS[u.tag];
            return (
              <Card key={u.id} className="p-6 text-center hover:-translate-y-0.5 hover:shadow-md transition-all">
                <div className="flex justify-center mb-3">
                  <Avatar id={u.id} name={profileName(u)} size={64} />
                </div>
                <div className="font-bold text-sm text-navy dark:text-white flex items-center justify-center gap-1">
                  {profileName(u)} <VerifiedBadge />
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{profileRole(u)}</div>
                <span
                  className="inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-bold"
                  style={
                    t
                      ? { background: theme === "dark" ? t.darkBg : t.bg, color: t.color }
                      : undefined
                  }
                >
                  {u.tag}
                </span>
                {u.id === myProfile?.id && (
                  <div className="mt-2 text-[11px] font-bold text-green-600 dark:text-green-400">● Você</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
