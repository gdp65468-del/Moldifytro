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
    const [activeLayer, setActiveLayer] = useState<ActiveLayer>("photo");
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
        if (photoImage) {
          setPhotoState(clampPhoto(fitImage(photoImage, photoTarget), photoImage, photoTarget));
        }

        if (frameImage && templateMode === "overlay_logo") {
          setOverlayState(overlayConfigToState(frameImage, stageSize, initialOverlayConfig));
        }
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

    function handlePhotoZoomChange(nextZoom: number) {
      if (!photoState || !photoImage) {
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
      if (!frameImage || !overlayState) {
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
      if (!photoImage || !photoState) {
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
      if (!frameImage || !overlayState) {
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
      if (templateMode === "overlay_logo" && activeLayer === "overlay") {
        nudgeOverlay(direction);
        return;
      }

      nudgePhoto(direction);
    }

    function handleZoomStep(direction: "in" | "out") {
      if (templateMode === "overlay_logo" && activeLayer === "overlay" && overlayState) {
        const nextScale = direction === "in" ? overlayState.scale + 0.08 : overlayState.scale - 0.08;
        handleOverlayScaleChange(Math.min(2.5, Math.max(0.2, Number(nextScale.toFixed(2)))));
        return;
      }

      if (!photoState) {
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
      if (touches.length !== 2) {
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

      if (
        activeLayer === "overlay" &&
        templateMode === "overlay_logo" &&
        frameImage &&
        pinchOverlayStateRef.current
      ) {
        const nextScale = Math.min(2.5, Math.max(0.2, pinchOverlayScaleRef.current * ratio));
        setOverlayState(
          zoomOverlayAtPoint(pinchOverlayStateRef.current, frameImage, stageSize, center, nextScale),
        );
        return;
      }

      if (photoImage && pinchPhotoStateRef.current) {
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
      event.evt.preventDefault();

      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!pointer) {
        return;
      }

      const zoomIn = event.evt.deltaY < 0;
      const factor = zoomIn ? 1.08 : 1 / 1.08;

      if (activeLayer === "overlay" && templateMode === "overlay_logo" && frameImage && overlayState) {
        const nextScale = Math.min(2.5, Math.max(0.2, overlayState.scale * factor));
        setOverlayState(zoomOverlayAtPoint(overlayState, frameImage, stageSize, pointer, nextScale));
        return;
      }

      if (photoImage && photoState) {
        const nextZoom = Math.min(3, Math.max(0.5, photoState.zoom * factor));
        setPhotoState(zoomPhotoAtPoint(photoState, photoImage, photoTarget, pointer, nextZoom));
      }
    }

    function resetScene() {
      if (photoImage) {
        setPhotoState(clampPhoto(fitImage(photoImage, photoTarget), photoImage, photoTarget));
      }

      if (frameImage && templateMode === "overlay_logo") {
        setOverlayState(overlayConfigToState(frameImage, stageSize, initialOverlayConfig));
      }
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
      <Panel className="min-w-0 overflow-hidden space-y-5">
        <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white p-2 sm:p-3">
          <div ref={containerRef} className="editor-stage mx-auto w-full max-w-[420px] overflow-hidden">
            <Stage
              ref={stageRef}
              width={stageSize.width}
              height={stageSize.height}
              className="overflow-hidden rounded-[28px]"
              style={{ display: "block", width: stageSize.width, height: stageSize.height, background: "#fcfbf7" }}
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
                    draggable
                    onMouseDown={() => setActiveLayer("photo")}
                    onTouchStart={() => setActiveLayer("photo")}
                    onDragEnd={(event) => {
                      if (!photoImage || !photoState) {
                        return;
                      }

                      setPhotoState(
                        clampPhoto(
                          {
                            ...photoState,
                            x: event.target.x(),
                            y: event.target.y(),
                          },
                          photoImage,
                          photoTarget,
                        ),
                      );
                    }}
                  />
                ) : null}

                {templateMode === "overlay_logo" && frameImage && overlayState ? (
                  <KonvaImage
                    image={frameImage}
                    x={overlayState.x}
                    y={overlayState.y}
                    scaleX={overlayState.scale}
                    scaleY={overlayState.scale}
                    draggable={overlayEditable}
                    onMouseDown={() => setActiveLayer("overlay")}
                    onTouchStart={() => setActiveLayer("overlay")}
                    onDragEnd={(event) => {
                      if (!frameImage || !overlayState || !overlayEditable) {
                        return;
                      }

                      setOverlayState(
                        clampOverlay(
                          {
                            ...overlayState,
                            x: event.target.x(),
                            y: event.target.y(),
                          },
                          frameImage,
                          stageSize,
                        ),
                      );
                    }}
                  />
                ) : null}

                {templateMode === "full_frame" && frameImage ? (
                  <KonvaImage
                    image={frameImage}
                    x={0}
                    y={0}
                    width={stageSize.width}
                    height={stageSize.height}
                  />
                ) : null}
              </Layer>
            </Stage>
          </div>
        </div>

        <ZoomControls
          photoZoom={photoState?.zoom ?? 1}
          onPhotoZoomChange={handlePhotoZoomChange}
          logoScale={templateMode === "overlay_logo" ? overlayState?.scale : undefined}
          onLogoScaleChange={templateMode === "overlay_logo" ? handleOverlayScaleChange : undefined}
        />

        {templateMode === "overlay_logo" ? (
          <div className="flex flex-wrap gap-3">
            <Button
              variant={activeLayer === "photo" ? "primary" : "secondary"}
              onClick={() => setActiveLayer("photo")}
            >
              Editar foto
            </Button>
            <Button
              variant={activeLayer === "overlay" ? "primary" : "secondary"}
              onClick={() => setActiveLayer("overlay")}
            >
              Editar logo
            </Button>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-4 rounded-[24px] border border-stone-200 bg-stone-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">Controles por botao</div>
              <div className="text-xs text-stone-500">
                {templateMode === "overlay_logo" && activeLayer === "overlay"
                  ? "Movendo e aplicando zoom na logo"
                  : "Movendo e aplicando zoom na foto"}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-lg"
              aria-label="Mover para esquerda"
              title="Mover para esquerda"
              onClick={() => handleMove("left")}
            >
              ←
            </Button>
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-lg"
              aria-label="Mover para cima"
              title="Mover para cima"
              onClick={() => handleMove("up")}
            >
              ↑
            </Button>
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-lg"
              aria-label="Mover para baixo"
              title="Mover para baixo"
              onClick={() => handleMove("down")}
            >
              ↓
            </Button>
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-lg"
              aria-label="Mover para direita"
              title="Mover para direita"
              onClick={() => handleMove("right")}
            >
              →
            </Button>
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-xl"
              aria-label="Diminuir zoom"
              title="Diminuir zoom"
              onClick={() => handleZoomStep("out")}
            >
              −
            </Button>
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-xl"
              aria-label="Aumentar zoom"
              title="Aumentar zoom"
              onClick={() => handleZoomStep("in")}
            >
              +
            </Button>
            <Button
              variant="secondary"
              className="min-h-[48px] min-w-[48px] px-0 py-0 text-base"
              aria-label="Centralizar"
              title="Centralizar"
              onClick={resetScene}
            >
              ○
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton onClick={handleDownload} disabled={!photoImage || !frameImage} />
          {canShare ? (
            <Button onClick={() => void handleShare()} disabled={!photoImage || !frameImage}>
              Compartilhar
            </Button>
          ) : null}
          <Button variant="secondary" onClick={resetScene}>
            Resetar posicoes
          </Button>
        </div>

        <div className="text-sm text-stone-600">
          {helperText ??
            (templateMode === "overlay_logo"
              ? "Use mouse ou toque para arrastar. Role o mouse ou use dois dedos para zoom na camada selecionada."
              : "Use mouse ou toque para arrastar a foto. Role o mouse ou use dois dedos para zoom.")}
        </div>

        {actionMessage ? <div className="text-sm text-red-700">{actionMessage}</div> : null}
      </Panel>
    );
  },
);

CanvasEditor.displayName = "CanvasEditor";
