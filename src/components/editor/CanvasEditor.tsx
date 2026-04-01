import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Konva from "konva";
import { Image as KonvaImage, Layer, Rect, Stage, Text as KonvaText } from "react-konva";
import { ZoomControls } from "@/components/editor/ZoomControls";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { loadImage } from "@/lib/image";
import type { OverlayConfig, TemplateMode, TextAlign, TextOverlayConfig } from "@/types/template";

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

interface TextState {
  text: string;
  x: number;
  y: number;
  widthRatio: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
  align: TextAlign;
  shadowEnabled: boolean;
  strokeEnabled: boolean;
}

type ActiveLayer = "photo" | "overlay" | "text";
type EditorDock = "photo" | "text" | "overlay" | "adjust" | "output";

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
  textEditable?: boolean;
  usePlatformPreset?: boolean;
  helperText?: string;
  shareUrl?: string;
  onDownload?: (dataUrl: string) => void;
}

interface StageSize {
  width: number;
  height: number;
}

const TEXT_FONT_OPTIONS = [
  { value: "Playfair Display", label: "Playfair" },
  { value: "Cormorant Garamond", label: "Cormorant" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Oswald", label: "Oswald" },
  { value: "Sora", label: "Sora" },
  { value: "Parisienne", label: "Parisienne" },
] as const;

const TEXT_COLOR_OPTIONS = ["#FFF8F1", "#FFFFFF", "#1F2937", "#B45309", "#9F1239", "#14532D"] as const;

const DEFAULT_TEXT_STATE: TextState = {
  text: "",
  x: 0.15,
  y: 0.14,
  widthRatio: 0.7,
  fontSize: 74,
  fontFamily: TEXT_FONT_OPTIONS[0].value,
  color: TEXT_COLOR_OPTIONS[0],
  rotation: 0,
  align: "center",
  shadowEnabled: true,
  strokeEnabled: false,
};

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
  if (config?.overlay) {
    const preferredWidth = config.overlay.widthRatio * stageSize.width;
    return clampOverlay(
      {
        x: config.overlay.x * stageSize.width,
        y: config.overlay.y * stageSize.height,
        scale: preferredWidth / image.width || config.overlay.scale || 1,
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

function textConfigToState(config?: TextOverlayConfig): TextState {
  if (!config) {
    return { ...DEFAULT_TEXT_STATE };
  }

  return {
    ...DEFAULT_TEXT_STATE,
    ...config,
  };
}

function clampText(
  state: TextState,
  stageSize: StageSize,
): TextState {
  const width = stageSize.width * state.widthRatio;
  const lineCount = Math.max(1, state.text.split("\n").length);
  const approximateHeight = state.fontSize * 1.15 * lineCount + 24;

  return {
    ...state,
    widthRatio: Math.min(0.92, Math.max(0.28, state.widthRatio)),
    fontSize: Math.min(180, Math.max(26, state.fontSize)),
    x: Math.min(stageSize.width - width, Math.max(0, state.x)),
    y: Math.min(stageSize.height - approximateHeight, Math.max(0, state.y)),
    rotation: Math.min(45, Math.max(-45, state.rotation)),
  };
}

export const CanvasEditor = forwardRef<CanvasEditorHandle, CanvasEditorProps>(
  (
    {
      templateMode,
      frameSrc,
      photoSrc,
      initialOverlayConfig,
      overlayEditable = false,
      textEditable = true,
      usePlatformPreset = false,
      helperText,
      shareUrl,
      onDownload,
    },
    ref,
  ) => {
    const stageRef = useRef<Konva.Stage | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const stageSizeRef = useRef<StageSize>({
      width: MAX_PREVIEW_WIDTH,
      height: MAX_PREVIEW_WIDTH * 1.5,
    });
    const pinchDistanceRef = useRef<number | null>(null);
    const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
    const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
    const [photoState, setPhotoState] = useState<PhotoState | null>(null);
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const [textState, setTextState] = useState<TextState>(() => textConfigToState(initialOverlayConfig?.text));
    const [activeLayer, setActiveLayer] = useState<ActiveLayer>(
      templateMode === "overlay_logo" ? "overlay" : "photo",
    );
    const [photoLocked, setPhotoLocked] = useState(false);
    const [overlayLocked, setOverlayLocked] = useState(true);
    const [canShare, setCanShare] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [activeDock, setActiveDock] = useState<EditorDock>(templateMode === "overlay_logo" ? "overlay" : "photo");
    const [showCanvasHints, setShowCanvasHints] = useState(true);
    const [isPinching, setIsPinching] = useState(false);
    const [isPreparingDownload, setIsPreparingDownload] = useState(false);
    const [downloadNoticeOpen, setDownloadNoticeOpen] = useState(false);
    const [stageSize, setStageSize] = useState<StageSize>({
      width: MAX_PREVIEW_WIDTH,
      height: MAX_PREVIEW_WIDTH * 1.5,
    });
    const textFieldId = useId();

    useEffect(() => {
      stageSizeRef.current = stageSize;
    }, [stageSize]);

    useEffect(() => {
      setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }, []);

    useEffect(() => {
      setPhotoLocked(false);
      setOverlayLocked(true);
      setActiveDock(templateMode === "overlay_logo" ? "overlay" : "photo");
      setActiveLayer("photo");
      setShowCanvasHints(true);
    }, [templateMode]);

    useEffect(() => {
      setTextState(clampText(textConfigToState(initialOverlayConfig?.text), stageSizeRef.current));
    }, [initialOverlayConfig?.text]);

    useEffect(() => {
      setTextState((current) => clampText(current, stageSize));
    }, [stageSize]);

    useEffect(() => {
      if (typeof document === "undefined" || !textState.fontFamily || !("fonts" in document)) {
        return;
      }

      void document.fonts.load(`600 ${Math.max(42, textState.fontSize)}px "${textState.fontFamily}"`).then(() => {
        stageRef.current?.batchDraw();
      });
    }, [textState.fontFamily, textState.fontSize]);

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
        const overlay =
          templateMode === "overlay_logo" && frameImage && overlayState
            ? {
                x: overlayState.x / stageSize.width,
                y: overlayState.y / stageSize.height,
                scale: overlayState.scale,
                widthRatio: (frameImage.width * overlayState.scale) / stageSize.width,
              }
            : undefined;

        const normalizedText = textState.text.trim()
          ? {
              text: textState.text,
              x: textState.x / stageSize.width,
              y: textState.y / stageSize.height,
              widthRatio: textState.widthRatio,
              fontSize: textState.fontSize,
              fontFamily: textState.fontFamily,
              color: textState.color,
              rotation: textState.rotation,
              align: textState.align,
              shadowEnabled: textState.shadowEnabled,
              strokeEnabled: textState.strokeEnabled,
            }
          : undefined;

        if (!overlay && !normalizedText && !initialOverlayConfig?.publicTextEditable) {
          return undefined;
        }

        return {
          overlay,
          text: normalizedText,
          publicTextEditable: initialOverlayConfig?.publicTextEditable ?? false,
        };
      },
    }));

    const actualPhotoScale = photoState ? photoState.baseScale * photoState.zoom : 1;
    const textWidth = stageSize.width * textState.widthRatio;
    const hasText = Boolean(textState.text.trim());
    const isOverlayMode = templateMode === "overlay_logo";
    const isPhotoActive = activeLayer === "photo";
    const isOverlayActive = isOverlayMode && activeLayer === "overlay";
    const isTextActive = activeLayer === "text";
    const activeLayerLocked = isOverlayActive ? overlayLocked : false;
    const topLayerLabel = isOverlayMode ? "Camada superior" : "Moldura";
    const interactionHint = isTextActive
      ? "Arraste o texto para posicionar. Ajuste fonte, cor e tamanho logo abaixo."
      : isOverlayMode
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

    function handleTextDragPosition(x: number, y: number) {
      if (!textEditable) {
        return;
      }

      setShowCanvasHints(false);
      setTextState((current) =>
        clampText(
          {
            ...current,
            x,
            y,
          },
          stageSize,
        ),
      );
    }

    function updateTextState(patch: Partial<TextState>) {
      setTextState((current) => clampText({ ...current, ...patch }, stageSize));
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
      setIsPinching(false);
    }

    function handleStageTouchStart(event: Konva.KonvaEventObject<TouchEvent>) {
      setShowCanvasHints(false);
      const touches = event.evt.touches;
      if (touches.length !== 2 || activeLayerLocked) {
        return;
      }

      setIsPinching(true);
      pinchDistanceRef.current = getTouchDistance(touches);
      event.target.stopDrag?.();
    }

    function dismissCanvasHints() {
      setShowCanvasHints(false);
    }

    function handleStageTouchMove(event: Konva.KonvaEventObject<TouchEvent>) {
      setShowCanvasHints(false);
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
        return;
      }

      const ratio = distance / pinchDistanceRef.current;

      if (isOverlayActive && frameImage && overlayState && !overlayLocked) {
        const nextScale = Math.min(2.5, Math.max(0.2, overlayState.scale * ratio));
        setOverlayState((current) =>
          current ? zoomOverlayAtPoint(current, frameImage, stageSize, center, nextScale) : current,
        );
        pinchDistanceRef.current = distance;
        return;
      }

      if (photoImage && photoState && !photoLocked) {
        const nextZoom = Math.min(3, Math.max(0.5, photoState.zoom * ratio));
        setPhotoState((current) =>
          current ? zoomPhotoAtPoint(current, photoImage, photoTarget, center, nextZoom) : current,
        );
        pinchDistanceRef.current = distance;
      }
    }

    function handleStageTouchEnd(event: Konva.KonvaEventObject<TouchEvent>) {
      if (event.evt.touches.length < 2) {
        resetPinchTracking();
      }
    }

    function handleStageWheel(event: Konva.KonvaEventObject<WheelEvent>) {
      setShowCanvasHints(false);
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
      setActiveDock(templateMode === "overlay_logo" ? "overlay" : "photo");
      setActiveLayer("photo");
      setShowCanvasHints(true);

      if (photoImage) {
        setPhotoState(clampPhoto(fitImage(photoImage, photoTarget), photoImage, photoTarget));
      }

      if (frameImage && templateMode === "overlay_logo") {
        setOverlayState(overlayConfigToState(frameImage, stageSize, initialOverlayConfig));
      }

      setTextState(clampText(textConfigToState(initialOverlayConfig?.text), stageSize));
    }

    function handlePhotoDragPosition(x: number, y: number) {
      if (!photoImage || !photoState || photoLocked) {
        return;
      }

      setShowCanvasHints(false);
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

      setShowCanvasHints(false);
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
      setActiveDock("overlay");
      setShowCanvasHints(false);
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

    async function handleDownload() {
      if (isPreparingDownload) {
        return;
      }

      setActionMessage(null);
      setDownloadNoticeOpen(true);
      setIsPreparingDownload(true);

      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const dataUrl = getExportDataUrl();
      if (!dataUrl) {
        setDownloadNoticeOpen(false);
        setIsPreparingDownload(false);
        setActionMessage("Nao foi possivel gerar a imagem final. Tente usar outra moldura ou recarregar a pagina.");
        return;
      }

      try {
        downloadFromDataUrl(dataUrl);
        onDownload?.(dataUrl);
        setActiveDock("photo");
        window.setTimeout(() => {
          setDownloadNoticeOpen(false);
          setIsPreparingDownload(false);
        }, 1200);
      } catch {
        setDownloadNoticeOpen(false);
        setIsPreparingDownload(false);
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
        const shareText = shareUrl
          ? "Imagem criada no Moldify. Crie a sua tambem e use este link para montar a proxima."
          : "Imagem criada no Moldify. Crie a sua tambem.";
        const sharePayload = shareUrl
          ? { title: "Moldify", text: shareText, url: shareUrl }
          : { title: "Moldify", text: shareText };

        if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          await navigator.share({
            ...sharePayload,
            files: [file],
          });
        } else {
          await navigator.share(sharePayload);
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
                <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">
                  {hasText ? (textEditable ? "Texto ativo" : "Texto fixo") : textEditable ? "Texto opcional" : "Sem texto"}
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
          </div>

          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white p-2 sm:p-3">
            <div
              ref={containerRef}
              className="editor-stage relative mx-auto w-full max-w-[420px] overflow-hidden"
            >
              {showCanvasHints ? (
                <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-3">
                  <div className="rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600 shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur">
                    {isTextActive ? "Arraste o texto" : isOverlayMode ? "Arraste a foto" : "Toque e arraste"}
                  </div>
                  <div className="rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[11px] font-bold text-stone-700 shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur">
                    {isTextActive ? "Texto em foco" : isOverlayMode && overlayLocked ? "Moldura fixa" : "Canvas livre"}
                  </div>
                </div>
              ) : null}

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

              {showCanvasHints ? (
                <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-4.75rem)] rounded-2xl border border-white/80 bg-white/84 px-3 py-2 text-[11px] font-semibold leading-5 text-stone-700 shadow-[0_14px_35px_rgba(36,31,21,0.12)] backdrop-blur">
                  {helperText ??
                    (isOverlayMode
                      ? "A foto ja esta livre. Destrave a moldura so quando quiser alinhar a camada de cima."
                      : "Arraste a foto e use o zoom para acertar o enquadramento.")}
                </div>
              ) : null}
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
                touchAction: "none",
              }}
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={handleStageTouchEnd}
              onTouchCancel={handleStageTouchEnd}
              onWheel={handleStageWheel}
              onMouseDown={dismissCanvasHints}
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
                    draggable={!photoLocked && (!isOverlayMode || isPhotoActive) && !isPinching}
                    listening={!isOverlayMode || isPhotoActive}
                    onMouseDown={() => {
                      setActiveLayer("photo");
                      dismissCanvasHints();
                    }}
                    onTouchStart={() => {
                      setActiveLayer("photo");
                      dismissCanvasHints();
                    }}
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
                    draggable={overlayEditable && !overlayLocked && isOverlayActive && !isPinching}
                    listening={isOverlayActive}
                    onMouseDown={() => {
                      setActiveLayer("overlay");
                      dismissCanvasHints();
                    }}
                    onTouchStart={() => {
                      setActiveLayer("overlay");
                      dismissCanvasHints();
                    }}
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

                {hasText ? (
                  <KonvaText
                    text={textState.text}
                    x={textState.x}
                    y={textState.y}
                    width={textWidth}
                    fontSize={textState.fontSize}
                    fontFamily={textState.fontFamily}
                    fill={textState.color}
                    align={textState.align}
                    rotation={textState.rotation}
                    lineHeight={1.05}
                    fontStyle={textState.strokeEnabled ? "bold" : "normal"}
                    stroke={textState.strokeEnabled ? "rgba(255,248,241,0.94)" : undefined}
                    strokeWidth={textState.strokeEnabled ? Math.max(2, textState.fontSize * 0.06) : 0}
                    shadowColor={textState.shadowEnabled ? "rgba(22,19,18,0.4)" : undefined}
                    shadowBlur={textState.shadowEnabled ? 12 : 0}
                    shadowOffsetY={textState.shadowEnabled ? 3 : 0}
                    draggable={textEditable && !isPinching}
                    listening={textEditable}
                    onMouseDown={() => {
                      setActiveLayer("text");
                      dismissCanvasHints();
                    }}
                    onTouchStart={() => {
                      setActiveLayer("text");
                      dismissCanvasHints();
                    }}
                    onDragMove={(event) => handleTextDragPosition(event.target.x(), event.target.y())}
                    onDragEnd={(event) => handleTextDragPosition(event.target.x(), event.target.y())}
                  />
                ) : null}
              </Layer>
            </Stage>
          </div>
        </div>
        </div>

        <div className="space-y-3">
          <div className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-full gap-2 rounded-[24px] border border-stone-200 bg-[#f6efe2]/92 p-2 shadow-[0_18px_36px_-28px_rgba(22,19,18,0.18)]">
              <button
                type="button"
                className={`inline-flex min-w-[78px] flex-col items-center justify-center rounded-[18px] px-3 py-2 text-[11px] font-bold transition ${
                  activeDock === "photo"
                    ? "bg-ember text-white shadow-lg shadow-orange-500/20"
                    : "bg-white text-stone-700"
                }`}
                onClick={() => setActiveDock("photo")}
              >
                <span className="text-base leading-none">📷</span>
                <span className="mt-1">Foto</span>
              </button>

              {textEditable ? (
                <button
                  type="button"
                  className={`inline-flex min-w-[78px] flex-col items-center justify-center rounded-[18px] px-3 py-2 text-[11px] font-bold transition ${
                    activeDock === "text"
                      ? "bg-ember text-white shadow-lg shadow-orange-500/20"
                      : "bg-white text-stone-700"
                  }`}
                  onClick={() => {
                    setActiveLayer("text");
                    setActiveDock("text");
                  }}
                >
                  <span className="text-base leading-none">T</span>
                  <span className="mt-1">Texto</span>
                </button>
              ) : null}

              {isOverlayMode ? (
                <button
                  type="button"
                  className={`inline-flex min-w-[78px] flex-col items-center justify-center rounded-[18px] px-3 py-2 text-[11px] font-bold transition ${
                    activeDock === "overlay"
                      ? "bg-ember text-white shadow-lg shadow-orange-500/20"
                      : "bg-white text-stone-700"
                  }`}
                  onClick={() => {
                    setActiveLayer("overlay");
                    setActiveDock("overlay");
                  }}
                >
                  <span className="text-base leading-none">▣</span>
                  <span className="mt-1">Moldura</span>
                </button>
              ) : null}

              <button
                type="button"
                className={`inline-flex min-w-[78px] flex-col items-center justify-center rounded-[18px] px-3 py-2 text-[11px] font-bold transition ${
                  activeDock === "adjust"
                    ? "bg-ember text-white shadow-lg shadow-orange-500/20"
                    : "bg-white text-stone-700"
                }`}
                onClick={() => setActiveDock("adjust")}
              >
                <span className="text-base leading-none">✦</span>
                <span className="mt-1">Ajustes</span>
              </button>

              <button
                type="button"
                className={`inline-flex min-w-[78px] flex-col items-center justify-center rounded-[18px] px-3 py-2 text-[11px] font-bold transition ${
                  activeDock === "output"
                    ? "bg-ember text-white shadow-lg shadow-orange-500/20"
                    : "bg-white text-stone-700"
                }`}
                onClick={() => setActiveDock("output")}
              >
                <span className="text-base leading-none">↓</span>
                <span className="mt-1">Saida</span>
              </button>
            </div>
          </div>

          {activeDock === "photo" ? (
            <ZoomControls
              photoZoom={photoState?.zoom ?? 1}
              onPhotoZoomChange={handlePhotoZoomChange}
              photoLocked={photoLocked}
            />
          ) : null}

          {activeDock === "text" && textEditable ? (
            <div className="grid gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Texto</div>
                <div className="mt-1 text-xs leading-5 text-stone-600">
                  Escreva, arraste e ajuste. O texto entra na imagem final.
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Conteudo</span>
                <textarea
                  id={textFieldId}
                  rows={2}
                  value={textState.text}
                  onFocus={() => setActiveLayer("text")}
                  onChange={(event) => {
                    setActiveLayer("text");
                    updateTextState({ text: event.target.value });
                  }}
                  placeholder="Digite seu texto aqui"
                  className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-ember"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Fonte</span>
                  <select
                    value={textState.fontFamily}
                    onChange={(event) => {
                      setActiveLayer("text");
                      updateTextState({ fontFamily: event.target.value });
                    }}
                    className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-800 outline-none transition focus:border-ember"
                  >
                    {TEXT_FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                    Alinhamento
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["left", "center", "right"] as const).map((align) => (
                      <Button
                        key={align}
                        type="button"
                        variant={textState.align === align ? "primary" : "secondary"}
                        className="px-4 py-2 text-xs"
                        onClick={() => {
                          setActiveLayer("text");
                          updateTextState({ align });
                        }}
                      >
                        {align === "left" ? "Esquerda" : align === "center" ? "Centro" : "Direita"}
                      </Button>
                    ))}
                  </div>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-stone-700">
                  <span className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">
                    <span>Tamanho</span>
                    <span>{Math.round(textState.fontSize)} px</span>
                  </span>
                  <input
                    className="mt-2 w-full accent-orange-600"
                    type="range"
                    min="26"
                    max="180"
                    step="1"
                    value={textState.fontSize}
                    onChange={(event) => {
                      setActiveLayer("text");
                      updateTextState({ fontSize: Number(event.target.value) });
                    }}
                  />
                </label>

                <label className="block text-sm font-medium text-stone-700">
                  <span className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">
                    <span>Rotacao</span>
                    <span>{Math.round(textState.rotation)}°</span>
                  </span>
                  <input
                    className="mt-2 w-full accent-emerald-700"
                    type="range"
                    min="-45"
                    max="45"
                    step="1"
                    value={textState.rotation}
                    onChange={(event) => {
                      setActiveLayer("text");
                      updateTextState({ rotation: Number(event.target.value) });
                    }}
                  />
                </label>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Cor</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TEXT_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Selecionar cor ${color}`}
                      title={color}
                      onClick={() => {
                        setActiveLayer("text");
                        updateTextState({ color });
                      }}
                      className={`h-10 w-10 rounded-full border-2 transition ${
                        textState.color === color ? "border-ink scale-105" : "border-white"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={textState.shadowEnabled ? "primary" : "secondary"}
                  className="px-4 py-2 text-xs"
                  onClick={() => {
                    setActiveLayer("text");
                    updateTextState({ shadowEnabled: !textState.shadowEnabled });
                  }}
                >
                  {textState.shadowEnabled ? "Sombra ligada" : "Ligar sombra"}
                </Button>
                <Button
                  type="button"
                  variant={textState.strokeEnabled ? "primary" : "secondary"}
                  className="px-4 py-2 text-xs"
                  onClick={() => {
                    setActiveLayer("text");
                    updateTextState({ strokeEnabled: !textState.strokeEnabled });
                  }}
                >
                  {textState.strokeEnabled ? "Contorno ligado" : "Ligar contorno"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {activeDock === "overlay" && isOverlayMode ? (
          <div className="grid gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                  Moldura
                </div>
                <div className="mt-1 text-xs leading-5 text-stone-600">
                  Destrave a moldura so quando quiser alinhar a camada de cima.
                </div>
              </div>
              <Button type="button" variant={overlayLocked ? "secondary" : "primary"} onClick={toggleOverlayLock}>
                {overlayLocked ? "Destravar moldura" : "Travar moldura"}
              </Button>
            </div>

            <ZoomControls
              photoZoom={photoState?.zoom ?? 1}
              onPhotoZoomChange={handlePhotoZoomChange}
              photoLocked
              logoScale={overlayState?.scale}
              onLogoScaleChange={handleOverlayScaleChange}
              logoLocked={overlayLocked}
            />
          </div>
        ) : null}

        {activeDock === "adjust" ? (
          <div className="grid min-w-0 gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                Ajustes finos
              </div>
              <div className="mt-1 text-xs leading-5 text-stone-600">
                {activeLayerLocked
                  ? "Destrave a camada ativa para usar os botoes."
                  : isOverlayActive
                    ? "Pequenos ajustes na moldura."
                    : isTextActive
                      ? "Se precisar, volte ao texto e ajuste pelo painel."
                      : "Pequenos ajustes na foto."}
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-center gap-2">
              <Button
                variant="secondary"
                className="min-h-[44px] min-w-[44px] px-0 py-0 text-lg"
                aria-label="Mover para esquerda"
                title="Mover para esquerda"
                disabled={activeLayerLocked || isTextActive}
                onClick={() => handleMove("left")}
              >
                ←
              </Button>
              <Button
                variant="secondary"
                className="min-h-[44px] min-w-[44px] px-0 py-0 text-lg"
                aria-label="Mover para cima"
                title="Mover para cima"
                disabled={activeLayerLocked || isTextActive}
                onClick={() => handleMove("up")}
              >
                ↑
              </Button>
              <Button
                variant="secondary"
                className="min-h-[44px] min-w-[44px] px-0 py-0 text-lg"
                aria-label="Mover para baixo"
                title="Mover para baixo"
                disabled={activeLayerLocked || isTextActive}
                onClick={() => handleMove("down")}
              >
                ↓
              </Button>
              <Button
                variant="secondary"
                className="min-h-[44px] min-w-[44px] px-0 py-0 text-lg"
                aria-label="Mover para direita"
                title="Mover para direita"
                disabled={activeLayerLocked || isTextActive}
                onClick={() => handleMove("right")}
              >
                →
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" className="text-xs sm:text-sm" onClick={resetScene}>
                Comecar de novo
              </Button>
            </div>
          </div>
        ) : null}

        {activeDock === "output" ? (
          <div className="grid gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
                Finalizar
              </div>
              <div className="mt-1 text-xs leading-5 text-stone-600">
                Baixe a imagem final ou compartilhe direto daqui.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" className="text-xs sm:text-sm" onClick={() => void handleDownload()} disabled={isPreparingDownload}>
                {isPreparingDownload ? "Preparando..." : "Baixar imagem"}
              </Button>
              {canShare ? (
                <Button type="button" variant="secondary" className="text-xs sm:text-sm" onClick={() => void handleShare()}>
                  Compartilhar
                </Button>
              ) : null}
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

        {downloadNoticeOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 py-8 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[28px] border border-white/80 bg-[linear-gradient(160deg,rgba(255,249,241,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_36px_110px_-48px_rgba(17,24,39,0.55)]">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f7ebdd] text-sm font-semibold uppercase tracking-[0.18em] text-ember">
                  OK
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold text-ink">Preparando download</h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    Em breve sua imagem vai ser baixada. Aguarde um instante para nao tocar varias vezes no botao.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>
    );
  },
);

CanvasEditor.displayName = "CanvasEditor";
