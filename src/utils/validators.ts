export const MAX_PHOTO_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_FRAME_UPLOAD_BYTES = 12 * 1024 * 1024;

export function isImageFile(file: File | null | undefined) {
  return Boolean(file && file.type.startsWith("image/"));
}

export function isFrameFile(file: File | null | undefined) {
  return Boolean(file && ["image/png", "image/webp"].includes(file.type));
}

export function isAllowedPhotoSize(file: File | null | undefined) {
  return Boolean(file && file.size <= MAX_PHOTO_UPLOAD_BYTES);
}

export function isAllowedFrameSize(file: File | null | undefined) {
  return Boolean(file && file.size <= MAX_FRAME_UPLOAD_BYTES);
}
