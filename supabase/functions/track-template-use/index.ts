import { handleCors } from "../_shared/cors.ts";
import { getAdminClient, json } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { templateId, usedBy, action } = await request.json();
    const resolvedAction = action === "view" ? "view" : "download";
    const admin = getAdminClient();

    const { data: template } = await admin
      .from("user_templates")
      .select("*")
      .eq("id", String(templateId))
      .is("deleted_at", null)
      .maybeSingle();

    if (template) {
      await admin
        .from("user_templates")
        .update({
          views_count: Number(template.views_count ?? 0) + (resolvedAction === "view" ? 1 : 0),
          downloads_count:
            Number(template.downloads_count ?? 0) + (resolvedAction === "download" ? 1 : 0),
          uses_count: Number(template.uses_count ?? 0) + (resolvedAction === "download" ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(templateId));
    }

    const { data: templateUse, error } = await admin
      .from("template_uses")
      .insert({
        template_id: String(templateId),
        used_by: String(usedBy ?? "anonymous"),
        action: resolvedAction,
      })
      .select("*")
      .single();

    if (error || !templateUse) {
      throw new Error("Nao foi possivel registrar uso.");
    }

    return json({
      templateUse: {
        id: templateUse.id,
        templateId: templateUse.template_id,
        usedBy: templateUse.used_by,
        action: templateUse.action,
        createdAt: templateUse.created_at,
      },
    });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});
