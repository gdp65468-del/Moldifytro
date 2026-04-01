import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CanvasEditor } from "@/components/editor/CanvasEditor";
import { UploadField } from "@/components/editor/UploadField";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { usePublicPlatformTemplate } from "@/hooks/usePublicPlatformTemplate";
import { compressImageFile, fileToDataUrl } from "@/lib/image";
import { buildAbsoluteUrl, copyTextWithFallback, getPlatformTemplatePublicPath } from "@/lib/share";
import { isAllowedPhotoSize, isImageFile } from "@/utils/validators";

export function PlatformTemplatePublicPage() {
  const { platformTemplateId } = useParams();
  const { data: template, isLoading } = usePublicPlatformTemplate(platformTemplateId);
  const [photoSrc, setPhotoSrc] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  if (isLoading) {
    return <Panel>Carregando moldura...</Panel>;
  }

  if (!template) {
    return (
      <Panel>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Moldura nao encontrada</h1>
        <p className="mt-2 text-stone-600">
          Esta moldura nao esta mais disponivel ou foi removida da plataforma.
        </p>
      </Panel>
    );
  }

  const shareUrl = buildAbsoluteUrl(getPlatformTemplatePublicPath(template.id));

  async function handleCopyLink() {
    try {
      await copyTextWithFallback(shareUrl);
      setCopied(true);
      setMessage("Link copiado. Agora e so enviar para quem vai usar essa moldura.");
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

    setPhotoSrc(await fileToDataUrl(optimizedFile));
    setMessage("Foto carregada. Agora ajuste no quadro e baixe sua arte.");
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
                Moldura gratuita
              </span>
              <div>
                <h1 className="font-display text-4xl font-bold leading-none text-ink md:text-5xl">
                  {template.title}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700 md:text-lg">
                  Envie sua foto, ajuste no quadro e baixe uma arte pronta em poucos segundos, sem precisar
                  entrar na conta.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Gratis
              </span>
              <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Sem login
              </span>
              <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700">
                Baixe em segundos
              </span>
            </div>

            <UploadField
              title={photoSrc ? "Trocar foto" : "Enviar foto agora"}
              subtitle="Escolha sua imagem para abrir o editor com a moldura pronta para ajuste e download."
              accept="image/*"
              onChange={(event) => {
                void handlePhotoChange(event);
              }}
            />

            <div className="flex flex-wrap items-center gap-4 text-sm text-stone-600">
              <span>Compartilhe esta moldura com outras pessoas.</span>
              <Button variant="secondary" onClick={() => void handleCopyLink()}>
                {copied ? "Link copiado" : "Copiar link"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[24px] border border-white/85 bg-white/74 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Uso livre
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Abra, envie a foto e baixe sua arte sem criar rascunho e sem passar por checkout.
                </p>
              </div>
              <div className="rounded-[24px] bg-[#1d3a2f] px-4 py-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                  Link publico
                </p>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  Compartilhe com quantas pessoas quiser e deixe cada uma montar a propria imagem.
                </p>
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
                  Arraste a foto, ajuste o enquadramento e baixe a arte final pronta para divulgar.
                </p>
              </div>

              <div className="rounded-[24px] border border-stone-200 bg-white/80 px-4 py-3 text-sm text-stone-600">
                {photoSrc
                  ? "Sua foto ja esta no editor. Ajuste livremente e baixe quando ficar pronta."
                  : "Envie sua foto acima para abrir o resultado completo no editor."}
              </div>
            </div>

            <CanvasEditor
              templateMode="full_frame"
              frameSrc={template.imageUrl}
              photoSrc={photoSrc}
              usePlatformPreset
              helperText="Toque e arraste a foto. Use dois dedos ou o controle de zoom para aproximar."
            />
          </div>
        </Panel>
      </div>

      <Panel
        variant="soft"
        size="lg"
        className="bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(248,239,226,0.96))]"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-stone-200 bg-white/85 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">1. Escolha</div>
            <h3 className="mt-3 text-lg font-semibold text-ink">Envie uma boa foto</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Fotos mais nitidas ajudam a arte final a ficar mais bonita e pronta para compartilhar.
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

        {message ? (
          <div className="mt-5 rounded-[24px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm leading-6 text-orange-900">
            {message}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
