import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const admin = getAdminClient();

    const [usersRes, templatesRes] = await Promise.all([
      admin.from("users").select("*"),
      admin.from("user_templates").select("*"),
    ]);

    const users = usersRes.data ?? [];
    const templates = templatesRes.data ?? [];

    const rows = users
      .map((item) => {
        const ownedTemplates = templates.filter((template) => template.owner_id === item.id);
        return {
          id: item.id,
          name: item.name,
          email: item.email,
          templatesCount: ownedTemplates.length,
          publishedTemplatesCount: ownedTemplates.filter((template) => template.status === "published").length,
          totalDownloads: ownedTemplates.reduce((sum, template) => sum + Number(template.downloads_count ?? 0), 0),
          createdAt: String(item.created_at ?? ""),
        };
      })
      .sort((a, b) => b.totalDownloads - a.totalDownloads);

    return json(rows);
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});

