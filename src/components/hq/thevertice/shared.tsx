import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { avatarColor, initials, TAG_COLORS } from "@/lib/theVertice";
import { useTheme } from "@/components/layout/ThemeProvider";

// ── Avatar ─────────────────────────────────────────────────────────────────────

export function Avatar({
  id,
  name,
  size = 44,
}: {
  id: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none"
      style={{ width: size, height: size, background: avatarColor(id), fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  );
}

// ── Verified badge ───────────────────────────────────────────────────────────

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="inline-block shrink-0" aria-label="Sócio verificado">
      <path fill="#2f6bff" d="M12 1.5l2.6 1.9 3.2.1 1 3 2.6 1.9-1 3 1 3-2.6 1.9-1 3-3.2.1L12 22.5l-2.6-1.9-3.2-.1-1-3L2.6 15l1-3-1-3 2.6-1.9 1-3 3.2-.1z" />
      <path fill="#fff" d="M10.6 15.2l-2.5-2.5 1.2-1.2 1.3 1.3 3.6-3.6 1.2 1.2z" />
    </svg>
  );
}

// ── Tag pill ───────────────────────────────────────────────────────────────────

export function TagPill({ tag }: { tag: string }) {
  const { theme } = useTheme();
  const t = TAG_COLORS[tag];
  if (!t) {
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
        {tag}
      </span>
    );
  }
  return (
    <span
      className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ background: theme === "dark" ? t.darkBg : t.bg, color: t.color }}
    >
      {tag}
    </span>
  );
}

// ── Rich text (highlight @mentions and #tags) ────────────────────────────────

export function RichText({ text }: { text: string | null }) {
  if (!text) return null;
  // Divide preservando @Menções (nome próprio) e #tags.
  const parts = text.split(/(@[A-ZÀ-Ú][a-zà-ú]+(?: [A-ZÀ-Ú][a-zà-ú]+)*|#\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^[@#]/.test(part)) {
          return (
            <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">
              {part}
            </span>
          );
        }
        // Preserva quebras de linha.
        return part.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ));
      })}
    </>
  );
}

// ── Lightbox (contexto para ampliar imagens) ─────────────────────────────────

const LightboxContext = createContext<(src: string) => void>(() => {});

export function useLightbox() {
  return useContext(LightboxContext);
}

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);
  const open = useCallback((s: string) => setSrc(s), []);
  return (
    <LightboxContext.Provider value={open}>
      {children}
      {src && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-8 cursor-zoom-out bg-black/90 backdrop-blur-sm"
          onClick={() => setSrc(null)}
        >
          <img src={src} alt="" className="max-w-[95%] max-h-[95%] rounded-xl" />
        </div>
      )}
    </LightboxContext.Provider>
  );
}

// ── Card base ─────────────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-navy-light/40 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ── Page header ────────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <p className="text-xs font-semibold text-zinc-500 mb-0.5">{eyebrow}</p>
        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-navy dark:text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────────

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6">
      <h3 className="text-base font-bold text-navy dark:text-white mb-1">{title}</h3>
      <div className="text-sm text-zinc-500">{children}</div>
    </div>
  );
}
