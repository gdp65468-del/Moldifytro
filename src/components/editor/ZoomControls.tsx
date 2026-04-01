interface ZoomControlsProps {
  photoZoom: number;
  onPhotoZoomChange: (value: number) => void;
  photoLocked?: boolean;
  logoScale?: number;
  onLogoScaleChange?: (value: number) => void;
  logoLocked?: boolean;
}

export function ZoomControls({
  photoZoom,
  onPhotoZoomChange,
  photoLocked = false,
  logoScale,
  onLogoScaleChange,
  logoLocked = false,
}: ZoomControlsProps) {
  return (
    <div className="grid gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4">
      <label className="block text-sm font-medium text-stone-700">
        <span className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">
          <span>Aproximar foto</span>
          <span>{Math.round(photoZoom * 100)}%</span>
        </span>
        <input
          className="mt-2 w-full accent-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          type="range"
          min="0.5"
          max="3"
          step="0.01"
          value={photoZoom}
          disabled={photoLocked}
          onChange={(event) => onPhotoZoomChange(Number(event.target.value))}
        />
        <span className="mt-1.5 block text-[11px] leading-5 text-stone-500">
          {photoLocked
            ? "Destrave a foto para mover ou ajustar o zoom."
            : "Use o controle para aproximar ou afastar a foto."}
        </span>
      </label>

      {typeof logoScale === "number" && onLogoScaleChange ? (
        <label className="block text-sm font-medium text-stone-700">
          <span className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-600">
            <span>Tamanho da moldura</span>
            <span>{Math.round(logoScale * 100)}%</span>
          </span>
          <input
            className="mt-2 w-full accent-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="range"
            min="0.2"
            max="2.5"
            step="0.01"
            value={logoScale}
            disabled={logoLocked}
            onChange={(event) => onLogoScaleChange(Number(event.target.value))}
          />
          <span className="mt-1.5 block text-[11px] leading-5 text-stone-500">
            {logoLocked
              ? "Destrave a moldura para mover ou redimensionar."
              : "Ajuste o tamanho da moldura do jeito que fizer mais sentido na arte."}
          </span>
        </label>
      ) : null}
    </div>
  );
}
