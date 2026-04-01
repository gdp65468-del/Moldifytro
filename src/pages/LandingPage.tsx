import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPanel } from "@/components/ui/StatusPanel";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformTemplates } from "@/hooks/usePlatformTemplates";
import { buildAbsoluteUrl, copyTextWithFallback, getPlatformTemplatePublicPath } from "@/lib/share";

const trustHighlights = [
  "Sem instalacao",
  "Funciona no celular",
  "Publicacao por template",
  "Link publico pronto para divulgar",
];

const useCases = [
  ["Igrejas e congressos", "Campanhas, series, conferencias, eventos especiais e artes para divulgacao rapida."],
  ["Escolas e equipes", "Acoes internas, datas comemorativas, turmas, times e mobilizacoes visuais."],
  ["Eventos e corridas", "Frames para patrocinadores, participantes, imprensa e publico em geral."],
];

const faqItems = [
  ["Precisa instalar alguma coisa?", "Nao. Todo o uso acontece direto no navegador, no celular ou no desktop."],
  ["Quem abrir o link precisa criar conta?", "Nao. A pagina publica foi pensada para ser simples e direta para o visitante."],
  ["Quando o link fica pronto?", "Depois da publicacao do template e da confirmacao do pagamento."],
  ["Posso reaproveitar molduras prontas?", "Sim. Voce pode usar as bases da plataforma ou criar seus proprios templates."],
];

