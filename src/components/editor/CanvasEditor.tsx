import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage } from "react-konva";
import { ExportButton } from "@/components/editor/ExportButton";
import { ZoomControls } from "@/components/editor/ZoomControls";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { loadImage } from "@/lib/image";
import type { OverlayConfig, TemplateMode } from "@/types/template";

const EXPORT_WIDTH = 1024;
const EXPORT_HEIGHT = 1536;
const MAX_PREVIEW_WIDTH = 420;

Konva.hitOnDragEnabled = true;

interface PhotoState {
  x: number;
  y: number;
  baseScale: number;
  zoom: number;
}

interface OverlayState {
  x: number;
  y: number;
  scale: number;
}

type ActiveLayer = "photo" | "overlay";

interface Point {
  x: number;
  y: number;
}

type MoveDirection = "up" | "down" | "left" | "right";

export interface CanvasEditorHandle {
  exportImage: () => string | null;
  reset: () => void;
  getOverlayConfig: () => OverlayConfig | undefined;
}

interface CanvasEditorProps {
  templateMode: TemplateMode;
  frameSrc?: string;
  photoSrc?: string;
  initialOverlayConfig?: OverlayConfig;
  overlayEditable?: boolean;
  usePlatformPreset?: boolean;
  helperText?: string;
  onDownload?: (dataUrl: string) => void;
}

interface StageSize {
  width: number;
  height: number;
}

function fitImage(
  image: HTMLImageElement,
  target: { x: number; y: number; width: number; height: number },
) {
  const scale = Math.max(target.width / image.width, target.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    baseScale: scale,
    zoom: 1,
    x: target.x + (target.width - width) / 2,
    y: target.y + (target.height - height) / 2,
  };
}

function zoomPhotoAtPoint(
  state: PhotoState,
  image: HTMLImageElement,
  target: { x: number; y: number; width: number; height: number },
  point: Point,
  nextZoom: number,
): PhotoState {
  const previousScale = state.baseScale * state.zoom;
  const nextScale = state.baseScale * nextZoom;
  const relativeX = (point.x - state.x) / previousScale;
  const relativeY = (point.y - state.y) / previousScale;

  return clampPhoto(
    {
      ...state,
      zoom: nextZoom,
      x: point.x - relativeX * nextScale,
      y: point.y - relativeY * nextScale,
    },
    image,
    target,
  );
}

function clampPhoto(
  state: PhotoState,
  image: HTMLImageElement,
  target: { x: number; y: number; width: number; height: number },
): PhotoState {
  const scale = state.baseScale * state.zoom;
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;

  const minX = target.x + target.width - scaledWidth;
  const maxX = target.x;
  const minY = target.y + target.height - scaledHeight;
  const maxY = target.y;

  return {
    ...state,
    x:
      scaledWidth <= target.width
        ? target.x + (target.width - scaledWidth) / 2
        : Math.min(maxX, Math.max(minX, state.x)),
    y:
      scaledHeight <= target.height
        ? target.y + (target.height - scaledHeight) / 2
        : Math.min(maxY, Math.max(minY, state.y)),
  };
}

function clampOverlay(
  state: OverlayState,
  image: HTMLImageElement,
  stageSize: StageSize,
): OverlayState {
  const width = image.width * state.scale;
  const height = image.height * state.scale;

  return {
    ...state,
    x: Math.min(stageSize.width - width, Math.max(0, state.x)),
    y: Math.min(stageSize.height - height, Math.max(0, state.y)),
  };
}

function zoomOverlayAtPoint(
  state: OverlayState,
  image: HTMLImageElement,
  stageSize: StageSize,
  point: Point,
  nextScale: number,
) {
  const relativeX = (point.x - state.x) / state.scale;
  const relativeY = (point.y - state.y) / state.scale;

  return clampOverlay(
    {
      ...state,
      scale: nextScale,
      x: point.x - relativeX * nextScale,
      y: point.y - relativeY * nextScale,
    },
    image,
    stageSize,
  );
}

