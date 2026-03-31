interface ZoomControlsProps {
  photoZoom: number;
  onPhotoZoomChange: (value: number) => void;
  logoScale?: number;
  onLogoScaleChange?: (value: number) => void;
}

export function ZoomControls({
  photoZoom,
  onPhotoZoomChange,
  logoScale,
  onLogoScaleChange,
}: ZoomControlsProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">
        Zoom da foto
        <input
          className="mt-2 w-full accent-orange-600"
          type="range"
          min="0.5"
          max="3"
          step="0.01"
          value={photoZoom}
          onChange={(event) => onPhotoZoomChange(Number(event.target.value))}
        />
      </label>

      {typeof logoScale === "number" && onLogoScaleChange ? (
        <label className="block text-sm font-medium text-stone-700">
          Tamanho da logo
          <input
            className="mt-2 w-full accent-emerald-700"
            type="range"
            min="0.2"
            max="2.5"
            step="0.01"
            value={logoScale}
            onChange={(event) => onLogoScaleChange(Number(event.target.value))}
          />
        </label>
      ) : null}
    </div>
  );
}
