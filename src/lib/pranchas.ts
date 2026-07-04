// Domínio das pranchas: disciplinas, validação de arquivo e agrupamento.
// Os slugs precisam bater com o check constraint da tabela public.pranchas.

export const DISCIPLINES = [
  { slug: "arquitetonico",   label: "Arquitetônico" },
  { slug: "estrutural",      label: "Estrutural" },
  { slug: "eletrico",        label: "Elétrico" },
  { slug: "hidrossanitario", label: "Hidrossanitário" },
  { slug: "outros",          label: "Outros" },
] as const;

export type DisciplineSlug = (typeof DISCIPLINES)[number]["slug"];

export interface Prancha {
  id: string;
  project_id: string;
  discipline: DisciplineSlug;
  name: string;
  file_path: string;
  file_type: "pdf" | "dwg";
  size_bytes: number | null;
  created_at: string;
}

export const MAX_PRANCHA_BYTES = 50 * 1024 * 1024; // 50 MB

export function fileTypeFromName(filename: string): "pdf" | "dwg" | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".dwg")) return "dwg";
  return null;
}

export function validatePranchaFile(file: { name: string; size: number }): string | null {
  if (!fileTypeFromName(file.name)) return "Apenas arquivos PDF ou DWG são aceitos.";
  if (file.size > MAX_PRANCHA_BYTES) {
    return `Arquivo muito grande. Limite: 50 MB (arquivo: ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  return null;
}

export function fmtBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function groupByDiscipline(pranchas: Prancha[]) {
  return DISCIPLINES
    .map(d => ({ slug: d.slug, label: d.label, items: pranchas.filter(p => p.discipline === d.slug) }))
    .filter(g => g.items.length > 0);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Prefixo com timestamp evita colisão de nomes iguais no mesmo projeto.
export function pranchaStoragePath(projectId: string, discipline: DisciplineSlug, filename: string): string {
  const ext = fileTypeFromName(filename) ?? "pdf";
  const base = slugify(filename.replace(/\.[^.]+$/, ""));
  return `${projectId}/${discipline}/${Date.now()}-${base}.${ext}`;
}
