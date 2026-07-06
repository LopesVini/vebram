import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  BookOpen, 
  Sparkles, 
  ChevronDown, 
  HelpCircle, 
  Users, 
  KanbanSquare, 
  ListChecks, 
  Zap, 
  Settings, 
  CheckCircle2, 
  Clock, 
  Info,
  DollarSign
} from "lucide-react";

interface CrmGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CrmGuideDrawer({ isOpen, onClose }: CrmGuideDrawerProps) {
  const [activeSection, setActiveSection] = useState<string | null>("intro");

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const AccordionItem = ({ 
    id, 
    title, 
    icon: Icon, 
    children 
  }: { 
    id: string; 
    title: string; 
    icon: React.ElementType; 
    children: React.ReactNode 
  }) => {
    const isActive = activeSection === id;
    return (
      <div className="border-b border-zinc-200 dark:border-white/5 py-1">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between py-4 text-left font-bold text-sm text-navy dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-white/5 text-zinc-500"}`}>
              <Icon size={16} />
            </div>
            <span>{title}</span>
          </div>
          <ChevronDown 
            size={16} 
            className={`text-zinc-400 transition-transform duration-300 ${isActive ? "rotate-180 text-blue-600" : ""}`} 
          />
        </button>
        <AnimatePresence initial={false}>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pb-5 pt-1 text-xs md:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-3 font-sans pr-1">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="relative w-full max-w-lg h-full bg-white dark:bg-[#0f172a] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col z-10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between bg-zinc-50 dark:bg-navy-light/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h2 className="font-sans font-black text-navy dark:text-white text-base">Guia de Uso - CRM</h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono uppercase tracking-wider">Documentação e Dicas Rápidas</p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-navy dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                title="Fechar guia"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              
              {/* Alert Tip */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex gap-3 text-left">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] md:text-xs text-zinc-600 dark:text-zinc-300 leading-normal">
                  Este guia foi preparado para ajudar novos integrantes a entenderem a gestão de clientes, e serve como consulta rápida para quem já usa o CRM no dia a dia.
                </p>
              </div>

              {/* Accordion List */}
              <div className="space-y-1">
                
                {/* 1. O que é CRM */}
                <AccordionItem id="intro" title="1. O que é um CRM? (Introdução)" icon={HelpCircle}>
                  <p>
                    <strong>CRM</strong> significa <em>Customer Relationship Management</em> (Gestão de Relacionamento com Clientes).
                  </p>
                  <p>
                    No QG da VEBRAM, o CRM é a nossa central de vendas. Em vez de anotar clientes em papéis ou planilhas soltas, centralizamos aqui todos os dados de quem deseja contratar nossos projetos.
                  </p>
                  <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/5">
                    <span className="block text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Por que usamos?</span>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Não esquecer de retornar contatos (Follow-ups).</li>
                      <li>Saber quanto dinheiro temos em negociação.</li>
                      <li>Entender quais etapas de venda estão lentas.</li>
                      <li>Histórico completo de conversas com cada cliente.</li>
                    </ul>
                  </div>
                </AccordionItem>

                {/* 2. Funil & Leads */}
                <AccordionItem id="funnel" title="2. Funil de Vendas e Leads" icon={KanbanSquare}>
                  <p>
                    Um <strong>Lead</strong> é um cliente potencial (uma oportunidade de negócio). No CRM, cada lead é representado por um card.
                  </p>
                  <p>
                    O <strong>Funil de Vendas (Pipeline)</strong> é o caminho que o cliente percorre desde o primeiro contato até o fechamento do contrato. Ele é dividido em colunas (Etapas).
                  </p>
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <div>
                        <strong className="text-zinc-800 dark:text-zinc-200">Cadastro do Lead:</strong> Sempre registre o <em>Nome</em>, a <em>Origem</em> (ex: Instagram, site, recomendação) e o <em>Valor Estimado</em> (quanto custaria o projeto).
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <div>
                        <strong className="text-zinc-800 dark:text-zinc-200">Mover no Pipeline:</strong> Na aba <strong>Pipeline</strong>, você pode simplesmente clicar no card do cliente e arrastá-lo para o lado (Kanban) conforme a negociação avança.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <div>
                        <strong className="text-zinc-800 dark:text-zinc-200">Atribuir Responsável:</strong> Associe a negociação a um membro da equipe para que todos saibam quem é o ponto de contato principal.
                      </div>
                    </div>
                  </div>
                </AccordionItem>

                {/* 3. Ações e Tarefas */}
                <AccordionItem id="tasks" title="3. Tarefas & Ações (Follow-up)" icon={ListChecks}>
                  <p>
                    A regra de ouro de um bom vendedor é: <strong>nenhum lead pode ficar sem uma próxima ação agendada</strong>.
                  </p>
                  <p>
                    As <strong>Tarefas</strong> servem para nos lembrar do que precisamos fazer em seguida: mandar um orçamento, fazer uma ligação ou marcar uma reunião.
                  </p>
                  <div className="p-3 bg-zinc-50 dark:bg-white/5 rounded-xl border border-zinc-200 dark:border-white/5 space-y-2">
                    <span className="block text-[10px] font-bold font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Divisão das Tarefas</span>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-center gap-2"><Clock size={12} className="text-rose-500" /> <span className="font-bold text-rose-500">Atrasadas:</span> Ações cujo prazo já venceu. Resolva com urgência!</li>
                      <li className="flex items-center gap-2"><Clock size={12} className="text-blue-500" /> <span className="font-bold text-blue-500">Hoje:</span> Ações programadas para o dia atual.</li>
                      <li className="flex items-center gap-2"><Clock size={12} className="text-zinc-400 dark:text-zinc-500" /> <span className="font-bold">Próximas:</span> Planejamento para os próximos dias.</li>
                    </ul>
                  </div>
                </AccordionItem>

                {/* 4. Automações */}
                <AccordionItem id="automation" title="4. Automações do Sistema" icon={Zap}>
                  <p>
                    Para evitar trabalho manual repetitivo, o CRM permite criar <strong>Regras de Automação</strong>.
                  </p>
                  <p>
                    Nas configurações, você define gatilhos para que o sistema execute ações automaticamente.
                  </p>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 text-xs text-left">
                    <strong className="text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                      <Sparkles size={13} />
                      Exemplo Prático:
                    </strong>
                    <p className="text-zinc-600 dark:text-zinc-300">
                      Sempre que um lead entrar na etapa <em>"Orçamento Enviado"</em>, o sistema cria automaticamente uma tarefa chamada <strong>"Cobrar retorno do orçamento"</strong> com prazo de vencimento para dali a <strong>3 dias</strong>.
                    </p>
                  </div>
                  <p className="text-[11px] text-zinc-400 italic">
                    *Nota: As regras criadas são configuradas e armazenadas no painel de configurações para ativação futura.
                  </p>
                </AccordionItem>

                {/* 5. Guia Rápido: Como faço para... */}
                <AccordionItem id="faq" title="5. Guia Rápido: 'Como faço para...'" icon={Settings}>
                  <div className="space-y-4">
                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Cadastrar um lead novo?</strong>
                      <p className="text-zinc-500 mt-0.5">Vá em <strong>Leads</strong>, clique em <strong>+ Novo Lead</strong> no canto superior direito. Preencha o nome, selecione a etapa inicial, o valor aproximado do projeto e salve.</p>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Registrar que liguei ou conversei com o cliente?</strong>
                      <p className="text-zinc-500 mt-0.5">Clique no nome do cliente (na lista de leads ou no card do pipeline). Na área de <strong>Histórico</strong>, escreva um resumo da conversa (ex: <em>"Liguei, cliente viaja e retorna na próxima segunda"</em>) e aperte Enter ou envie.</p>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Mudar um cliente de etapa?</strong>
                      <p className="text-zinc-500 mt-0.5">
                        Existem 3 formas:<br/>
                        1. Na tela de <strong>Pipeline</strong>, clique no card e arraste-o para a coluna da nova etapa.<br/>
                        2. Na tela de <strong>Leads</strong>, mude no menu de seleção rápida ao lado do nome.<br/>
                        3. Na tela de <strong>Detalhes do Lead</strong>, altere o campo "Etapa" na seção superior.
                      </p>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Mapear os contatos (E-mail/Telefone) do cliente?</strong>
                      <p className="text-zinc-500 mt-0.5">Entre nos detalhes do cliente. Na barra lateral direita haverá uma caixa de <strong>Contatos</strong> listando canais de comunicação configurados para aquele lead.</p>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Marcar uma tarefa como resolvida?</strong>
                      <p className="text-zinc-500 mt-0.5">Vá em <strong>Tarefas</strong> (ou no painel lateral do cliente) e marque a caixinha redonda ao lado da tarefa. Ela será automaticamente riscada e movida para a seção "Concluídas".</p>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Configurar as Etapas do Funil?</strong>
                      <p className="text-zinc-500 mt-0.5">Acesse <strong>Config</strong>, clique em <strong>Etapas do funil</strong>. Você pode criar novas etapas, editar cores, reordená-las arrastando a alça lateral, ou marcar se ela representa vitória (Ganho) ou perda (Perdido).</p>
                    </div>

                    <div className="text-xs">
                      <strong className="block text-zinc-800 dark:text-zinc-200">...Excluir um lead?</strong>
                      <p className="text-zinc-500 mt-0.5">Na tela de <strong>Leads</strong>, passe o mouse sobre a linha do lead desejado. Clique no ícone da <strong>Lixeira</strong> que aparece no final da linha e confirme a exclusão.</p>
                    </div>
                  </div>
                </AccordionItem>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-navy-light/10 text-center">
              <p className="text-[10px] text-zinc-400 font-mono">
                VEBRAM QG v1.0 · Desenvolvido com foco em execução real.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
