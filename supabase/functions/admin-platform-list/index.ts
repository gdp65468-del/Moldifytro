import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);

    const admin = getAdminClient();
    const [templatesRes, linkedTemplatesRes] = await Promise.all([
      admin.from("platform_templates").select("*").order("title", { ascending: true }),
      admin.from("user_templates").select("platform_template_id, views_count, downloads_count"),
    ]);

    if (templatesRes.error) {
      throw new Error("Nao foi possivel listar molduras da plataforma.");
    }

    const linkedTemplateRows = linkedTemplatesRes.data ?? [];
    const countsByPlatformId = linkedTemplateRows.reduce<Record<string, { views: number; downloads: number }>>(
      (accumulator, item) => {
        const platformTemplateId = String(item.platform_template_id ?? "");
        if (!platformTemplateId) {
          return accumulator;
        }

        const current = accumulator[platformTemplateId] ?? { views: 0, downloads: 0 };
        current.views += Number(item.views_count ?? 0);
        current.downloads += Number(item.downloads_count ?? 0);
        accumulator[platformTemplateId] = current;
        return accumulator;
      },
      {},
    );

    const rows = (templatesRes.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      imageUrl: item.image_url,
      thumbnailUrl: item.thumbnail_url,
      templateMode: item.template_mode,
      isActive: item.is_active,
      viewsCount: countsByPlatformId[item.id]?.views ?? 0,
      downloadsCount: countsByPlatformId[item.id]?.downloads ?? 0,
      createdAt: item.created_at,
    }));

    return json(rows);
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
