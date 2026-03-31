import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CanvasEditor, type CanvasEditorHandle } from "@/components/editor/CanvasEditor";
import { UploadField } from "@/components/editor/UploadField";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { useAuth } from "@/hooks/useAuth";
import { usePlatformTemplates } from "@/hooks/usePlatformTemplates";
import { compressImageFile, fileToDataUrl } from "@/lib/image";
import { uploadAsset, uploadDataUrlAsset } from "@/services/storage";
import { getUserTemplate, saveTemplateDraft } from "@/services/templates";
import type { TemplateMode } from "@/types/template";
import {
  isAllowedFrameSize,
  isAllowedPhotoSize,
  isFrameFile,
  isImageFile,
} from "@/utils/validators";

type FeedbackTone = "info" | "success" | "error";

export function EditorPage() {
  const { user } = useAuth();
  const { templateId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editorRef = useRef<CanvasEditorHandle>(null);
  const [title, setTitle] = useState("");
  const [photoSrc, setPhotoSrc] = useState<string>();
  const [frameSrc, setFrameSrc] = useState<string>();
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [frameStoragePath, setFrameStoragePath] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [messageTone, setMessageTone] = useState<FeedbackTone>("info");
  const isNewFrame = location.pathname === "/editor/new/frame";
  const isNewOverlay = location.pathname === "/editor/new/overlay";
  const platformTemplateId = searchParams.get("platform");
  const { data: platformTemplates = [] } = usePlatformTemplates();
  const selectedPlatform = platformTemplates.find((item) => item.id === platformTemplateId);

  const { data: existingTemplate } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => getUserTemplate(templateId as string),
    enabled: Boolean(templateId),
  });

  const mode = useMemo<TemplateMode>(() => {
    if (existingTemplate) {
      return existingTemplate.templateMode;
    }
    return isNewOverlay ? "overlay_logo" : "full_frame";
  }, [existingTemplate, isNewOverlay]);

  useEffect(() => {
    if (existingTemplate) {
      setTitle(existingTemplate.title);
      setFrameSrc(existingTemplate.frameUrl);
      setFrameStoragePath(existingTemplate.frameStoragePath);
      return;
    }

    if (selectedPlatform) {
      setTitle(selectedPlatform.title);
      setFrameSrc(selectedPlatform.imageUrl);
      setFrameStoragePath(undefined);
    }
  }, [existingTemplate, selectedPlatform]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Login necessario.");
      }

      if (!title.trim()) {
        throw new Error("Informe um titulo para o template.");
      }

      if (!frameSrc && !selectedPlatform) {
        throw new Error("Envie uma moldura ou logo antes de salvar.");
      }

      let resolvedFrameUrl = frameSrc;
      let resolvedFramePath = frameStoragePath;

      if (frameFile) {
        const uploaded = await uploadAsset(
          frameFile,
          user.id,
          mode === "overlay_logo" ? "logos" : "frames",
        );
        resolvedFrameUrl = uploaded.url;
        resolvedFramePath = uploaded.path;
        setFrameStoragePath(uploaded.path);
        setFrameFile(null);
      }

      const thumbnailDataUrl = editorRef.current?.exportImage();
      const uploadedThumbnail = thumbnailDataUrl
        ? await uploadDataUrlAsset(thumbnailDataUrl, user.id, "thumbnails", "preview.png")
        : undefined;

      const template = await saveTemplateDraft({
        id: existingTemplate?.id,
        ownerId: user.id,
        title: title.trim(),
        templateMode: mode,
        frameUrl: resolvedFrameUrl ?? selectedPlatform?.imageUrl ?? "",
        frameStoragePath: resolvedFramePath,
        thumbnailUrl: uploadedThumbnail?.url ?? existingTemplate?.thumbnailUrl,
        overlayConfig: editorRef.current?.getOverlayConfig(),
        source: selectedPlatform ? "platform" : "custom",
        platformTemplateId: selectedPlatform?.id,
      });

      await queryClient.invalidateQueries({ queryKey: ["user-templates", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["template", template.id] });
      return template;
    },
    onSuccess: (template) => {
      setMessageTone("success");
      setMessage("Rascunho salvo com sucesso.");
      navigate(`/editor/${template.id}`, { replace: true });
    },
    onError: (error) => {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o rascunho.");
    },
  });

  const viewOnlyPlatform = Boolean(selectedPlatform) && isNewFrame;
  const topMessageClassName =
    messageTone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : messageTone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-orange-200 bg-orange-50 text-orange-900";

  async function handleSaveDraft() {
    setMessageTone("info");
    setMessage("Salvando rascunho...");
    await saveMutation.mutateAsync();
  }

  async function handlePublishTemplate() {
    try {
      setMessageTone("info");
      setMessage("Salvando rascunho antes da publicacao...");
      const template = await saveMutation.mutateAsync();
      navigate(`/publish/${template.id}`);
    } catch {
      // saveMutation.onError already updates the UI
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-ember">
            {mode === "full_frame" ? "Moldura completa" : "Logo sobreposta"}
          </p>
          <h1 className="font-display text-4xl font-bold text-ink">
            {viewOnlyPlatform ? "Editor da moldura da plataforma" : "Editor de template"}
          </h1>
        </div>

        {!viewOnlyPlatform ? (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => void handleSaveDraft()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar rascunho"}
            </Button>
            <Button onClick={() => void handlePublishTemplate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Preparando..." : "Salvar e publicar"}
            </Button>
          </div>
        ) : null}
      </div>

      {!viewOnlyPlatform && message ? (
        <Panel className={`p-4 text-sm ${topMessageClassName}`}>{message}</Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
        <div className="order-2 space-y-5 xl:order-1">
          <Panel>
            <label className="block text-sm font-semibold text-ink">
              Titulo do template
              <input
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-ember"
                value={title}
                disabled={viewOnlyPlatform}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Equipe Runners Norte"
              />
            </label>
          </Panel>

          <UploadField
            title="Enviar foto"
            subtitle="A foto do usuario e usada para montar o preview e a exportacao. Arquivos pesados sao otimizados."
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!isImageFile(file)) {
                setMessageTone("error");
                setMessage("Selecione uma imagem valida para a foto.");
                return;
              }

              if (!isAllowedPhotoSize(file)) {
                setMessageTone("error");
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

              if (optimizedFile.size < (file as File).size) {
                setMessageTone("info");
                setMessage("Foto otimizada automaticamente para carregar mais rapido.");
              }

              setPhotoSrc(await fileToDataUrl(optimizedFile));
            }}
          />

          {!viewOnlyPlatform ? (
            <UploadField
              title={mode === "overlay_logo" ? "Enviar logo" : "Enviar moldura"}
              subtitle={
                mode === "overlay_logo"
                  ? "PNG ou WebP transparente para ficar acima da foto. Imagens pesadas sao otimizadas."
                  : "PNG ou WebP transparente cobrindo todo o canvas. Imagens pesadas sao otimizadas."
              }
              accept="image/png,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!isFrameFile(file)) {
                  setMessageTone("error");
                  setMessage("Envie um PNG ou WebP valido para a moldura.");
                  return;
                }

                if (!isAllowedFrameSize(file)) {
                  setMessageTone("error");
                  setMessage("A moldura ou logo esta grande demais. Use arquivos de ate 12 MB.");
                  return;
                }

                const optimizedFile = await compressImageFile(file as File, {
                  maxWidth: 1600,
                  maxHeight: 1600,
                  mimeType: "image/webp",
                  quality: 0.9,
                  skipBelowBytes: 1.5 * 1024 * 1024,
                });

                if (optimizedFile.size < (file as File).size) {
                  setMessageTone("info");
                  setMessage("Moldura otimizada automaticamente para economizar armazenamento.");
                }

                setFrameFile(optimizedFile);
                setFrameSrc(await fileToDataUrl(optimizedFile));
              }}
            />
          ) : null}

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Como este fluxo funciona</h2>
            <div className="mt-3 space-y-2 text-sm text-stone-600">
              {mode === "overlay_logo" ? (
                <>
                  <p>A logo fica por cima da foto e o visitante tambem pode mover e redimensionar na pagina publica.</p>
                  <p>O arquivo da logo nao pode ser trocado pelo visitante.</p>
                </>
              ) : (
                <>
                  <p>A moldura cobre todo o canvas e fica fixa acima da foto, como no prototipo atual.</p>
                  <p>Na pagina publica, o visitante ajusta apenas a propria foto.</p>
                </>
              )}
            </div>
          </Panel>
        </div>

        <div className="order-1 xl:order-2">
          <CanvasEditor
            ref={editorRef}
            templateMode={mode}
            frameSrc={frameSrc}
            photoSrc={photoSrc}
            initialOverlayConfig={existingTemplate?.overlayConfig}
            overlayEditable={mode === "overlay_logo"}
            usePlatformPreset={Boolean(selectedPlatform)}
            helperText={
              mode === "overlay_logo"
                ? "No celular, arraste com um dedo e use pinch ou o slider para ajustar foto e logo."
                : "No celular, arraste com um dedo e use pinch ou o slider para ajustar a foto."
            }
          />
        </div>
      </div>
    </div>
  );
}
