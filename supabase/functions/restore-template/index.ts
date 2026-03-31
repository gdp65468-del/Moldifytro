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

    if (!template.deleted_at) {
      return json({ ok: true });
    }

    const admin = getAdminClient();
    const { error } = await admin
      .from("user_templates")
      .update({
        deleted_at: null,
        purge_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(templateId));

    if (error) {
      throw new Error("Nao foi possivel recuperar template.");
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
