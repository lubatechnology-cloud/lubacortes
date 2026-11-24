import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Utilização — Lubacortes",
  description: "Condições de utilização da plataforma Lubacortes.",
};

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-sm leading-relaxed">
      <Link href="/" className="text-blue-500 underline">← Voltar à Lubacortes</Link>
      <h1 className="mt-6 text-3xl font-extrabold">Termos de Utilização</h1>
      <p className="mt-2 muted">Última actualização: 24 de Novembro de 2026</p>

      <p className="mt-6">
        Estes termos regulam o uso da Lubacortes. Ao criar uma conta ou utilizar a plataforma,
        concorda com eles. Se não concordar, não deve utilizar o serviço.
      </p>

      <h2 className="mt-8 text-xl font-bold">1. O serviço</h2>
      <p className="mt-2">
        A Lubacortes transforma vídeos que você carrega (ou URLs directos que controla) em cortes
        prontos para redes sociais, com legendas, formatos verticais/quadrados/horizontais e
        ferramentas de edição assistida por IA. O processamento é realizado por trabalhadores
        assíncronos na nuvem; o progresso é apresentado na interface.
      </p>

      <h2 className="mt-8 text-xl font-bold">2. Conta e isolamento</h2>
      <p className="mt-2">
        Cada utilizador tem uma conta individual. Projectos, cortes, ficheiros e pagamentos são
        isolados por conta e protegidos no servidor. É responsável pela confidencialidade das suas
        credenciais e pela actividade realizada na sua conta.
      </p>

      <h2 className="mt-8 text-xl font-bold">3. Planos e pagamentos em modo TESTE</h2>
      <p className="mt-2">
        Os planos GRATUITO, CRIADOR, PROFISSIONAL e AGÊNCIA, bem como os pacotes de minutos, são
        apresentados em Kwanzas (Kz). <strong>Neste momento todos os pagamentos funcionam em modo
        de teste: nenhum valor real é cobrado e nenhum desbloqueio é feito sem confirmação válida
        de teste.</strong> Não introducimos dados de cartão de crédito.
      </p>

      <h2 className="mt-8 text-xl font-bold">4. Conteúdo e licença</h2>
      <p className="mt-2">
        Só pode processar vídeos que possui ou para os quais tem licença e autorização. É o único
        responsável pelo conteúdo que carrega e pela conformidade com os direitos de terceiros.
        A Lubacortes não contorna protecções técnicas de plataformas externas; se um download for
        bloqueado pelo YouTube, deve carregar o ficheiro do vídeo.
      </p>

      <h2 className="mt-8 text-xl font-bold">5. Propriedade intelectual</h2>
      <p className="mt-2">
        Os vídeos, transcrições e cortes gerados pertencem ao utilizador. A plataforma e o seu
        código, marca e interface são propriedade da Luba Technology. O plano GRATUITO inclui marca
        de água; os demais planos podem removê-la conforme as condições apresentadas.
      </p>

      <h2 className="mt-8 text-xl font-bold">6. Utilização aceitável</h2>
      <p className="mt-2">
        Não é permitido usar o serviço para conteúdo ilícito, violar direitos de autor, sobrecarregar
        a infra-estrutura, tentar aceder a contas alheias ou contornar limites do plano. Podemos
        suspender contas que violem estas regras.
      </p>

      <h2 className="mt-8 text-xl font-bold">7. Disponibilidade e responsabilidade</h2>
      <p className="mt-2">
        Procuramos manter o serviço disponível, mas não garantimos funcionamento ininterrupto.
        Resultados de IA (momentos, legendas e sugestões) são auxiliares e devem ser revistos antes
        de publicação. Na medida permitida por lei, a Luba Technology não responde por perdas
        indirectas decorrentes do uso da plataforma.
      </p>

      <h2 className="mt-8 text-xl font-bold">8. Encerramento</h2>
      <p className="mt-2">
        Pode encerrar a sua conta a qualquer momento, pedindo a eliminação dos dados ao suporte.
        Podemos encerrar contas que violem estes termos.
      </p>

      <h2 className="mt-8 text-xl font-bold">9. Contacto e alterações</h2>
      <p className="mt-2">
        Dúvidas: <a className="text-blue-500 underline" href="mailto:lubatechnology@gmail.com">lubatechnology@gmail.com</a>.
        Alterações a estes termos serão publicadas nesta página com a data de actualização.
      </p>
      <p className="mt-8"><Link className="text-blue-500 underline" href="/privacidade">Ver Política de Privacidade</Link></p>
    </main>
  );
}
