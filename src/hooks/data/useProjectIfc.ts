import { useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "ifc-models";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pathFromUrl(url: string): string {
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx !== -1 ? url.slice(idx + marker.length) : "";
}

export function storagePath(projectId: string, projectName: string): string {
  return `${projectId}/${slugify(projectName)}.ifc`;
}

export function useProjectIfc() {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(false);

  async function uploadIfc(
    projectId: string,
    projectName: string,
    file: File,
  ): Promise<{ error: string | null; url: string | null }> {
    if (!file.name.toLowerCase().endsWith(".ifc")) {
      return { error: "Apenas arquivos .ifc são aceitos.", url: null };
    }
    if (file.size > MAX_BYTES) {
      return {
        error: `Arquivo muito grande. Limite: 50 MB (arquivo: ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
        url: null,
      };
    }

    setUploading(true);
    try {
      const path = storagePath(projectId, projectName);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: "application/octet-stream" });

      if (uploadError) return { error: uploadError.message, url: null };

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: dbError } = await supabase
        .from("projects")
        .update({ ifc_url: data.publicUrl })
        .eq("id", projectId);

      if (dbError) return { error: dbError.message, url: null };

      return { error: null, url: data.publicUrl };
    } finally {
      setUploading(false);
    }
  }

  async function deleteIfc(
    projectId: string,
    currentUrl: string,
  ): Promise<{ error: string | null }> {
    setDeleting(true);
    try {
      const path = pathFromUrl(currentUrl);
      if (!path) return { error: "URL inválida para remoção." };

      const { error: storageError } = await supabase.storage.from(BUCKET).remove([path]);
      if (storageError) return { error: storageError.message };

      const { error: dbError } = await supabase
        .from("projects")
        .update({ ifc_url: null })
        .eq("id", projectId);

      return { error: dbError?.message ?? null };
    } finally {
      setDeleting(false);
    }
  }

  return { uploadIfc, deleteIfc, uploading, deleting };
}
