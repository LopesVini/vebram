// Utilitários compartilhados pela integração "The Vertice" no HQ.
// Portados do app original (index.html vanilla) para React/TypeScript.

// Cores por disciplina (devem permanecer consistentes entre tags, avatares e pills).
export const TAG_COLORS: Record<string, { color: string; bg: string; darkBg: string }> = {
  "#contratos":       { color: "#15803d", bg: "#e7f6ec", darkBg: "rgba(21,128,61,.18)" },
  "#arquitetonico":   { color: "#7e22ce", bg: "#f4ebfd", darkBg: "rgba(126,34,206,.18)" },
  "#estrutural":      { color: "#c2410c", bg: "#fdeee2", darkBg: "rgba(194,65,12,.18)" },
  "#eletrico":        { color: "#a16207", bg: "#fbf3da", darkBg: "rgba(161,98,7,.18)" },
  "#hidrossanitario": { color: "#0e7490", bg: "#e2f5fa", darkBg: "rgba(14,116,144,.18)" },
};

export const TAGS = Object.keys(TAG_COLORS);

export const TAG_LABELS: Record<string, string> = {
  "#contratos": "Contratos e propostas",
  "#arquitetonico": "Projeto arquitetônico",
  "#estrutural": "Projeto estrutural",
  "#eletrico": "Instalações elétricas",
  "#hidrossanitario": "Instalações hidrossanitárias",
};

export type EventType = "ferias" | "ocupado" | "disponivel";

export const EVENT_TYPES: Record<EventType, { label: string; color: string; bg: string }> = {
  ferias:     { label: "Férias",     color: "#15803d", bg: "#e7f6ec" },
  ocupado:    { label: "Ocupado",    color: "#c2410c", bg: "#fdeee2" },
  disponivel: { label: "Disponível", color: "#0e7490", bg: "#e2f5fa" },
};

/** Nome de exibição de um perfil, com fallbacks. */
export function profileName(p?: { display_name?: string | null; email?: string | null } | null): string {
  return p?.display_name || p?.email?.split("@")[0] || "Sócio";
}

/** Cargo (role_title) guardado em metadata; 'role' é o papel de acesso admin/client. */
export function profileRole(p?: { metadata?: { role_title?: string } | null } | null): string {
  return p?.metadata?.role_title || "Equipe";
}

const AVATAR_COLORS = ["#16a34a", "#7c3aed", "#f97316", "#0ea5e9", "#e11d48", "#0d9488", "#d97706", "#4f46e5"];

/** Cor de avatar determinística a partir de um id. */
export function avatarColor(id: string | null | undefined): string {
  let h = 0;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Iniciais (até 2 letras) de um nome. */
export function initials(name: string | null | undefined): string {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Tempo relativo em pt-BR. */
export function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return "agora mesmo";
  if (d < 3600) return `há ${Math.floor(d / 60)}min`;
  if (d < 86400) return `há ${Math.floor(d / 3600)}h`;
  return `há ${Math.floor(d / 86400)}d`;
}

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export function todayStr(): string {
  return ymd(new Date());
}

/**
 * Reduz e comprime uma imagem no cliente e devolve um data URL base64 (JPEG).
 * Portado de loadImage() do app original (máx 1100px, qualidade 0.82).
 */
export function loadImageAsBase64(file: File, maxSize = 1100, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem inválido"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          const r = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")?.drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
