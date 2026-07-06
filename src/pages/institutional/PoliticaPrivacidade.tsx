import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useScrollToTop } from "@/hooks/ui/useScrollToTop";

const PoliticaPrivacidade = () => {
  useScrollToTop();
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-3xl mx-auto text-navy dark:text-white">
          <h1 className="font-sans font-bold text-4xl mb-2">Política de Privacidade</h1>
          <p className="text-sm text-zinc-500 mb-12">Última atualização: julho de 2026</p>

          <div className="flex flex-col gap-8 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300 [&_h2]:font-sans [&_h2]:font-bold [&_h2]:text-xl [&_h2]:text-navy [&_h2]:dark:text-white [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
            <section>
              <h2>1. Quem somos</h2>
              <p>
                A VEBRAM Engenharia ("nós") é responsável pelo tratamento dos dados pessoais
                coletados através deste site, nos termos da Lei Geral de Proteção de Dados
                (Lei nº 13.709/2018 — LGPD).
              </p>
            </section>

            <section>
              <h2>2. Quais dados coletamos</h2>
              <ul>
                <li>Formulário de orçamento: nome, e-mail, telefone, cidade, tipo de projeto e mensagem opcional.</li>
                <li>Portal do cliente (para quem já é cliente): nome, telefone, cidade e biografia associados à sua conta.</li>
                <li>Preferência de tema (claro/escuro) e histórico do assistente de chat, salvos localmente no seu navegador.</li>
              </ul>
            </section>

            <section>
              <h2>3. Para que usamos esses dados</h2>
              <ul>
                <li>Responder sua solicitação de orçamento e dar continuidade ao atendimento comercial.</li>
                <li>Prestar o serviço de acompanhamento de projeto para clientes ativos (portal, linha do tempo, modelo 3D).</li>
                <li>Gerar automaticamente uma resposta inicial por e-mail com apoio de inteligência artificial.</li>
              </ul>
            </section>

            <section>
              <h2>4. Compartilhamento com terceiros</h2>
              <p>Usamos os seguintes serviços para operar o site e o atendimento:</p>
              <ul>
                <li><strong>Groq</strong> — gera o texto de resposta automática a partir dos dados do seu pedido de orçamento.</li>
                <li><strong>Resend</strong> — envia os e-mails de resposta e notificação interna.</li>
                <li><strong>Google Sheets</strong> — registro interno de leads recebidos.</li>
                <li><strong>Supabase</strong> — armazenamento do banco de dados e autenticação do portal do cliente.</li>
              </ul>
              <p className="mt-2">Não vendemos nem compartilhamos seus dados para fins de publicidade de terceiros.</p>
            </section>

            <section>
              <h2>5. Por quanto tempo guardamos</h2>
              <p>
                Mantemos seus dados enquanto durar a relação comercial ou pelo prazo exigido por
                obrigação legal, o que for maior. Você pode pedir a exclusão a qualquer momento
                (veja a seção 6).
              </p>
            </section>

            <section>
              <h2>6. Seus direitos</h2>
              <p>Conforme o art. 18 da LGPD, você pode solicitar a qualquer momento:</p>
              <ul>
                <li>Confirmação de que tratamos seus dados e acesso a eles.</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>Exclusão dos seus dados, quando não houver obrigação legal de retenção.</li>
                <li>Portabilidade dos dados a outro fornecedor de serviço.</li>
              </ul>
            </section>

            <section>
              <h2>7. Contato</h2>
              <p>
                Para exercer qualquer um desses direitos ou tirar dúvidas sobre esta política,
                fale conosco em{" "}
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

export default PoliticaPrivacidade;
