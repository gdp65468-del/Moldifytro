import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json, requireUser } from "../_shared/supabase.ts";
import { removeTemplateStorage } from "../_shared/trash.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    const admin = getAdminClient();

    const { data: templates, error: templatesError } = await admin
      .from("user_templates")
      .select("id,frame_storage_path")
      .eq("owner_id", user.id)
      .not("deleted_at", "is", null);

    if (templatesError) {
      throw new Error("Nao foi possivel abrir a lixeira.");
    }

    for (const template of templates ?? []) {
      await removeTemplateStorage(template);
    }

    const { error } = await admin
      .from("user_templates")
      .delete()
      .eq("owner_id", user.id)
      .not("deleted_at", "is", null);

    if (error) {
      throw new Error("Nao foi possivel limpar a lixeira.");
    }

    return json({ ok: true, deletedCount: templates?.length ?? 0 });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
