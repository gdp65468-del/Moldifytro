import { Panel } from "@/components/ui/Panel";
import { PRIVACY_EFFECTIVE_DATE } from "@/lib/legal";

const cookieRows = [
  {
    category: "Essenciais",
    purpose: "manter autenticacao, sessao, seguranca, navegacao basica e funcionamento do app",
    examples: "sessao do login, tokens tecnicos do Supabase e registro de ciencia do aviso de cookies",
  },
  {
    category: "Funcionais",
    purpose: "preservar preferencias operacionais diretamente ligadas ao uso do editor e da interface",
    examples: "armazenamento local necessario para continuidade de uso em ambiente de demonstracao e preferencias tecnicas do navegador",
  },
  {
    category: "Terceiros necessarios",
    purpose: "viabilizar login social e checkout quando voce usa Google ou Asaas",
    examples: "cookies ou identificadores tecnicos definidos pelos provedores durante autenticacao e pagamento",
  },
];

export function CookiesPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Panel
        variant="hero"
        size="lg"
        className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.16),transparent_34%),linear-gradient(145deg,rgba(255,249,241,0.98),rgba(255,255,255,0.94))]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">Politica de cookies</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ink">Cookies e armazenamento local no Moldify</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700 md:text-base">
          Esta pagina explica, de forma objetiva, como o Moldify usa cookies, armazenamento local e tecnologias
          equivalentes para manter o login, proteger a sessao, operar o editor e suportar integracoes essenciais.
        </p>
        <div className="mt-5 rounded-[22px] border border-white/90 bg-white/82 px-4 py-4 text-sm text-stone-700">
          Versao em vigor desde {PRIVACY_EFFECTIVE_DATE}.
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">O que voce precisa saber</h2>
          <ul className="mt-3 space-y-3 text-sm leading-7 text-stone-600">
            <li>o app depende de tecnologias essenciais para autenticar o usuario e manter a sessao segura;</li>
            <li>na publicacao e no checkout, provedores externos podem usar seus proprios cookies tecnicos;</li>
            <li>no estado atual do app, nao ha banner de publicidade, remarketing ou perfilamento comercial;</li>
            <li>se categorias opcionais forem adicionadas no futuro, a politica deve ser atualizada.</li>
          </ul>
        </Panel>

        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Quando os cookies aparecem</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Eles podem ser usados ao fazer login, manter a sessao autenticada, acessar o checkout, validar
            seguranca, guardar sua ciencia sobre o aviso de cookies e garantir continuidade do uso entre telas.
          </p>
        </Panel>
      </div>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Categorias usadas hoje</h2>
        <div className="mt-4 space-y-4">
          {cookieRows.map((row) => (
            <div key={row.category} className="rounded-[24px] border border-stone-200 bg-white/86 p-5">
              <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Categoria</div>
                  <div className="mt-2 text-lg font-semibold text-ink">{row.category}</div>
                </div>
                <div className="space-y-3 text-sm leading-7 text-stone-600">
                  <p>
                    <span className="font-semibold text-ink">Finalidade:</span> {row.purpose}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Exemplos:</span> {row.examples}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Como gerenciar</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Voce pode limpar cookies e armazenamento local nas configuracoes do navegador. Isso pode encerrar sua
          sessao, remover preferencias e exigir novo login. Em fluxos de pagamento e autenticacao social, os
          provedores externos tambem podem oferecer controles proprios.
        </p>
      </Panel>
    </div>
  );
}
