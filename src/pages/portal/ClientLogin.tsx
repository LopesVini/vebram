import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/data/useAuth";
import { fetchRole, isAdminRole } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/ui/use-toast";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Activity, Box } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import VerticeLogo from "@/components/layout/VerticeLogo";

const mockChartData = [
  { val: 10 }, { val: 25 }, { val: 20 }, { val: 40 }, { val: 35 }, { val: 60 }
];

export default function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Redireciona pelo CARGO (profiles.role), já resolvido pelo useAuth.
    if (!loading && session) {
      navigate(isAdmin ? "/hq" : "/portal", { replace: true });
    }
  }, [session, isAdmin, loading, navigate]);

  if (session) {
    return null; // Return null while navigating to avoid showing the login form
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Acesso negado",
          description: "Credenciais inválidas. Verifique seu e-mail e senha.",
          variant: "destructive",
        });
      } else if (data.session) {
        const role = await fetchRole(data.session.user.id);
        const admin = isAdminRole(role);
        toast({
          title: "Autenticado com sucesso",
          description: admin ? "Bem-vindo ao VerticeHQ." : "Bem-vindo à Área do Cliente Vertice.",
        });
        navigate(admin ? "/hq" : "/portal");
      }
    } catch (error) {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white font-sans overflow-hidden">
      
      {/* Lado Esquerdo - Formulário de Login */}
      <div className="w-full lg:w-[45%] flex flex-col p-8 lg:p-16 relative">
        
        {/* Logo — painel esquerdo do login é sempre claro, então fixa em navy */}
        <div className="flex items-center gap-3 mb-16">
          <VerticeLogo monoNavy className="w-10 h-10 shrink-0" />
          <span className="font-bold text-xl tracking-widest text-navy uppercase">Vertice</span>
        </div>

        {/* Formulário Centralizado */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-navy mb-2">Acesso ao Portal</h1>
            <p className="text-zinc-500 text-sm mb-10">
              Digite suas credenciais corporativas para acessar o acompanhamento da sua obra.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-navy font-semibold text-sm">
                  E-mail corporativo
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@empresa.com"
                  required
                  className="bg-zinc-50 border-zinc-200 text-navy placeholder:text-zinc-400 h-12 rounded-xl focus-visible:ring-accent focus-visible:border-accent shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-navy font-semibold text-sm">
                  Senha de acesso
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-zinc-50 border-zinc-200 text-navy placeholder:text-zinc-400 h-12 rounded-xl focus-visible:ring-accent focus-visible:border-accent shadow-sm"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold tracking-wide group transition-all duration-300 shadow-lg shadow-accent/20"
                >
                  {isLoading ? (
                    "Autenticando..."
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Acessar Portal
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-zinc-500">
                Não possui credenciais? <br />
                <a href="/contato" className="text-accent font-semibold hover:underline">Solicite o acesso ao seu gestor</a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lado Direito - Decorativo / Dark Mode */}
      <div className="hidden lg:flex w-[55%] bg-navy-dark relative items-center justify-center p-12 overflow-hidden">
        
        {/* Abstract Background Patterns */}
        <div className="absolute top-10 right-10 grid grid-cols-4 gap-2 opacity-10">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-8 h-8 bg-white rounded-sm"></div>
          ))}
        </div>
        <div className="absolute bottom-10 left-10 grid grid-cols-3 gap-2 opacity-10">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-6 h-6 bg-accent rounded-sm"></div>
          ))}
        </div>

        {/* Floating Dashboard Elements */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative w-full max-w-lg"
        >
          {/* Main Chart Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 absolute -top-32 -left-12 w-full z-10">
            <div className="flex justify-between items-center mb-6">
              <span className="text-navy font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                Progresso Físico-Financeiro
              </span>
              <div className="flex gap-2">
                <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-1 rounded font-bold">MÊS</span>
                <span className="text-[10px] text-zinc-400 px-2 py-1">ANO</span>
              </div>
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <Line type="monotone" dataKey="val" stroke="#0055FF" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="val" stroke="#1A2B3C" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Circular Progress Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-48 h-48 absolute top-8 -right-8 z-20 flex flex-col items-center justify-center"
          >
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#F4F4F5" strokeWidth="12" fill="none" />
                <circle cx="56" cy="56" r="48" stroke="#0055FF" strokeWidth="12" fill="none" strokeDasharray="300" strokeDashoffset="60" className="drop-shadow-lg" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 font-bold tracking-widest">TOTAL</span>
                <span className="text-2xl font-black text-navy">78%</span>
              </div>
            </div>
          </motion.div>

          {/* Abstract BIM Card */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="bg-navy border border-white/10 rounded-2xl shadow-2xl p-4 w-56 absolute top-32 -left-20 z-0 flex items-center gap-4"
          >
            <div className="bg-primary p-3 rounded-xl">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold">MODELO BIM</p>
              <p className="text-white font-bold text-sm">Sincronizado</p>
            </div>
          </motion.div>

          {/* Text Content Below */}
          <div className="absolute top-64 text-center w-full">
            <h2 className="text-white font-bold text-xl mb-3 tracking-wide">
              Controle em Tempo Real
            </h2>
            <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
              Bem-vindo à Área do Cliente Vertice. Acompanhe a evolução da sua obra com extrema precisão de dados e modelos BIM fedarados.
            </p>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
