import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade — Lubacortes",
  description: "Como a Lubacortes trata os dados dos utilizadores.",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 text-sm leading-relaxed">
      <Link href="/" className="text-blue-500 underline">← Voltar à Lubacortes</Link>
      <h1 className="mt-6 text-3xl font-extrabold">Política de Privacidade</h1>
      <p className="mt-2 muted">Última actualização: 24 de Novembro de 2026</p>

      <p className="mt-6">
        A Lubacortes (&ldquo;plataforma&rdquo;) é operada por Luba Technology. Esta política explica
        que dados recolhemos, porquê e durante quanto tempo os guardamos. Ao utilizar a plataforma,
        concorda com esta política.
      </p>

      <h2 className="mt-8 text-xl font-bold">1. Dados que recolhemos</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><strong>Conta:</strong> nome, e-mail, palavra-passe (guardada apenas como hash scrypt) e telefone, se indicado.</li>
        <li><strong>Identidade Google:</strong> quando escolhe &ldquo;Entrar com Google&rdquo;, guardamos apenas o identificador estável da conta Google (<code>sub</code>), o e-mail verificado e, se disponível, o avatar. Não guardamos tokens de acesso do Google.</li>
        <li><strong>Conteúdo:</strong> os ficheiros de vídeo que carrega, os metadados extraídos, transcrições, momentos detectados, cortes e legendas gerados.</li>
        <li><strong>Utilização:</strong> registos de acesso (IP, agente do navegador, data/hora), estado dos trabalhos de processamento e métricas agregadas.</li>
        <li><strong>Pagamentos de teste:</strong> referências e comprovativos de simulações. A plataforma <strong>não cobra dinheiro real</strong> e não recolhe dados de cartão de crédito.</li>
      </ul>

      <h2 className="mt-8 text-xl font-bold">2. Finalidade</h2>
      <p className="mt-2">
        Os dados são usados para: criar e manter a sua conta; isolar o seu conteúdo de outras contas;
        processar os vídeos e gerar cortes e legendas; aplicar limites do seu plano; enviar avisos por
        e-mail (e WhatsApp, apenas se configurado); melhorar a fiabilidade do serviço e cumprir
        obrigações legais.
      </p>

      <h2 className="mt-8 text-xl font-bold">3. Isolamento e segurança</h2>
      <p className="mt-2">
        Cada projecto, corte, pagamento e sessão está associado ao identificador da sua conta e o
        servidor verifica essa associação em todos os pedidos. As sessões usam cookies
        <code> httpOnly</code>, as palavras-passe são derivadas com scrypt e as ligações são feitas
        por HTTPS. Os ficheiros privados ficam em armazenamento não público.
      </p>

      <h2 className="mt-8 text-xl font-bold">4. Partilha com terceiros</h2>
      <p className="mt-2">
        Usamos prestadores de infra-estrutura (alojamento, base de dados, armazenamento, envio de
        e-mail e, opcionalmente, serviços de transcrição/tradução via API) apenas para operar o
        serviço. Não vendemos os seus dados. Não partilhamos os seus vídeos com outras contas.
      </p>

      <h2 className="mt-8 text-xl font-bold">5. Retenção</h2>
      <p className="mt-2">
        Os dados da conta e os projectos são mantidos enquanto a conta estiver activa. Pode pedir a
        eliminação da conta e dos respectivos dados através do suporte. Registos técnicos e de
        auditoria podem ser conservados por um período limitado para fins de segurança.
      </p>

      <h2 className="mt-8 text-xl font-bold">6. Os seus direitos</h2>
      <p className="mt-2">
        Pode aceder, corrigir ou pedir a eliminação dos seus dados, retirar o consentimento e
        desligar a conta Google, e solicitar uma cópia das suas informações, escrevendo para
        <a className="text-blue-500 underline" href="mailto:lubatechnology@gmail.com"> lubatechnology@gmail.com</a>.
      </p>

      <h2 className="mt-8 text-xl font-bold">7. Conteúdo de terceiros</h2>
      <p className="mt-2">
        Só deve carregar ou importar vídeos que possui ou que tem licença para processar. A
        Lubacortes não contorna protecções de plataformas externas. Quando um link do YouTube é
        bloqueado pelo próprio YouTube, pedimos que carregue o ficheiro do vídeo.
      </p>

      <h2 className="mt-8 text-xl font-bold">8. Alterações</h2>
      <p className="mt-2">
        Alterações a esta política serão publicadas nesta página com a data de actualização.
      </p>
      <p className="mt-8"><Link className="text-blue-500 underline" href="/termos">Ver Termos de Utilização</Link></p>
    </main>
  );
}
