import { mapPlatformTemplateRow, mapUserTemplateRow } from "@/services/mappers";
import { invokeSupabaseFunction } from "@/services/functions";
import { supabase, assertSupabaseEnabled } from "@/services/supabase";
import type { PlatformTemplate, TemplateDraftInput, TemplateUse, UserTemplate } from "@/types/template";

type ActionType = "view" | "download";
export type TemplateListScope = "active" | "trash";

const FALLBACK_PLATFORM_TEMPLATES: PlatformTemplate[] = [
  {
    id: "platform-moldura-default",
    title: "Moldura da plataforma",
    category: "geral",
    imageUrl: "/platform/moldura.png",
    thumbnailUrl: "/platform/moldura.png",
    templateMode: "full_frame",
    isActive: true,
    viewsCount: 0,
    downloadsCount: 0,
    createdAt: new Date().toISOString(),
  },
];

export async function listPlatformTemplates(): Promise<PlatformTemplate[]> {
  assertSupabaseEnabled();

  const { data, error } = await supabase
    .from("platform_templates")
    .select("*")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) {
    console.error("Falha ao carregar molduras da plataforma:", error);
    return FALLBACK_PLATFORM_TEMPLATES;
  }

  const mapped = (data ?? []).map((item) => mapPlatformTemplateRow(item as Record<string, unknown>));
  const templateIds = mapped.map((item) => item.id);

  if (!templateIds.length) {
    return FALLBACK_PLATFORM_TEMPLATES;
  }

  const { data: linkedTemplates } = await supabase
    .from("user_templates")
    .select("platform_template_id, views_count, downloads_count")
    .in("platform_template_id", templateIds);

  const countsByPlatformId = (linkedTemplates ?? []).reduce<Record<string, { views: number; downloads: number }>>(
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

  const enriched = mapped.map((item) => ({
    ...item,
    viewsCount: countsByPlatformId[item.id]?.views ?? 0,
    downloadsCount: countsByPlatformId[item.id]?.downloads ?? 0,
  }));
  return enriched.length ? enriched : FALLBACK_PLATFORM_TEMPLATES;
}

export async function purgeExpiredUserTemplates() {
  assertSupabaseEnabled();

  const { error } = await supabase.rpc("purge_expired_user_templates");
  if (error) {
    console.error("Falha ao limpar lixeira expirada:", error);
  }
}

export async function listUserTemplates(ownerId: string, scope: TemplateListScope = "active"): Promise<UserTemplate[]> {
  assertSupabaseEnabled();
  await purgeExpiredUserTemplates();

  let query = supabase.from("user_templates").select("*").eq("owner_id", ownerId);

  query =
    scope === "trash"
      ? query.not("deleted_at", "is", null).order("purge_at", { ascending: true })
      : query.is("deleted_at", null).order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error("Nao foi possivel carregar seus templates.");
  }

  return (data ?? []).map((item) => mapUserTemplateRow(item as Record<string, unknown>));
}

export async function getUserTemplate(templateId: string, options?: { includeTrashed?: boolean }): Promise<UserTemplate | null> {
  assertSupabaseEnabled();
  await purgeExpiredUserTemplates();

  let query = supabase.from("user_templates").select("*").eq("id", templateId);

  if (!options?.includeTrashed) {
    query = query.is("deleted_at", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error("Nao foi possivel carregar o template.");
  }

  return data ? mapUserTemplateRow(data as Record<string, unknown>) : null;
}

export async function getPublicTemplateBySlug(slug: string): Promise<UserTemplate | null> {
  assertSupabaseEnabled();
  await purgeExpiredUserTemplates();

  const { data, error } = await supabase
    .from("user_templates")
    .select("*")
    .eq("share_slug", slug)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Nao foi possivel carregar template publico.");
  }

  return data ? mapUserTemplateRow(data as Record<string, unknown>) : null;
}

export async function getPublicPlatformTemplateById(platformTemplateId: string): Promise<PlatformTemplate | null> {
  assertSupabaseEnabled();

  const { data, error } = await supabase
    .from("platform_templates")
    .select("*")
    .eq("id", platformTemplateId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error("Nao foi possivel carregar a moldura publica.");
  }

  return data ? mapPlatformTemplateRow(data as Record<string, unknown>) : null;
}

export async function saveTemplateDraft(input: TemplateDraftInput): Promise<UserTemplate> {
  assertSupabaseEnabled();

  const existing = input.id ? await getUserTemplate(input.id) : null;
  const now = new Date().toISOString();

  const payload = {
    id: input.id ?? crypto.randomUUID(),
    owner_id: input.ownerId,
    title: input.title,
    template_mode: input.templateMode,
    frame_url: input.frameUrl,
    frame_storage_path: input.frameStoragePath ?? null,
    thumbnail_url: input.thumbnailUrl ?? existing?.thumbnailUrl ?? null,
    status: existing?.status ?? "draft",
    is_public: existing?.isPublic ?? false,
    publish_unlocked: existing?.publishUnlocked ?? false,
    share_slug: existing?.shareSlug ?? null,
    uses_count: existing?.usesCount ?? 0,
    views_count: existing?.viewsCount ?? 0,
    downloads_count: existing?.downloadsCount ?? 0,
    created_at: existing?.createdAt ?? now,
    updated_at: now,
    published_at: existing?.publishedAt ?? null,
    price_paid: existing?.pricePaid ?? null,
    source: input.source ?? existing?.source ?? "custom",
    platform_template_id: input.platformTemplateId ?? existing?.platformTemplateId ?? null,
    overlay_config: input.overlayConfig ?? null,
  };

  const { data, error } = await supabase
    .from("user_templates")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Nao foi possivel salvar rascunho.");
  }

  return mapUserTemplateRow(data as Record<string, unknown>);
}

export async function publishTemplate(templateId: string): Promise<UserTemplate> {
  assertSupabaseEnabled();

  const data = await invokeSupabaseFunction<{ template?: Record<string, unknown> }>("publish-template", {
    templateId,
  });

  const template = data?.template;
  if (!template) {
    throw new Error("Resposta invalida ao publicar template.");
  }

  return mapUserTemplateRow(template);
}

export async function moveTemplateToTrash(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true }>("trash-template", { templateId });
}

export async function restoreTemplateFromTrash(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true }>("restore-template", { templateId });
}

export async function deleteTemplatePermanently(templateId: string) {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true }>("delete-template-permanently", { templateId });
}

export async function emptyTemplateTrash() {
  assertSupabaseEnabled();
  return invokeSupabaseFunction<{ ok: true; deletedCount: number }>("empty-trash");
}

export async function trackTemplateUse(
  templateId: string,
  usedBy: string,
  action: ActionType = "download",
): Promise<TemplateUse | void> {
  assertSupabaseEnabled();

  const data = await invokeSupabaseFunction<{ templateUse?: TemplateUse }>("track-template-use", {
    templateId,
    usedBy,
    action,
  });

  const use = data?.templateUse;
  return use;
}
