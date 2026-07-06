import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

const TermosDeUso = () => {
  useScrollToTop();
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl mx-auto text-navy dark:text-white">
          <h1 className="font-sans font-bold text-4xl mb-2">Termos de Uso</h1>
          <p className="text-sm text-zinc-500 mb-12">Última atualização: julho de 2026</p>

          <div className="flex flex-col gap-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 [&_h2]:font-sans [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-navy [&_h2]:dark:text-white [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
            <section>
              <h2>1. Aceitação</h2>
              <p>
                Ao usar este site ou o portal do cliente da VEBRAM Engenharia, você concorda com
                estes Termos de Uso. Se não concordar, pedimos que não utilize o site.
              </p>
            </section>

            <section>
              <h2>2. O que oferecemos</h2>
              <p>
                Site institucional com informações sobre nossos serviços de engenharia e um
                portal restrito para acompanhamento de projetos por clientes ativos (linha do
                tempo de entregas, modelo 3D, mensagens com a equipe).
              </p>
            </section>

            <section>
              <h2>3. Conta de acesso ao portal</h2>
              <ul>
                <li>O acesso ao portal é pessoal e criado pela nossa equipe para clientes com projeto ativo.</li>
                <li>Você é responsável por manter sua senha em sigilo e por tudo que ocorrer usando sua conta.</li>
                <li>Avise-nos imediatamente se suspeitar de uso indevido da sua conta.</li>
              </ul>
            </section>

            <section>
              <h2>4. Propriedade intelectual</h2>
              <p>
                Textos, imagens, modelos 3D e demais conteúdos deste site pertencem à VEBRAM
                Engenharia ou a seus clientes (no caso de projetos exibidos no portal) e não podem
                ser copiados ou reutilizados sem autorização.
              </p>
            </section>

            <section>
              <h2>5. Limitação de responsabilidade</h2>
              <p>
                Respostas automáticas geradas por inteligência artificial no formulário de
                orçamento e no chat têm caráter informativo preliminar e não substituem a análise
                técnica de um engenheiro responsável, feita posteriormente pela nossa equipe.
              </p>
            </section>

            <section>
              <h2>6. Alterações</h2>
              <p>
                Podemos atualizar estes termos periodicamente. A versão em vigor é sempre a
                publicada nesta página.
              </p>
            </section>

            <section>
              <h2>7. Lei aplicável</h2>
              <p>
                Estes termos são regidos pela legislação brasileira. Dúvidas podem ser
                encaminhadas para{" "}
                <a href="mailto:verticeprojetos7@gmail.com" className="text-accent hover:underline">
                  verticeprojetos7@gmail.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default TermosDeUso;
