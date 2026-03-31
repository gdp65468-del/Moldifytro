import { assertAdmin, getAdminClient } from "./supabase.ts";

type TemplateRow = {
  id: string;
  owner_id: string;
  deleted_at?: string | null;
  purge_at?: string | null;
  frame_storage_path?: string | null;
};

export async function getManageableTemplate(templateId: string, userId: string) {
  const admin = getAdminClient();
  const { data: template, error } = await admin
    .from("user_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !template) {
    throw new Error("Template nao encontrado.");
  }

  if (template.owner_id !== userId) {
    await assertAdmin(userId);
  }

  return template as TemplateRow & Record<string, unknown>;
}

export async function removeTemplateStorage(template: TemplateRow) {
  const storagePath = String(template.frame_storage_path ?? "");
  if (!storagePath) {
    return;
  }

  const admin = getAdminClient();
  await admin.storage.from("users").remove([storagePath]);
}
