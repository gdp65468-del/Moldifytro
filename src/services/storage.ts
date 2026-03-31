import { supabase, assertSupabaseEnabled } from "@/services/supabase";

export interface UploadedAsset {
  path: string;
  url: string;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
}

function getExtensionFromMimeType(mimeType: string) {
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  return "";
}

function buildStorageFileName(file: File) {
  const sanitized = sanitizeFileName(file.name);
  const extension = getExtensionFromMimeType(file.type);
  if (!extension) {
    return sanitized;
  }

  return sanitized.replace(/\.[^.]+$/, "") + extension;
}

async function getSignedUrl(bucket: string, path: string) {
  const expiresInSeconds = 60 * 60 * 24 * 365 * 5;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error || !data?.signedUrl) {
    throw new Error("Nao foi possivel gerar URL assinada do arquivo.");
  }

  return data.signedUrl;
}

export async function uploadAsset(
  file: File,
  ownerId: string,
  folder: "frames" | "logos" | "photos",
): Promise<UploadedAsset> {
  assertSupabaseEnabled();

  const path = `${ownerId}/${folder}/${crypto.randomUUID()}-${buildStorageFileName(file)}`;
  const { error } = await supabase.storage.from("users").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error("Nao foi possivel enviar arquivo para o storage.");
  }

  const url = await getSignedUrl("users", path);
  return { path, url };
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error("Data URL invalida.");
  }

  const mimeType = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

export async function uploadDataUrlAsset(
  dataUrl: string,
  ownerId: string,
  folder: "thumbnails",
  fileName: string,
): Promise<UploadedAsset> {
  assertSupabaseEnabled();

  const path = `${ownerId}/${folder}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await supabase.storage.from("users").upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });

  if (error) {
    throw new Error("Nao foi possivel enviar preview para o storage.");
  }

  const url = await getSignedUrl("users", path);
  return { path, url };
}

