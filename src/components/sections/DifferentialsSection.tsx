import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Eye, Layers, MessageCircle, Home, Users, Building2, MapPin } from "lucide-react";

const differentials = [
  { icon: Target, title: "Foco em execução real", desc: "Projetos pensados para a obra, não para a gaveta." },
  { icon: Eye, title: "Clareza visual e técnica", desc: "Desenhos limpos, organizados e fáceis de interpretar." },
  { icon: Layers, title: "Compatibilização entre disciplinas", desc: "Arquitetura, elétrica e hidráulica alinhados." },
  { icon: MessageCircle, title: "Atendimento direto", desc: "Comunicação objetiva, sem intermediários." },
  { icon: Home, title: "Foco em residências", desc: "Especialidade no que fazemos de melhor." },
  { icon: Building2, title: "Estrutural com rigor de grande porte", desc: "Engenheiro com histórico em obras de grande porte — onde imprecisão não é opção. Esse padrão de exigência aplicado a residências resulta em estruturas calculadas com precisão real." },
  { icon: Users, title: "Comunicação fácil", desc: "WhatsApp, e-mail e reuniões presenciais." },
  { icon: MapPin, title: "Projeto feito para o município", desc: "Conhecemos os Códigos de Obras e as exigências documentais de BH, Nova Lima e Contagem. A compatibilização com as normas locais faz parte do processo desde a concepção." },
];

const DifferentialsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="section-padding bg-surface" ref={ref}>
      <div className="container-tight">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-accent text-sm font-semibold tracking-widest uppercase">
            Diferenciais
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mt-4">
            Por que escolher a Vértice?
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {differentials.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-surface-elevated p-6 rounded-xl border border-border hover:shadow-lg transition-shadow"
            >
              <item.icon className="text-accent mb-4" size={28} strokeWidth={1.5} />
              <h3 className="text-foreground font-bold text-lg">{item.title}</h3>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DifferentialsSection;
