import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { UploadField } from "@/components/editor/UploadField";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { usePublicTemplate } from "@/hooks/usePublicTemplate";
import { compressImageFile, fileToDataUrl } from "@/lib/image";
import { trackTemplateUse } from "@/services/templates";
import { isAllowedPhotoSize, isImageFile } from "@/utils/validators";

export function TemplatePublicPage() {
  const { slug } = useParams();
  const { data: template, isLoading } = usePublicTemplate(slug);
  const [photoSrc, setPhotoSrc] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!template) {
      return;
    }

    void trackTemplateUse(template.id, "anonymous", "view");
  }, [template]);

  if (isLoading) {
    return <Panel>Carregando sua arte...</Panel>;
  }

  if (!template) {
    return (
      <Panel>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Arte nao encontrada</h1>
        <p className="mt-2 text-stone-600">
          Este link ainda nao foi publicado ou ja nao esta mais disponivel.
        </p>
      </Panel>
    );
  }

  const shareUrl =
    typeof window === "undefined" ? `/t/${template.shareSlug ?? slug}` : window.location.href;

  const campaignLabel =
    template.templateMode === "overlay_logo" ? "Monte sua marca na arte" : "Monte sua arte";
  const campaignPromise =
    template.templateMode === "overlay_logo"
      ? "Envie sua foto, ajuste a composicao e baixe uma arte pronta para divulgar sua campanha."
      : "Envie sua foto, encaixe no quadro e baixe sua lembranca pronta em poucos segundos.";
  const editorHelper =
    template.templateMode === "overlay_logo"
      ? "Arraste a foto ou a logo, ajuste com zoom e baixe quando a composicao estiver do seu jeito."
      : "Arraste a foto, aproxime se quiser e baixe sua imagem final ja dentro da moldura.";

  async function copyTextWithFallback(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error("Nao foi possivel copiar o link.");
    }
  }

  async function handleCopyLink() {
    try {
      await copyTextWithFallback(shareUrl);
      setCopied(true);
      setMessage("Link copiado. Agora voce pode compartilhar esta pagina.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMessage("Nao foi possivel copiar o link automaticamente neste navegador.");
    }
  }

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage(undefined);

    if (!isImageFile(file)) {
      setMessage("Selecione uma imagem valida para continuar.");
      return;
    }

    if (!isAllowedPhotoSize(file)) {
      setMessage("A foto esta grande demais. Use arquivos de ate 20 MB.");
      return;
    }

    const optimizedFile = await compressImageFile(file as File, {
      maxWidth: 1800,
      maxHeight: 1800,
      mimeType: "image/webp",
      quality: 0.86,
      skipBelowBytes: 2 * 1024 * 1024,
    });

    const nextMessage =
      optimizedFile.size < (file as File).size
        ? "Foto otimizada e pronta. Agora ajuste no quadro e baixe sua arte."
        : "Foto carregada. Agora ajuste no quadro e baixe sua arte.";

    setPhotoSrc(await fileToDataUrl(optimizedFile));
    setMessage(nextMessage);
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-6 md:space-y-7">
      <Panel
        variant="hero"
        size="lg"
        className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(204,95,26,0.2),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(29,58,47,0.12),transparent_34%),linear-gradient(140deg,rgba(255,248,239,0.98),rgba(255,255,255,0.92))]"
      >
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="space-y-5">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-ember/20 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-ember">
                {campaignLabel}
              </span>
              <div>
                <h1 className="font-display text-4xl font-bold leading-none text-ink md:text-5xl">
                  {template.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700 md:text-lg">
                  {campaignPromise}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Envie sua foto
              </span>
              <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Ajuste no editor
              </span>
              <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Baixe em segundos
              </span>
            </div>

            <UploadField
              title={photoSrc ? "Trocar foto" : "Enviar foto agora"}
              subtitle="Escolha sua imagem para abrir o editor ja pronto para ajuste e download."
              accept="image/*"
              onChange={(event) => {
                void handlePhotoChange(event);
              }}
            />

            <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
              <span>Compartilhe este link com quem vai criar a arte.</span>
              <Button variant="secondary" onClick={() => void handleCopyLink()}>
                {copied ? "Link copiado" : "Copiar link"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[32px] border border-white/80 bg-white/80 p-4 shadow-[0_24px_70px_-42px_rgba(29,58,47,0.45)] sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">
                    Previa da campanha
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    {template.templateMode === "overlay_logo"
                      ? "Ideal para destacar sua identidade sobre a arte final."
                      : "Pronto para publicar uma lembranca visual com a moldura completa."}
                  </p>
                </div>
                <span className="rounded-full bg-[#f8efe2] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-700">
                  PNG final
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-[28px] border border-stone-200 bg-[#fcfbf7] p-4">
                <div className="mx-auto aspect-[2/3] w-full max-w-[250px] overflow-hidden rounded-[22px] bg-white shadow-[0_16px_40px_-28px_rgba(17,24,39,0.45)]">
                  <img
                    src={template.frameUrl}
                    alt={`Previa da arte ${template.title}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className="rounded-[24px] border border-white/85 bg-white/74 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Edicao livre
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Upload, ajuste e download no mesmo fluxo, sem tela tecnica no meio.
                </p>
              </div>
              <div className="rounded-[24px] bg-[#1d3a2f] px-4 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                  Resultado rapido
                </p>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  Envie sua foto, ajuste do seu jeito e baixe a arte pronta sem precisar criar conta.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div ref={editorRef}>
        <Panel
          variant="soft"
          size="lg"
          className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,247,240,0.96))]"
        >
          <div className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">
                  Ajuste sua foto
                </p>
                <h2 className="mt-2 font-display text-3xl font-bold text-ink md:text-4xl">
                  Veja sua arte ganhando forma
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                  {editorHelper}
                </p>
              </div>

              <div className="rounded-[24px] border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-600">
                {photoSrc
                  ? "Sua foto ja esta no editor. Ajuste livremente e baixe quando ficar pronta."
                  : "Envie sua foto acima para abrir o resultado completo no editor."}
              </div>
            </div>

            <CanvasEditor
              templateMode={template.templateMode}
              frameSrc={template.frameUrl}
              photoSrc={photoSrc}
              initialOverlayConfig={template.overlayConfig}
              overlayEditable={template.templateMode === "overlay_logo"}
              helperText={
                template.templateMode === "overlay_logo"
                  ? "Toque e arraste a foto ou a logo. Use dois dedos para zoom da foto e o controle para ajustes finos."
                  : "Toque e arraste a foto. Use dois dedos ou o controle de zoom para aproximar."
              }
              onDownload={() => {
                void trackTemplateUse(template.id, "anonymous", "download");
              }}
            />
          </div>
        </Panel>
      </div>

      <Panel
        variant="soft"
        size="lg"
        className="bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,239,226,0.96))]"
      >
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ember">
              Pronto para baixar
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-ink">Fluxo simples, resultado rapido</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 md:text-base">
              Depois do upload, voce so precisa ajustar o enquadramento e tocar em baixar. O arquivo sai em PNG,
              pronto para compartilhar.
            </p>

            {message ? (
              <div className="mt-5 rounded-[24px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm leading-6 text-orange-900">
                {message}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[26px] border border-stone-200 bg-white/85 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">1. Escolha</div>
              <h3 className="mt-3 text-lg font-semibold text-ink">Envie uma boa foto</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Fotos mais nitidas deixam a arte final mais bonita e pronta para divulgar.
              </p>
            </div>

            <div className="rounded-[26px] border border-stone-200 bg-white/85 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">2. Ajuste</div>
              <h3 className="mt-3 text-lg font-semibold text-ink">Enquadre do seu jeito</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Arraste a imagem, use zoom e deixe o foco exatamente onde voce quer aparecer.
              </p>
            </div>

            <div className="rounded-[26px] border border-stone-200 bg-white/85 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">3. Baixe</div>
              <h3 className="mt-3 text-lg font-semibold text-ink">Leve a arte pronta</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Quando o resultado estiver certo, toque em baixar no editor e use sua arte onde quiser.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