export function LandingPage() {
  const { user } = useAuth();
  const platformTemplatesQuery = usePlatformTemplates();
  const platformTemplates = platformTemplatesQuery.data ?? [];
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  async function handleSharePlatformTemplate(platformTemplateId: string) {
    try {
      await copyTextWithFallback(buildAbsoluteUrl(getPlatformTemplatePublicPath(platformTemplateId)));
      setCopiedTemplateId(platformTemplateId);
      window.setTimeout(() => {
        setCopiedTemplateId((current) => (current === platformTemplateId ? null : current));
      }, 1800);
    } catch {
      setCopiedTemplateId(null);
    }
  }

  return (
    <div className="space-y-6 pb-24 sm:space-y-8 md:pb-0">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink sm:text-2xl">Molduras da plataforma</h2>
            <p className="text-sm text-stone-500">Bases prontas para igreja, evento, escola e campanha visual.</p>
          </div>
          <Link to="/dashboard" className="hidden sm:inline-flex">
            <Button variant="secondary">Abrir painel</Button>
          </Link>
        </div>

        {platformTemplatesQuery.isLoading ? (
          <StatusPanel
            title="Carregando molduras da plataforma"
            description="Buscando as molduras ativas para mostrar na vitrine."
            loading
            compact
          />
        ) : platformTemplatesQuery.isError ? (
          <StatusPanel
            title="Nao foi possivel abrir a vitrine"
            description={
              platformTemplatesQuery.error instanceof Error
                ? platformTemplatesQuery.error.message
                : "Tente atualizar a pagina para carregar as molduras."
            }
            tone="warning"
            compact
          />
        ) : platformTemplates.length ? (
          <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 touch-pan-x overscroll-x-contain sm:gap-4">
            {platformTemplates.map((template) => (
              <Panel
                key={template.id}
                variant="compact"
                size="sm"
                className="flex min-w-[168px] max-w-[168px] flex-col gap-3 border-white/90 p-3 sm:min-w-[190px] sm:max-w-[190px]"
              >
                <div className="rounded-[20px] border border-white/90 bg-white/94 p-2.5">
                  <img
                    src={template.thumbnailUrl}
                    alt={template.title}
                    className="mx-auto aspect-[4/5] w-full rounded-[14px] object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-ink">{template.title}</h3>
                    <span className="rounded-full bg-[#fff4e8] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ember">
                      Base
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-stone-600">
                    Use esta base para abrir uma campanha pronta em poucos minutos.
                  </p>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <Link className="inline-flex" to={getPlatformTemplatePublicPath(template.id)}>
                    <Button variant="secondary" className="w-full px-3 py-2 text-xs">
                      Usar moldura
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full px-3 py-2 text-xs"
                    onClick={() => void handleSharePlatformTemplate(template.id)}
                  >
                    {copiedTemplateId === template.id ? "Link copiado" : "Compartilhar link"}
                  </Button>
                </div>
              </Panel>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
        <Panel
          variant="hero"
          size="md"
          className="bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(29,58,47,0.14),transparent_30%),linear-gradient(140deg,rgba(255,248,239,0.98),rgba(255,255,255,0.92))]"
        >
          <span className="inline-flex rounded-full border border-white/80 bg-white/88 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-ember">
            Criacao para campanhas
          </span>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
                Crie e compartilhe artes para sua campanha em minutos.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-700 sm:text-base">
                Monte molduras para igreja, evento, escola ou acao visual, publique um link e deixe cada
                pessoa criar a propria arte direto no celular.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={user ? "/dashboard" : "/login"}>
                  <Button>{user ? "Abrir painel" : "Criar minha campanha"}</Button>
                </Link>
                <a href="#como-funciona">
                  <Button variant="secondary">Ver como funciona</Button>
                </a>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {trustHighlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-white/80 bg-white/76 px-4 py-3 text-sm font-semibold text-ink shadow-[0_18px_42px_-30px_rgba(22,19,18,0.18)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[28px] border border-white/90 bg-white/84 p-4 shadow-[0_24px_50px_-34px_rgba(22,19,18,0.22)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-ember">
                  O que voce entrega
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">Uma pagina pronta para sua campanha ganhar alcance</h3>
                <p className="mt-2 text-sm leading-5 text-stone-600">
                  Seu publico abre o link, envia a foto, ajusta a arte e baixa o resultado no mesmo fluxo.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] bg-[#fff6ea] p-3.5">
                    <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Uso</div>
                    <div className="mt-1.5 text-base font-semibold text-ink">Foto, ajuste e download em segundos</div>
                  </div>
                  <div className="rounded-[20px] bg-[#f3f6f1] p-3.5">
                    <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Entrega</div>
                    <div className="mt-1.5 text-base font-semibold text-ink">Link publico pronto para divulgar</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/85 bg-white/76 p-4 shadow-[0_18px_42px_-30px_rgba(22,19,18,0.16)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Para quem serve
                </p>
                <p className="mt-2 text-sm leading-5 text-stone-600">
                  Igrejas, congressos, escolas, corridas, patrocinadores e campanhas que precisam de uma arte pronta para circular rapido.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <Panel variant="dark" size="lg">
            <h2 className="font-display text-2xl font-bold">Escolha o formato certo para sua campanha</h2>
            <div className="mt-5 space-y-3">
              {[
                ["Moldura completa", "Ideal para evento, corrida, escola, igreja e campanhas sazonais."],
                ["Logo sobreposta", "Perfeito para marca, patrocinio, selo visual e equipes."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-[22px] border border-white/10 bg-white/8 p-4">
                  <div className="font-semibold text-white">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-stone-200">{text}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel variant="soft" className="bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(248,239,226,0.98))]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ember">
                  Publicacao
                </p>
                <h3 className="mt-2 font-display text-3xl font-bold text-ink">R$ 5,90</h3>
              </div>
              <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Por template
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-600">
              Cada template publicado libera um link pronto para divulgar, com experiencia simples para quem vai criar a arte no celular.
            </p>
            <div className="mt-5 rounded-[22px] border border-stone-200/80 bg-white/86 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-stone-500">O que esta incluso</div>
              <div className="mt-2 text-lg font-semibold text-ink">Publicacao, link e pagina pronta para uso</div>
            </div>
          </Panel>
        </div>
      </section>

      <section id="como-funciona" className="grid gap-5 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
        {[
          ["1", "Escolha a base", "Use uma moldura da plataforma ou monte a sua propria campanha visual."],
          ["2", "Ajuste a arte", "Envie foto, texto e elementos visuais sem depender de software complicado."],
          ["3", "Publique e divulgue", "Pague a publicacao e entregue um link para varias pessoas criarem a propria versao."],
        ].map(([step, title, text], index) => (
          <Panel
            key={step}
            variant={index === 0 ? "hero" : "compact"}
            className={index === 0 ? "md:row-span-2" : ""}
          >
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-ember">{step}</div>
            <h3 className="mt-3 text-xl font-semibold text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
          </Panel>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Panel variant="soft">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Confianca para comprar</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">O que deixa o fluxo mais seguro</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Voce cria antes de pagar.",
              "A publicacao e por template, sem surpresa no fluxo.",
              "O link publico so entra no ar depois da liberacao.",
              "Privacidade, cookies e termos ficam visiveis no proprio site.",
            ].map((item) => (
              <div key={item} className="rounded-[20px] border border-stone-200 bg-white/88 px-4 py-3 text-sm text-stone-700">
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel variant="soft">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ember">Perguntas frequentes</p>
          <div className="mt-4 space-y-3">
            {faqItems.map(([question, answer]) => (
              <div key={question} className="rounded-[20px] border border-stone-200 bg-white/88 px-4 py-4">
                <div className="text-sm font-semibold text-ink">{question}</div>
                <p className="mt-1.5 text-sm leading-6 text-stone-600">{answer}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {useCases.map(([title, text]) => (
          <Panel key={title} variant="compact">
            <div className="text-lg font-semibold text-ink">{title}</div>
            <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
          </Panel>
        ))}
      </section>
    </div>
  );
}
