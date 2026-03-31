import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|webp|jpeg));base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem invalido. Use PNG, WebP ou JPEG.");
  }

  const mimeType = match[1];
  const base64Body = match[2];
  const binary = atob(base64Body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return { mimeType, bytes };
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return "webp";
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const { title, category, imageDataUrl } = await request.json();

    if (!title || !category || !imageDataUrl) {
      throw new Error("title, category e imageDataUrl sao obrigatorios.");
    }

    const admin = getAdminClient();
    const { mimeType, bytes } = parseDataUrl(String(imageDataUrl));
    const extension = extensionFromMimeType(mimeType);
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const storagePath = `templates/${fileName}`;

    const { error: uploadError } = await admin.storage
      .from("platform")
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Falha no upload para Storage: ${uploadError.message}`);
    }

    const { data: publicData } = admin.storage.from("platform").getPublicUrl(storagePath);
    const publicUrl = publicData.publicUrl;
    const now = new Date().toISOString();

    const payload = {
      title: String(title),
      category: String(category),
      image_url: publicUrl,
      thumbnail_url: publicUrl,
      template_mode: "full_frame",
      is_active: true,
      image_storage_path: storagePath,
      image_provider: "supabase_storage",
      cloudinary_public_id: null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await admin.from("platform_templates").insert(payload).select("*").single();

    if (error || !data) {
      throw new Error("Nao foi possivel criar moldura da plataforma.");
    }

    return json({
      id: data.id,
      title: data.title,
      category: data.category,
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url,
      templateMode: data.template_mode,
      isActive: data.is_active,
      viewsCount: 0,
      downloadsCount: 0,
      createdAt: data.created_at,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
