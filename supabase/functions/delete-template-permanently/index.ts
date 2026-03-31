import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json, requireUser } from "../_shared/supabase.ts";
import { getManageableTemplate, removeTemplateStorage } from "../_shared/trash.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    const { templateId } = await request.json();
    const template = await getManageableTemplate(String(templateId), user.id);

    if (!template.deleted_at) {
      throw new Error("Mova o template para a lixeira antes de excluir definitivamente.");
    }

    await removeTemplateStorage(template);

    const admin = getAdminClient();
    const { error } = await admin.from("user_templates").delete().eq("id", String(templateId));

    if (error) {
      throw new Error("Nao foi possivel excluir template definitivamente.");
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
