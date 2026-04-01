import { Panel } from "@/components/ui/Panel";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE, getPrivacyContactLabel } from "@/lib/legal";

const sharedServices = [
  "Supabase para autenticacao, sessao, banco de dados e armazenamento de arquivos.",
  "Asaas para criacao de checkout, identificacao do pagamento e confirmacao financeira.",
  "Google, quando voce escolher entrar com autenticacao social.",
];

const dataGroups = [
  {
    title: "Dados de cadastro e autenticacao",
    text: "Nome, e-mail, foto de perfil quando disponivel e identificadores tecnicos ligados a sessao de login.",
  },
  {
    title: "Dados de conteudo",
    text: "Imagens, molduras, configuracoes de template, links publicados e arquivos enviados por voce para montar a arte.",
  },
  {
    title: "Dados de pagamento",
    text: "Valor, status do pagamento, identificadores de checkout e referencias tecnicas devolvidas pelo provedor financeiro.",
  },
  {
    title: "Dados de uso e seguranca",
    text: "Registros de visualizacao e download em links publicados, dados basicos do navegador e informacoes necessarias para proteger a sessao e o funcionamento do app.",
  },
];

const legalBases = [
  "execucao de contrato e procedimentos preliminares para criar conta, salvar templates, publicar links e entregar a arte;",
  "cumprimento de obrigacao legal ou regulatoria, especialmente para registros financeiros e de seguranca;",
  "legitimo interesse para manter estabilidade, prevenir fraude, proteger a plataforma e medir uso basico do servico;",
  "consentimento, quando algum tratamento futuro depender de escolha opcional do usuario.",
];

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Panel
        variant="hero"
        size="lg"
        className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.16),transparent_34%),linear-gradient(145deg,rgba(255,249,241,0.98),rgba(255,255,255,0.94))]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">Politica de privacidade</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ink">Como o Moldify trata seus dados</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700 md:text-base">
          Esta politica explica, de forma clara, quais dados podem ser tratados no Moldify, por que isso
          acontece, com quem eles podem ser compartilhados e quais direitos voce pode exercer como titular.
        </p>
        <div className="mt-5 rounded-[22px] border border-white/90 bg-white/82 px-4 py-4 text-sm text-stone-700">
          Versao em vigor desde {PRIVACY_EFFECTIVE_DATE}.
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Quem controla os dados</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            O Moldify controla os dados tratados para operacao do app, autenticacao, publicacao de templates,
            geracao de links publicos e gestao do pagamento necessario para liberar a publicacao.
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Canal de contato para temas de privacidade:{" "}
            {PRIVACY_CONTACT_EMAIL ? (
              <a className="font-semibold text-ember" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>
                {PRIVACY_CONTACT_EMAIL}
              </a>
            ) : (
              <span className="font-semibold text-ink">{getPrivacyContactLabel()}</span>
            )}
            .
          </p>
        </Panel>

        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Para que usamos os dados</h2>
          <ul className="mt-3 space-y-3 text-sm leading-7 text-stone-600">
            <li>criar e manter sua conta e a sessao autenticada;</li>
            <li>salvar rascunhos, editar templates e publicar links publicos;</li>
            <li>processar pagamentos e validar a liberacao de publicacao;</li>
            <li>entregar o editor publico para visitantes criarem a propria arte;</li>
            <li>registrar visualizacoes e downloads basicos dos templates publicados;</li>
            <li>proteger o app contra abuso, falhas e uso indevido.</li>
          </ul>
        </Panel>
      </div>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Quais dados podem ser tratados</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {dataGroups.map((group) => (
            <div key={group.title} className="rounded-[24px] border border-stone-200 bg-white/86 p-5">
              <h3 className="text-lg font-semibold text-ink">{group.title}</h3>
              <p className="mt-2 text-sm leading-7 text-stone-600">{group.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Bases legais</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          O tratamento pode ocorrer com base nas seguintes hipoteses da LGPD:
        </p>
        <ul className="mt-3 space-y-3 text-sm leading-7 text-stone-600">
          {legalBases.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Compartilhamento com terceiros</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            O Moldify pode compartilhar dados apenas quando necessario para operar o servico. Hoje isso inclui:
          </p>
          <ul className="mt-3 space-y-3 text-sm leading-7 text-stone-600">
            {sharedServices.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>

        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Retencao e exclusao</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Dados de conta, templates, registros de publicacao e informacoes de pagamento podem ser mantidos pelo
            tempo necessario para prestar o servico, cumprir obrigacoes legais, prevenir fraude e resguardar o
            exercicio regular de direitos.
          </p>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Quando um template vai para a lixeira, ele pode permanecer recuperavel por um periodo limitado antes
            da exclusao definitiva, conforme a regra operacional exibida no app.
          </p>
        </Panel>
      </div>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Direitos do titular</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Nos termos da LGPD, voce pode solicitar confirmacao da existencia de tratamento, acesso, correcao,
          anonimizacao quando cabivel, portabilidade, informacoes sobre compartilhamento, revisao de decisoes
          automatizadas quando aplicavel e eliminacao dos dados tratados em desconformidade ou quando houver base
          legal para isso.
        </p>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Para exercer esses direitos, utilize {getPrivacyContactLabel()}. Algumas solicitacoes podem depender da
          confirmacao da sua identidade e da analise de obrigacoes legais ou tecnicas que impecam exclusao imediata.
        </p>
      </Panel>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Seguranca e transferencias internacionais</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          O Moldify adota medidas tecnicas e organizacionais razoaveis para reduzir risco de acesso nao autorizado,
          perda acidental e uso indevido dos dados. Como parte da infraestrutura depende de provedores de nuvem e
          autenticacao, pode haver tratamento ou armazenamento fora do Brasil, sempre dentro da necessidade
          operacional do servico.
        </p>
      </Panel>
    </div>
  );
}
