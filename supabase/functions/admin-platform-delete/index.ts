import { handleCors } from "../_shared/cors.ts";
import { assertAdmin, getAdminClient, json, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (request: Request) => {
  const cors = handleCors(request);
  if (cors) return cors;

  try {
    const { user } = await requireUser(request);
    await assertAdmin(user.id);
    const { templateId } = await request.json();

    if (!templateId) {
      throw new Error("templateId e obrigatorio.");
    }

    const admin = getAdminClient();

    const { data: template, error: templateError } = await admin
      .from("platform_templates")
      .select("id, image_storage_path, title")
      .eq("id", String(templateId))
      .maybeSingle();

    if (templateError || !template) {
      throw new Error("Moldura da plataforma nao encontrada.");
    }

    const { count, error: linkedError } = await admin
      .from("user_templates")
      .select("id", { count: "exact", head: true })
      .eq("platform_template_id", String(templateId));

    if (linkedError) {
      throw new Error("Nao foi possivel validar o uso da moldura.");
    }

    const linkedTemplatesCount = count ?? 0;

    if (linkedTemplatesCount > 0) {
      const { error: detachError } = await admin
        .from("user_templates")
        .update({
          platform_template_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("platform_template_id", String(templateId));

      if (detachError) {
        throw new Error("Nao foi possivel preservar os templates que usam esta moldura.");
      }
    }

    if (template.image_storage_path && linkedTemplatesCount === 0) {
      const { error: storageError } = await admin.storage
        .from("platform")
        .remove([String(template.image_storage_path)]);

      if (storageError) {
        console.warn("Falha ao remover imagem da moldura da plataforma:", storageError.message);
      }
    }

    const { error: deleteError } = await admin
      .from("platform_templates")
      .delete()
      .eq("id", String(templateId));

    if (deleteError) {
      throw new Error("Nao foi possivel excluir a moldura da plataforma.");
    }

    return json({ ok: true, detachedTemplates: linkedTemplatesCount });
  } catch (error) {
    return json({ error: (error as Error).message }, 401);
  }
});
