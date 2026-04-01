import { Panel } from "@/components/ui/Panel";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE, getPrivacyContactLabel } from "@/lib/legal";

const usageRules = [
  "O Moldify permite criar, salvar, publicar e compartilhar templates visuais para campanhas, eventos e comunicacao.",
  "Cada publicacao paga libera um link publico para um unico template, conforme o fluxo exibido no app.",
  "Voce continua responsavel pelo conteudo que envia, publica ou compartilha usando a plataforma.",
  "Nao e permitido usar o app para conteudo ilegal, ofensivo, enganoso, fraudulento ou que viole direitos de terceiros.",
];

const operationalPoints = [
  {
    title: "Conta e acesso",
    text: "Voce e responsavel por manter seus dados de acesso em seguranca. O login pode acontecer por e-mail e senha ou por provedores externos quando disponiveis.",
  },
  {
    title: "Publicacao paga",
    text: "O valor de publicacao exibido no app libera a criacao de um link publico para o template escolhido. O pagamento e processado por integracao financeira externa.",
  },
  {
    title: "Lixeira e exclusao",
    text: "Quando um template vai para a lixeira, ele pode permanecer recuperavel por um periodo operacional antes da exclusao definitiva, conforme indicado no produto.",
  },
  {
    title: "Disponibilidade",
    text: "O Moldify busca manter funcionamento razoavel e continuidade do servico, mas pode passar por manutencoes, ajustes tecnicos e indisponibilidades temporarias.",
  },
];

export function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Panel
        variant="hero"
        size="lg"
        className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.16),transparent_34%),linear-gradient(145deg,rgba(255,249,241,0.98),rgba(255,255,255,0.94))]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">Termos de uso</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-ink">Regras basicas para usar o Moldify</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-700 md:text-base">
          Estes termos explicam como o Moldify funciona, o que e liberado com a publicacao paga por template
          e quais responsabilidades cada parte assume ao usar a plataforma.
        </p>
        <div className="mt-5 rounded-[22px] border border-white/90 bg-white/82 px-4 py-4 text-sm text-stone-700">
          Versao em vigor desde {PRIVACY_EFFECTIVE_DATE}.
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">O que o Moldify entrega</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            O app foi criado para montar molduras, preparar artes com foto, publicar links publicos e permitir
            que outras pessoas criem a propria versao da arte de forma simples no celular ou no desktop.
          </p>
        </Panel>

        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Aceitacao dos termos</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            Ao criar conta, salvar templates, publicar links ou usar o editor publico, voce concorda com estes
            termos e com as politicas de privacidade e cookies do Moldify.
          </p>
        </Panel>
      </div>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Uso permitido</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
          {usageRules.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Condicoes operacionais</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {operationalPoints.map((item) => (
            <div key={item.title} className="rounded-[24px] border border-stone-200 bg-white/86 p-5">
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-7 text-stone-600">{item.text}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Conteudo e responsabilidade</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            O usuario responde pelo conteudo das imagens, textos, logos e materiais que envia para o app.
            O Moldify nao assume autoria sobre esse conteudo e pode limitar ou remover uso que viole estes
            termos ou a legislacao aplicavel.
          </p>
        </Panel>

        <Panel variant="soft">
          <h2 className="text-xl font-semibold text-ink">Limites do servico</h2>
          <p className="mt-3 text-sm leading-7 text-stone-600">
            O Moldify oferece a plataforma e o fluxo de publicacao, mas nao garante resultado comercial,
            alcance de campanha, aprovacao automatica de pagamento nem disponibilidade ininterrupta em todos os
            horarios e dispositivos.
          </p>
        </Panel>
      </div>

      <Panel variant="soft">
        <h2 className="text-xl font-semibold text-ink">Contato sobre os termos</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Duvidas sobre estes termos podem ser encaminhadas para{" "}
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
    </div>
  );
}
