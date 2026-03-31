import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json, requireUser } from "../_shared/supabase.ts";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    const { templateId } = await request.json();
    const admin = getAdminClient();

    const { data: template, error: templateError } = await admin
      .from("user_templates")
      .select("*")
      .eq("id", String(templateId))
      .maybeSingle();

    if (templateError || !template) {
      throw new Error("Template nao encontrado.");
    }

    if (template.owner_id !== user.id) {
      throw new Error("Template pertence a outro usuario.");
    }

    if (template.deleted_at) {
      throw new Error("Template esta na lixeira. Recupere antes de publicar.");
    }

    const { data: payment } = await admin
      .from("payments")
      .select("id")
      .eq("template_id", String(templateId))
      .eq("user_id", user.id)
      .eq("status", "approved")
      .limit(1)
      .maybeSingle();

    if (!payment) {
      throw new Error("Pagamento ainda nao aprovado.");
    }

    const title = String(template.title ?? "template");
    let slug = slugify(title);
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const { data: existing } = await admin
        .from("user_templates")
        .select("id")
        .eq("share_slug", slug)
        .maybeSingle();
      if (!existing || existing.id === template.id) break;
      slug = `${slugify(title)}-${crypto.randomUUID().slice(0, 4)}`;
    }

    const patch = {
      status: "published",
      is_public: true,
      publish_unlocked: true,
      share_slug: slug,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      price_paid: 5.9,
    };

    const { data: published, error: publishError } = await admin
      .from("user_templates")
      .update(patch)
      .eq("id", template.id)
      .select("*")
      .single();

    if (publishError || !published) {
      throw new Error("Nao foi possivel publicar template.");
    }

    return json({
      template: {
        id: published.id,
        ownerId: published.owner_id,
        title: published.title,
        templateMode: published.template_mode,
        frameUrl: published.frame_url,
        frameStoragePath: published.frame_storage_path ?? undefined,
        thumbnailUrl: published.thumbnail_url ?? undefined,
        status: published.status,
        isPublic: published.is_public,
        publishUnlocked: published.publish_unlocked,
        shareSlug: published.share_slug ?? undefined,
        usesCount: published.uses_count,
        viewsCount: published.views_count,
        downloadsCount: published.downloads_count,
        createdAt: published.created_at,
        updatedAt: published.updated_at,
        publishedAt: published.published_at,
        pricePaid: Number(published.price_paid ?? 0),
        source: published.source,
        platformTemplateId: published.platform_template_id ?? undefined,
        overlayConfig: published.overlay_config ?? undefined,
      },
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
