import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  type Prancha, type DisciplineSlug,
  validatePranchaFile, fileTypeFromName, pranchaStoragePath,
} from "@/lib/pranchas";

const BUCKET = "pranchas";

export function usePranchas(projectId: string | null | undefined) {
  const [pranchas, setPranchas] = useState<Prancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetch = useCallback(async () => {
    if (!projectId) { setPranchas([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("pranchas")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setPranchas((data as Prancha[]) ?? []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function upload(file: File, discipline: DisciplineSlug, name: string): Promise<{ error: string | null }> {
    if (!projectId) return { error: "Projeto inválido." };
    const invalid = validatePranchaFile(file);
    if (invalid) return { error: invalid };

    setUploading(true);
    try {
      const path = pranchaStoragePath(projectId, discipline, file.name);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) return { error: upErr.message };

      const { data, error: dbErr } = await supabase
        .from("pranchas")
        .insert({
          project_id: projectId,
          discipline,
          name: name.trim() || file.name,
          file_path: path,
          file_type: fileTypeFromName(file.name)!,
          size_bytes: file.size,
        })
        .select()
        .single();
      if (dbErr) {
        // registro falhou: não deixa arquivo órfão no bucket
        await supabase.storage.from(BUCKET).remove([path]);
        return { error: dbErr.message };
      }
      setPranchas(prev => [data as Prancha, ...prev]);
      return { error: null };
    } finally {
      setUploading(false);
    }
  }

  async function remove(prancha: Prancha): Promise<{ error: string | null }> {
    const { error: stErr } = await supabase.storage.from(BUCKET).remove([prancha.file_path]);
    if (stErr) return { error: stErr.message };
    const { error: dbErr } = await supabase.from("pranchas").delete().eq("id", prancha.id);
    if (!dbErr) setPranchas(prev => prev.filter(p => p.id !== prancha.id));
    return { error: dbErr?.message ?? null };
  }

  async function getDownloadUrl(prancha: Prancha): Promise<string | null> {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(prancha.file_path, 60, { download: `${prancha.name}.${prancha.file_type}` });
    return data?.signedUrl ?? null;
  }

  return { pranchas, loading, uploading, refetch: fetch, upload, remove, getDownloadUrl };
}
