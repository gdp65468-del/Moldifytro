import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json, requireUser } from "../_shared/supabase.ts";
import { getManageableTemplate } from "../_shared/trash.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    const { templateId } = await request.json();
    const template = await getManageableTemplate(String(templateId), user.id);

    if (template.deleted_at) {
      return json({ ok: true });
    }

    const admin = getAdminClient();
    const now = new Date();
    const purgeAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await admin
      .from("user_templates")
      .update({
        deleted_at: now.toISOString(),
        purge_at: purgeAt,
        is_public: false,
        share_slug: null,
        status: "draft",
        published_at: null,
        updated_at: now.toISOString(),
      })
      .eq("id", String(templateId));

    if (error) {
      throw new Error("Nao foi possivel mover template para a lixeira.");
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
