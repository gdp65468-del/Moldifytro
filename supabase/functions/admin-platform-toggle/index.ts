import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const { templateId, isActive } = await request.json();

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("platform_templates")
      .update({ is_active: Boolean(isActive) })
      .eq("id", String(templateId))
      .select("*")
      .single();

    if (error || !data) {
      throw new Error("Nao foi possivel atualizar status da moldura.");
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
