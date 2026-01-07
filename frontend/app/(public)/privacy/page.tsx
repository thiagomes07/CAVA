import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | CAVA',
  description: 'Política de privacidade da plataforma CAVA Stone',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <header className="border-b border-slate-200 bg-porcelain">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-obsidian transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Voltar</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-obsidian rounded-sm" />
            <span className="font-serif text-xl font-semibold text-obsidian">CAVA</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="font-serif text-4xl text-obsidian mb-8">
          Política de Privacidade
        </h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-6">
            Última atualização: {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              1. Informações que coletamos
            </h2>
            <p className="text-slate-600 mb-4">
              Coletamos informações que você nos fornece diretamente, como:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Nome completo e informações de contato (e-mail, telefone)</li>
              <li>Informações de empresa (CNPJ, razão social)</li>
              <li>Dados de acesso e autenticação</li>
              <li>Informações de pedidos e transações</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              2. Como usamos suas informações
            </h2>
            <p className="text-slate-600 mb-4">
              Utilizamos as informações coletadas para:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Processar transações e enviar notificações relacionadas</li>
              <li>Responder a suas solicitações e fornecer suporte</li>
              <li>Enviar comunicações sobre produtos e serviços</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              3. Compartilhamento de informações
            </h2>
            <p className="text-slate-600 mb-4">
              Não vendemos suas informações pessoais. Podemos compartilhar suas informações apenas nas seguintes circunstâncias:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Com sua autorização explícita</li>
              <li>Para processar transações comerciais</li>
              <li>Com prestadores de serviço que nos auxiliam</li>
              <li>Para cumprir obrigações legais</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              4. Segurança dos dados
            </h2>
            <p className="text-slate-600">
              Implementamos medidas de segurança técnicas e organizacionais adequadas para proteger suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia de dados em trânsito e em repouso, controles de acesso rigorosos e monitoramento contínuo de segurança.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              5. Seus direitos
            </h2>
            <p className="text-slate-600 mb-4">
              De acordo com a LGPD, você tem o direito de:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar o consentimento para uso de dados</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              6. Cookies e tecnologias similares
            </h2>
            <p className="text-slate-600">
              Utilizamos cookies essenciais para o funcionamento da plataforma, incluindo cookies de autenticação e preferências de sessão. Não utilizamos cookies de rastreamento para publicidade.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-serif text-2xl text-obsidian mb-4">
              7. Contato
            </h2>
            <p className="text-slate-600">
              Para exercer seus direitos ou esclarecer dúvidas sobre nossa política de privacidade, entre em contato através do e-mail: <a href="mailto:privacidade@cavastone.com" className="text-obsidian hover:underline">privacidade@cavastone.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-porcelain mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} CAVA Stone. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
