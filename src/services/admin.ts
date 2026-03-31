import { invokeSupabaseFunction } from "@/services/functions";
import { supabase, assertSupabaseEnabled } from "@/services/supabase";
import type {
  AdminOverview,
  AdminPaymentFilters,
  AdminPaymentRow,
  AdminTemplateFilters,
  AdminTemplateRow,
  AdminUserRow,
} from "@/types/admin";
import type { PlatformTemplate, UserTemplate } from "@/types/template";

export async function getAdminStatus(userId?: string) {
  assertSupabaseEnabled();

  if (!userId) {
    return { isAdmin: false };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("Falha ao verificar admin em user_roles:", error);
    return { isAdmin: false };
  }

  return { isAdmin: Boolean(data) };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<AdminOverview>("admin-overview");
}

export async function listAdminTemplates(filters?: AdminTemplateFilters): Promise<AdminTemplateRow[]> {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<AdminTemplateRow[]>("admin-list-templates", filters ?? {});
}

export async function listAdminPayments(filters?: AdminPaymentFilters): Promise<AdminPaymentRow[]> {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<AdminPaymentRow[]>("admin-list-payments", filters ?? {});
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<AdminUserRow[]>("admin-list-users");
}

export async function listAdminPlatformTemplates(): Promise<PlatformTemplate[]> {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<PlatformTemplate[]>("admin-platform-list");
}

export async function togglePlatformTemplate(templateId: string, isActive: boolean) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<PlatformTemplate>("admin-platform-toggle", { templateId, isActive });
}

export async function updatePlatformTemplate(templateId: string, input: Pick<PlatformTemplate, "title" | "category">) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<PlatformTemplate>("admin-platform-update", {
    templateId,
    title: input.title,
    category: input.category,
  });
}

export async function createAdminPlatformTemplate(input: {
  title: string;
  category: string;
  imageDataUrl: string;
}) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<PlatformTemplate>("admin-platform-create", input);
}

export async function deleteAdminPlatformTemplate(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true; detachedTemplates: number }>("admin-platform-delete", { templateId });
}

export async function setUserTemplateVisibility(templateId: string, isPublic: boolean) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<UserTemplate>("admin-set-template-visibility", { templateId, isPublic });
}

export async function trashAdminTemplate(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true }>("trash-template", { templateId });
}

export async function restoreAdminTemplate(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true }>("restore-template", { templateId });
}

export async function deleteAdminTemplatePermanently(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true }>("delete-template-permanently", { templateId });
}
