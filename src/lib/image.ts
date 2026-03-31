export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToFile(blob: Blob, fileName: string) {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

function replaceFileExtension(fileName: string, extension: string) {
  return fileName.replace(/\.[^.]+$/, "") + extension;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Nao foi possivel gerar o blob da imagem."));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  mimeType: "image/webp" | "image/jpeg" | "image/png";
  quality?: number;
  skipBelowBytes?: number;
}

export async function compressImageFile(file: File, options: CompressionOptions) {
  if (options.skipBelowBytes && file.size <= options.skipBelowBytes) {
    return file;
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const scale = Math.min(1, options.maxWidth / image.width, options.maxHeight / image.height);
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Nao foi possivel preparar a compressao da imagem.");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas, options.mimeType, options.quality);
    const extension =
      options.mimeType === "image/jpeg" ? ".jpg" : options.mimeType === "image/png" ? ".png" : ".webp";
    const compressedFile = blobToFile(blob, replaceFileExtension(file.name, extension));

    if (compressedFile.size >= file.size * 0.98 && scale === 1 && file.type === compressedFile.type) {
      return file;
    }

    return compressedFile.size < file.size ? compressedFile : file;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
