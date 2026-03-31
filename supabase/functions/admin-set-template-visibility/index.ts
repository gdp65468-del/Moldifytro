import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const { templateId, isPublic } = await request.json();

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("user_templates")
      .update({
        is_public: isPublic === true,
        status: isPublic === true ? "published" : "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(templateId))
      .select("*")
      .single();

    if (error || !data) {
      throw new Error("Nao foi possivel atualizar visibilidade do template.");
    }

    return json({
      id: data.id,
      ownerId: data.owner_id,
      title: data.title,
      templateMode: data.template_mode,
      frameUrl: data.frame_url,
      frameStoragePath: data.frame_storage_path ?? undefined,
      thumbnailUrl: data.thumbnail_url ?? undefined,
      status: data.status,
      isPublic: data.is_public,
      publishUnlocked: data.publish_unlocked,
      shareSlug: data.share_slug ?? undefined,
      usesCount: data.uses_count,
      viewsCount: data.views_count,
      downloadsCount: data.downloads_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      publishedAt: data.published_at,
      pricePaid: data.price_paid,
      source: data.source,
      platformTemplateId: data.platform_template_id ?? undefined,
      overlayConfig: data.overlay_config ?? undefined,
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
