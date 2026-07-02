import { useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const GetStarted = () => {
  const [message, setMessage] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleProjectType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleEnhance = async () => {
    if (!message) return;
    setIsEnhancing(true);
    
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da API do Groq não encontrada no .env");
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "Você é um assistente técnico de engenharia civil. O usuário vai lhe passar uma descrição de um projeto residencial que ele deseja orçar. Você deve reescrever essa descrição de forma clara, técnica, muito profissional e objetiva, mantendo todas as informações cruciais. Apenas devolva o texto refinado, nada mais. Mantenha em primeira pessoa (se o usuário usou)."
            },
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.5,
          max_tokens: 500
        })
      });

      if (!response.ok) throw new Error("Erro na API do Groq");
      
      const data = await response.json();
      if (data.choices && data.choices[0]?.message?.content) {
        setMessage(data.choices[0].message.content.trim());
      }
    } catch (error) {
      console.error("Erro ao melhorar texto com IA:", error);
      alert("Houve um problema de conexão com a IA (Groq). Verifique o console.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const nome = formData.get("nome") as string;
    const email = formData.get("email") as string;
    const celular = formData.get("celular") as string;
    const cidade = formData.get("cidade") as string;
    const tipo = selectedTypes.join(", ");

    // 1. Fire and forget no Supabase (não trava a tela esperando)
    Promise.resolve(
      supabase.from("Orçamentos").insert({
        nome,
        email,
        celular,
        cidade,
        tipo,
        mensagem: message,
      })
    )
      .then(({ error: dbError }) => {
        if (dbError) console.error("Aviso: Falha ao salvar no banco (Supabase):", dbError);
      })
      .catch((err) => console.error("Erro Supabase:", err));

    // 2. Fire and forget no Render (se estiver dormindo, vai demorar 50s no background, mas não trava a tela)
    const automationUrl = import.meta.env.VITE_AUTOMATION_URL;
    const automationKey = import.meta.env.VITE_AUTOMATION_KEY;
    
    if (automationUrl && automationKey) {
      fetch(`${automationUrl}/process-quote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": automationKey,
        },
        body: JSON.stringify({
          nome,
          email,
          celular,
          cidade,
          tipo,
          mensagem: message,
        }),
      }).catch(err => console.error("Aviso: Falha ao chamar API do Render:", err));
    }

    // 3. Libera instantaneamente a tela de sucesso!
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600); // pequeno delay só para dar um efeito visual de "enviando..." por meio segundo
  };

  return (
    <section className="py-32 px-6 md:px-12 lg:px-24 bg-surface relative overflow-hidden">
      <div className="absolute inset-0 z-0" style={{ backgroundImage: "radial-gradient(hsl(var(--muted-foreground)/0.2) 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      
      <div className="relative z-10 max-w-4xl mx-auto bg-background border border-border rounded-[3rem] shadow-2xl p-8 md:p-16">
        <div className="text-center mb-12">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">Contato</span>
          <h2 className="font-sans font-extrabold text-4xl md:text-5xl text-foreground mb-4 mt-4">Iniciar Projeto</h2>
          <p className="text-muted-foreground text-lg">Fale diretamente com a equipe Vertice. Sem intermediários, direto ao ponto.</p>
        </div>

        {submitted ? (
          <div className="text-center py-16 animate-in fade-in zoom-in duration-500">
            <CheckCircle2 className="w-24 h-24 text-accent mx-auto mb-6" />
            <h3 className="text-3xl font-extrabold text-foreground mb-4">Formulário enviado com sucesso!</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Nossa equipe recebeu sua solicitação e você também receberá uma confirmação no seu e-mail em instantes.
            </p>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Nome completo</label>
                <input name="nome" type="text" className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">E-mail</label>
                <input name="email" type="email" className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="seu@email.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Telefone / WhatsApp</label>
                <input name="celular" type="tel" className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="(31) 90000-0000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground">Município</label>
                <select name="cidade" className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all text-foreground">
                  <option value="">Selecione o município</option>
                  <option value="Belo Horizonte">Belo Horizonte</option>
                  <option value="Nova Lima">Nova Lima</option>
                  <option value="Contagem">Contagem</option>
                  <option value="Outro">Outro (RMBH)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Disciplinas Desejadas (Selecione uma ou mais)</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { id: "Projeto Arquitetônico", label: "Arquitetônico" },
                  { id: "Projeto Elétrico", label: "Elétrico" },
                  { id: "Projeto Hidrossanitário", label: "Hidrossanitário" },
                  { id: "Projeto Estrutural", label: "Estrutural" },
                  { id: "Regularização", label: "Regularização / Aprovação" }
                ].map((type) => {
                  const isSelected = selectedTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleProjectType(type.id)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                        isSelected 
                          ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_15px_rgba(var(--accent),0.3)] scale-105' 
                          : 'bg-surface text-muted-foreground border-border hover:border-accent hover:text-foreground'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 relative">
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-bold text-foreground">Detalhes do projeto</label>
                
                {/* Botão Melhorar com IA */}
                <button 
                  type="button"
                  onClick={handleEnhance}
                  disabled={isEnhancing || !message}
                  className="flex items-center gap-2 text-xs font-bold bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-accent/10 disabled:hover:text-accent"
                >
                  <Sparkles size={14} className={isEnhancing ? "animate-spin" : ""} />
                  {isEnhancing ? "Melhorando..." : "Melhorar com IA"}
                </button>
              </div>
              
              <textarea 
                name="mensagem"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent transition-all resize-none" 
                placeholder="Descreva as características da residência, tamanho do terreno, número de pavimentos, necessidades especiais..." 
              />
            </div>

            <button type="submit" disabled={loading} className="w-full relative overflow-hidden bg-foreground text-background px-8 py-4 rounded-xl text-lg font-bold shadow-xl hover:scale-[1.02] transition-transform duration-300 group disabled:opacity-50">
              <span className="relative z-10">{loading ? "Enviando..." : "Solicitar Orçamento"}</span>
              <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"></div>
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default GetStarted;
