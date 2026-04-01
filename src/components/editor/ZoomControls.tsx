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
    <div className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">
        Aproximar foto
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
        <span className="mt-2 block text-xs text-stone-500">
          {photoLocked
            ? "Destrave a foto para mover ou ajustar o zoom."
            : "Use o controle para aproximar ou afastar a foto."}
        </span>
      </label>

      {typeof logoScale === "number" && onLogoScaleChange ? (
        <label className="block text-sm font-medium text-stone-700">
          Tamanho da logo
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
          <span className="mt-2 block text-xs text-stone-500">
            {logoLocked
              ? "Destrave a logo para mover ou redimensionar."
              : "Ajuste o tamanho da logo do jeito que fizer mais sentido na arte."}
          </span>
        </label>
      ) : null}
    </div>
  );
}
