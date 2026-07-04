import { useState } from "react";
import { toast } from "sonner";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Botão "Melhorar com IA": reescreve um texto com o tom definido pelo
// systemPrompt. Retorna o texto novo ou null (erro já notificado via toast).
export function useEnhanceText(systemPrompt: string) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  async function enhance(text: string): Promise<string | null> {
    if (!text.trim()) return null;
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      toast.error("Chave da API do Groq não configurada.");
      return null;
    }
    setIsEnhancing(true);
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });
      if (!response.ok) throw new Error(`Groq HTTP ${response.status}`);
      const data = await response.json();
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
