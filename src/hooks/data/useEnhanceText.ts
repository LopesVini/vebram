import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const MODEL = "llama-3.3-70b-versatile";

// Botão "Melhorar com IA": reescreve um texto com o tom definido pelo
// systemPrompt. Retorna o texto novo ou null (erro já notificado via toast).
export function useEnhanceText(systemPrompt: string) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  async function enhance(text: string): Promise<string | null> {
    if (!text.trim()) return null;
    setIsEnhancing(true);
    try {
      // Chama a Edge Function (chave Groq fica no servidor, nunca no bundle)
      const { data, error } = await supabase.functions.invoke("chat-groq", {
        body: {
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.5,
          max_tokens: 500,
        },
      });
      if (error) throw error;
      const out = data.choices?.[0]?.message?.content?.trim();
      if (!out) throw new Error("Resposta vazia da IA");
      return out;
    } catch (err) {
      console.error("Erro ao melhorar texto com IA:", err);
      toast.error("Não foi possível melhorar o texto agora. Tente novamente.");
      return null;
    } finally {
      setIsEnhancing(false);
    }
  }

  return { enhance, isEnhancing };
}