function overlayConfigToState(
  image: HTMLImageElement,
  stageSize: StageSize,
  config?: OverlayConfig,
): OverlayState {
  if (config) {
    const preferredWidth = config.widthRatio * stageSize.width;
    return clampOverlay(
      {
        x: config.x * stageSize.width,
        y: config.y * stageSize.height,
        scale: preferredWidth / image.width || config.scale || 1,
      },
      image,
      stageSize,
    );
  }

  const width = stageSize.width * 0.28;
  return clampOverlay(
    {
      x: stageSize.width - width - 24,
      y: 56,
      scale: width / image.width,
    },
    image,
    stageSize,
  );
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  (
    {
      templateMode,
      frameSrc,
      photoSrc,
      initialOverlayConfig,
      overlayEditable = false,
      usePlatformPreset = false,
      helperText,
      onDownload,
    },
    ref,
  ) => {
    const stageRef = useRef<Konva.Stage | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const pinchDistanceRef = useRef<number | null>(null);
    const pinchPhotoZoomRef = useRef<number>(1);
    const pinchOverlayScaleRef = useRef<number>(1);
    const pinchPhotoStateRef = useRef<PhotoState | null>(null);
    const pinchOverlayStateRef = useRef<OverlayState | null>(null);
    const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
    const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
    const [photoState, setPhotoState] = useState<PhotoState | null>(null);
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const [activeLayer, setActiveLayer] = useState<ActiveLayer>(
      templateMode === "overlay_logo" ? "overlay" : "photo",
    );
    const [photoLocked, setPhotoLocked] = useState(false);
    const [overlayLocked, setOverlayLocked] = useState(true);
    const [showFineControls, setShowFineControls] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [stageSize, setStageSize] = useState<StageSize>({
      width: MAX_PREVIEW_WIDTH,
      height: MAX_PREVIEW_WIDTH * 1.5,
    });

    useEffect(() => {
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }, []);

    useEffect(() => {
      setPhotoLocked(false);
      setOverlayLocked(true);
      setShowFineControls(false);
      setActiveLayer("photo");
    }, [templateMode]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const updateSize = () => {
        const nextWidth = Math.min(container.clientWidth || MAX_PREVIEW_WIDTH, MAX_PREVIEW_WIDTH);
        setStageSize({
          width: nextWidth,
          height: nextWidth * (EXPORT_HEIGHT / EXPORT_WIDTH),
        });
      };

      updateSize();

      const observer = new ResizeObserver(updateSize);
      observer.observe(container);

      return () => observer.disconnect();
    }, []);

    const platformFocus = useMemo(
      () => ({
        x: stageSize.width * 0.15,
        y: stageSize.height * 0.33,
        width: stageSize.width * 0.7,
        height: stageSize.width * 0.7,
      }),
      [stageSize],
    );

    const photoTarget = useMemo(
      () =>
        templateMode === "full_frame" && usePlatformPreset
          ? platformFocus
          : { x: 0, y: 0, width: stageSize.width, height: stageSize.height },
      [platformFocus, stageSize, templateMode, usePlatformPreset],
    );

    useEffect(() => {
      if (!photoSrc) {
        setPhotoImage(null);
        setPhotoState(null);
        return;
      }

      let active = true;
      void loadImage(photoSrc).then((image) => {
        if (!active) {
          return;
        }
        setPhotoImage(image);
        setPhotoState(clampPhoto(fitImage(image, photoTarget), image, photoTarget));
      });

      return () => {
        active = false;
      };
    }, [photoSrc, photoTarget]);

    useEffect(() => {
      if (!frameSrc) {
        setFrameImage(null);
        setOverlayState(null);
        return;
      }

      let active = true;
      void loadImage(frameSrc).then((image) => {
        if (!active) {
          return;
        }

        setFrameImage(image);
        if (templateMode === "overlay_logo") {
          setOverlayState(overlayConfigToState(image, stageSize, initialOverlayConfig));
        } else {
          setOverlayState(null);
        }
      });

      return () => {
        active = false;
      };
    }, [frameSrc, initialOverlayConfig, stageSize, templateMode]);

    useImperativeHandle(ref, () => ({
      exportImage: () => stageRef.current?.toDataURL({ pixelRatio: 1 }) ?? null,
      reset: () => {
        resetScene();
      },
      getOverlayConfig: () => {
        if (templateMode !== "overlay_logo" || !frameImage || !overlayState) {
          return undefined;
        }

        return {
          x: overlayState.x / stageSize.width,
          y: overlayState.y / stageSize.height,
          scale: overlayState.scale,
          widthRatio: (frameImage.width * overlayState.scale) / stageSize.width,
        };
      },
    }));

    const actualPhotoScale = photoState ? photoState.baseScale * photoState.zoom : 1;
    const isOverlayMode = templateMode === "overlay_logo";
    const isPhotoActive = activeLayer === "photo";
    const isOverlayActive = isOverlayMode && activeLayer === "overlay";
    const activeLayerLocked = isOverlayActive ? overlayLocked : false;
    const topLayerLabel = isOverlayMode ? "Camada superior" : "Moldura";
    const interactionHint = isOverlayMode
      ? overlayLocked
        ? "Arraste a foto. Destrave a moldura so quando quiser ajustar a camada de cima."
        : "Mova a moldura, alinhe no canvas e trave de novo quando terminar."
      : "Arraste a foto e use o zoom para encaixar do jeito que quiser.";

    function handlePhotoZoomChange(nextZoom: number) {
      if (!photoState || !photoImage || photoLocked) {
        return;
      }

      setActiveLayer("photo");
      setPhotoState((current) => {
        if (!current) {
          return current;
        }

        const center = {
          x: photoTarget.x + photoTarget.width / 2,
          y: photoTarget.y + photoTarget.height / 2,
        };

        return zoomPhotoAtPoint(current, photoImage, photoTarget, center, nextZoom);
      });
    }

    function handleOverlayScaleChange(nextScale: number) {
      if (!frameImage || !overlayState || overlayLocked) {
        return;
      }

      setActiveLayer("overlay");
      setOverlayState((current) => {
        if (!current) {
          return current;
        }

        const center = {
          x: current.x + (frameImage.width * current.scale) / 2,
          y: current.y + (frameImage.height * current.scale) / 2,
        };

        return zoomOverlayAtPoint(current, frameImage, stageSize, center, nextScale);
      });
    }

    function nudgePhoto(direction: MoveDirection) {
      if (!photoImage || !photoState || photoLocked) {
        return;
      }

      const step = 18;
      const delta =
        direction === "up"
          ? { x: 0, y: -step }
          : direction === "down"
            ? { x: 0, y: step }
            : direction === "left"
              ? { x: -step, y: 0 }
              : { x: step, y: 0 };

      setPhotoState(
        clampPhoto(
          {
            ...photoState,
            x: photoState.x + delta.x,
            y: photoState.y + delta.y,
          },
          photoImage,
          photoTarget,
        ),
      );
    }

    function nudgeOverlay(direction: MoveDirection) {
      if (!frameImage || !overlayState || overlayLocked) {
        return;
      }

      const step = 14;
      const delta =
        direction === "up"
          ? { x: 0, y: -step }
          : direction === "down"
            ? { x: 0, y: step }
            : direction === "left"
              ? { x: -step, y: 0 }
              : { x: step, y: 0 };

      setOverlayState(
        clampOverlay(
          {
            ...overlayState,
            x: overlayState.x + delta.x,
            y: overlayState.y + delta.y,
          },
          frameImage,
          stageSize,
        ),
      );
    }

    function handleMove(direction: MoveDirection) {
      if (isOverlayActive) {
        nudgeOverlay(direction);
        return;
      }

      nudgePhoto(direction);
    }

    function handleZoomStep(direction: "in" | "out") {
      if (isOverlayActive && overlayState && !overlayLocked) {
        const nextScale = direction === "in" ? overlayState.scale + 0.08 : overlayState.scale - 0.08;
        handleOverlayScaleChange(Math.min(2.5, Math.max(0.2, Number(nextScale.toFixed(2)))));
        return;
      }

      if (!photoState || photoLocked) {
        return;
      }

      const nextZoom = direction === "in" ? photoState.zoom + 0.08 : photoState.zoom - 0.08;
      handlePhotoZoomChange(Math.min(3, Math.max(0.5, Number(nextZoom.toFixed(2)))));
    }

    function getTouchDistance(touches: TouchList) {
      const first = touches[0];
      const second = touches[1];
      const dx = second.clientX - first.clientX;
      const dy = second.clientY - first.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchCenter(touches: TouchList): Point {
      const first = touches[0];
      const second = touches[1];
      const stage = stageRef.current;
      const rect = stage?.container().getBoundingClientRect();

      if (!rect) {
        return { x: stageSize.width / 2, y: stageSize.height / 2 };
      }

      return {
        x: (first.clientX + second.clientX) / 2 - rect.left,
        y: (first.clientY + second.clientY) / 2 - rect.top,
      };
    }

    function resetPinchTracking() {
      pinchDistanceRef.current = null;
      pinchPhotoStateRef.current = null;
      pinchOverlayStateRef.current = null;
    }

    function handleStageTouchStart(event: Konva.KonvaEventObject<TouchEvent>) {
      const touches = event.evt.touches;
      if (touches.length !== 2 || activeLayerLocked) {
        return;
      }

      pinchDistanceRef.current = getTouchDistance(touches);
      pinchPhotoZoomRef.current = photoState?.zoom ?? 1;
      pinchOverlayScaleRef.current = overlayState?.scale ?? 1;
      pinchPhotoStateRef.current = photoState;
      pinchOverlayStateRef.current = overlayState;
    }

    function handleStageTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
      const touches = event.evt.touches;
      if (touches.length !== 2) {
        resetPinchTracking();
        return;
      }

      event.evt.preventDefault();
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);

      if (!pinchDistanceRef.current) {
        pinchDistanceRef.current = distance;
        pinchPhotoZoomRef.current = photoState?.zoom ?? 1;
        pinchOverlayScaleRef.current = overlayState?.scale ?? 1;
        pinchPhotoStateRef.current = photoState;
        pinchOverlayStateRef.current = overlayState;
        return;
      }

      const ratio = distance / pinchDistanceRef.current;

      if (isOverlayActive && frameImage && pinchOverlayStateRef.current && !overlayLocked) {
        const nextScale = Math.min(2.5, Math.max(0.2, pinchOverlayScaleRef.current * ratio));
        setOverlayState(
          zoomOverlayAtPoint(pinchOverlayStateRef.current, frameImage, stageSize, center, nextScale),
        );
        return;
      }

      if (photoImage && pinchPhotoStateRef.current && !photoLocked) {
        const nextZoom = Math.min(3, Math.max(0.5, pinchPhotoZoomRef.current * ratio));
        setPhotoState(
          zoomPhotoAtPoint(pinchPhotoStateRef.current, photoImage, photoTarget, center, nextZoom),
        );
      }
    }

    function handleStageTouchEnd() {
      resetPinchTracking();
    }

    function handleStageWheel(event: Konva.KonvaEventObject<WheelEvent>) {
      if (activeLayerLocked) {
        return;
      }

      event.evt.preventDefault();

      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) {
        return;
      }

      const zoomIn = event.evt.deltaY < 0;
      const factor = zoomIn ? 1.08 : 1 / 1.08;

      if (isOverlayActive && frameImage && overlayState && !overlayLocked) {
        const nextScale = Math.min(2.5, Math.max(0.2, overlayState.scale * factor));
        setOverlayState(zoomOverlayAtPoint(overlayState, frameImage, stageSize, pointer, nextScale));
        return;
      }

      if (photoImage && photoState && !photoLocked) {
        const nextZoom = Math.min(3, Math.max(0.5, photoState.zoom * factor));
        setPhotoState(zoomPhotoAtPoint(photoState, photoImage, photoTarget, pointer, nextZoom));
      }
    }

    function resetScene() {
      setPhotoLocked(false);
      setOverlayLocked(true);
      setShowFineControls(false);
      setActiveLayer("photo");

      if (photoImage) {
        setPhotoState(clampPhoto(fitImage(photoImage, photoTarget), photoImage, photoTarget));
      }

      if (frameImage && templateMode === "overlay_logo") {
        setOverlayState(overlayConfigToState(frameImage, stageSize, initialOverlayConfig));
      }
    }

    function handlePhotoDragPosition(x: number, y: number) {
      if (!photoImage || !photoState || photoLocked) {
        return;
      }

      setPhotoState(
        clampPhoto(
          {
            ...photoState,
            x,
            y,
          },
          photoImage,
          photoTarget,
        ),
      );
    }

    function handleOverlayDragPosition(x: number, y: number) {
      if (!frameImage || !overlayState || overlayLocked) {
        return;
      }

      setOverlayState(
        clampOverlay(
          {
            ...overlayState,
            x,
            y,
          },
          frameImage,
          stageSize,
        ),
      );
    }

    function toggleOverlayLock() {
      setOverlayLocked((current) => !current);
      setActiveLayer((current) => (current === "overlay" ? "photo" : "overlay"));
    }

    function getExportDataUrl() {
      const pixelRatio = EXPORT_WIDTH / stageSize.width;

      try {
        return stageRef.current?.toDataURL({ pixelRatio }) ?? null;
      } catch {
        return null;
      }
    }

    function downloadFromDataUrl(dataUrl: string) {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "moldify-export.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    function handleDownload() {
      setActionMessage(null);

      const dataUrl = getExportDataUrl();
      if (!dataUrl) {
        setActionMessage("Nao foi possivel gerar a imagem final. Tente usar outra moldura ou recarregar a pagina.");
        return;
      }

      try {
        downloadFromDataUrl(dataUrl);
        onDownload?.(dataUrl);
      } catch {
        setActionMessage("Nao foi possivel iniciar o download neste navegador.");
      }
    }

    async function handleShare() {
      setActionMessage(null);

      const dataUrl = getExportDataUrl();
      if (!dataUrl) {
        setActionMessage("Nao foi possivel preparar a imagem para compartilhar.");
        return;
      }

      if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
        handleDownload();
        return;
      }

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "moldify-export.png", { type: "image/png" });

        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Moldify",
            text: "Imagem criada no Moldify",
            files: [file],
          });
        } else {
          await navigator.share({
            title: "Moldify",
            text: "Imagem criada no Moldify",
          });
        }
      } catch {
        handleDownload();
      }
    }

    return (
      <Panel variant="compact" size="sm" className="min-w-0 overflow-hidden space-y-4">
        <div className="grid gap-3 rounded-[28px] border border-stone-200 bg-white/78 p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">
                  {isOverlayMode ? topLayerLabel : "Foto livre"}
                </span>
                <span
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] ${
                    isOverlayMode && overlayLocked
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isOverlayMode
                    ? overlayLocked
                      ? "Travada"
                      : "Destravada"
                    : "Pronta para mover"}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-ink sm:text-lg">
                  {isOverlayMode ? "Ajuste a foto e a moldura" : "Ajuste sua foto"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-stone-600 sm:text-sm">{interactionHint}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isOverlayMode ? (
                <Button variant={overlayLocked ? "secondary" : "primary"} onClick={toggleOverlayLock}>
                  {overlayLocked ? "Destravar moldura" : "Travar moldura"}
                </Button>
              ) : null}
              <ExportButton onClick={handleDownload} disabled={!photoImage || !frameImage} />
              {canShare ? (
                <Button
                  variant="secondary"
                  onClick={() => void handleShare()}
                  disabled={!photoImage || !frameImage}
                >
                  Compartilhar
                </Button>
              ) : null}
              <Button variant="secondary" onClick={resetScene}>
                Comecar de novo
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white p-2 sm:p-3">
            <div
              ref={containerRef}
              className="editor-stage relative mx-auto w-full max-w-[420px] overflow-hidden"
            >
              <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
                <div className="rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600 shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur">
                  {isOverlayMode ? "Arraste a foto" : "Toque e arraste"}
                </div>
                <div className="rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-stone-700 shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur">
                  {isOverlayMode && overlayLocked ? "Moldura fixa" : "Canvas livre"}
                </div>
              </div>

              <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/88 text-lg font-bold text-ink shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur transition hover:text-ember disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Aumentar zoom"
                  disabled={activeLayerLocked}
                  onClick={() => handleZoomStep("in")}
                >
                  +
                </button>
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/88 text-lg font-bold text-ink shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur transition hover:text-ember disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Diminuir zoom"
                  disabled={activeLayerLocked}
                  onClick={() => handleZoomStep("out")}
                >
                  -
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-4.75rem)] rounded-2xl border border-white/80 bg-white/84 px-3 py-2 text-[11px] font-semibold leading-5 text-stone-700 shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur">
                {helperText ??
                  (isOverlayMode
                    ? "A foto ja esta livre. Destrave a moldura so quando quiser alinhar a camada de cima."
                    : "Arraste a foto e use o zoom para acertar o enquadramento.")}
              </div>
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              className="overflow-hidden rounded-[28px]"
              style={{
                display: "block",
                width: stageSize.width,
                height: stageSize.height,
                background: "#fcfbf7",
              }}
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={handleStageTouchEnd}
              onTouchCancel={handleStageTouchEnd}
              onWheel={handleStageWheel}
            >
              <Layer>
                <Rect width={stageSize.width} height={stageSize.height} fill="#fcfbf7" />
                {photoImage && photoState ? (
                  <KonvaImage
                    image={photoImage}
                    x={photoState.x}
                    y={photoState.y}
                    scaleX={actualPhotoScale}
                    scaleY={actualPhotoScale}
                    draggable={!photoLocked && (!isOverlayMode || isPhotoActive)}
                    listening={!isOverlayMode || isPhotoActive}
                    onMouseDown={() => setActiveLayer("photo")}
                    onTouchStart={() => setActiveLayer("photo")}
                    onDragMove={(event) => handlePhotoDragPosition(event.target.x(), event.target.y())}
                    onDragEnd={(event) => handlePhotoDragPosition(event.target.x(), event.target.y())}
                  />
                ) : null}

                {isOverlayMode && frameImage && overlayState ? (
                  <KonvaImage
                    image={frameImage}
                    x={overlayState.x}
                    y={overlayState.y}
                    scaleX={overlayState.scale}
                    scaleY={overlayState.scale}
                    draggable={overlayEditable && !overlayLocked && isOverlayActive}
                    listening={isOverlayActive}
                    onMouseDown={() => setActiveLayer("overlay")}
                    onTouchStart={() => setActiveLayer("overlay")}
                    onDragMove={(event) => handleOverlayDragPosition(event.target.x(), event.target.y())}
                    onDragEnd={(event) => handleOverlayDragPosition(event.target.x(), event.target.y())}
                  />
                ) : null}

                {templateMode === "full_frame" && frameImage ? (
                  <KonvaImage
                    image={frameImage}
                    x={0}
                    y={0}
                    width={stageSize.width}
                    height={stageSize.height}
                    listening={false}
                  />
                ) : null}
              </Layer>
            </Stage>
          </div>
        </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <ZoomControls
            photoZoom={photoState?.zoom ?? 1}
            onPhotoZoomChange={handlePhotoZoomChange}
            photoLocked={photoLocked}
            logoScale={isOverlayMode ? overlayState?.scale : undefined}
            onLogoScaleChange={isOverlayMode ? handleOverlayScaleChange : undefined}
            logoLocked={isOverlayMode ? overlayLocked : undefined}
          />

          <div className="rounded-[24px] border border-stone-200 bg-stone-50/80 p-3.5 sm:min-w-[220px] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Ajustes finos
                </div>
                <div className="mt-1 text-xs leading-5 text-stone-600">
                  {activeLayerLocked
                    ? "Destrave a camada ativa para usar os botoes."
                    : isOverlayActive
                      ? "Pequenos ajustes na moldura."
                      : "Pequenos ajustes na foto."}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setShowFineControls((current) => !current)}>
                {showFineControls ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </div>
        </div>

        {showFineControls ? (
          <div className="grid min-w-0 gap-3 rounded-[24px] border border-stone-200 bg-stone-50/70 p-3.5 sm:p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
              Pequenos ajustes de posicao
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                className="min-h-[46px] min-w-[46px] px-0 py-0 text-lg"
                aria-label="Mover para esquerda"
                title="Mover para esquerda"
                disabled={activeLayerLocked}
                onClick={() => handleMove("left")}
              >
                ←
              </Button>
              <Button
                variant="secondary"
                className="min-h-[46px] min-w-[46px] px-0 py-0 text-lg"
                aria-label="Mover para cima"
                title="Mover para cima"
                disabled={activeLayerLocked}
                onClick={() => handleMove("up")}
              >
                ↑
              </Button>
              <Button
                variant="secondary"
                className="min-h-[46px] min-w-[46px] px-0 py-0 text-lg"
                aria-label="Mover para baixo"
                title="Mover para baixo"
                disabled={activeLayerLocked}
                onClick={() => handleMove("down")}
              >
                ↓
              </Button>
              <Button
                variant="secondary"
                className="min-h-[46px] min-w-[46px] px-0 py-0 text-lg"
                aria-label="Mover para direita"
                title="Mover para direita"
                disabled={activeLayerLocked}
                onClick={() => handleMove("right")}
              >
                →
              </Button>
            </div>
          </div>
        ) : null}

        <div className="rounded-[22px] border border-stone-200 bg-stone-50/70 px-4 py-3 text-xs font-semibold leading-5 text-stone-600 sm:text-sm">
          {helperText ??
            (isOverlayMode
              ? "A foto ja esta livre. Destrave a moldura so quando quiser alinhar a camada de cima."
              : "Arraste a foto, ajuste o zoom e baixe quando ficar do seu jeito.")}
        </div>

        {actionMessage ? <div className="text-sm text-red-700">{actionMessage}</div> : null}
      </Panel>
    );
  },
);

CanvasEditor.displayName = "CanvasEditor";
