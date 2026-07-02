import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="sobre" className="section-padding bg-background" ref={ref}>
      <div className="container-tight">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="text-accent text-sm font-semibold tracking-widest uppercase">
            Sobre a Vértice
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground mt-4 leading-tight">
            Engenharia focada em projetos residenciais bem feitos.
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mt-6">
            A Vértice desenvolve projetos residenciais com clareza técnica e foco na execução. Atuamos em arquitetura, projetos estruturais, instalações elétricas e hidrossanitárias — disciplinas compatíveis entre si e prontas para a obra desde o início.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed mt-4">
            O projeto estrutural é conduzido por engenheiro com CREA e experiência em estruturas de grande porte. Com base na Região Metropolitana de Belo Horizonte, atendemos Belo Horizonte, Nova Lima e Contagem, e conhecemos as particularidades de aprovação de cada prefeitura — o projeto já chega ao protocolo alinhado com as exigências do município certo.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
