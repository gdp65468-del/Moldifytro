import type { PaymentRecord } from "@/types/payment";
import type { OverlayConfig, PlatformTemplate, UserTemplate } from "@/types/template";
import type { UserProfile } from "@/types/user";

type Nullable<T> = T | null | undefined;

function toOverlayConfig(value: unknown): OverlayConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const payload = value as Record<string, unknown>;
  const x = Number(payload.x);
  const y = Number(payload.y);
  const scale = Number(payload.scale);
  const widthRatio = Number(payload.widthRatio);

  if ([x, y, scale, widthRatio].some((item) => Number.isNaN(item))) {
    return undefined;
  }

  return { x, y, scale, widthRatio };
}

export function mapUserProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? "Criador Moldify"),
    email: String(row.email ?? ""),
    photoURL: (row.photo_url as Nullable<string>) ?? undefined,
    planType: "free",
    publishedTemplatesCount: Number(row.published_templates_count ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapPlatformTemplateRow(row: Record<string, unknown>): PlatformTemplate {
  return {
    id: String(row.id),
    title: String(row.title ?? "Template"),
    category: String(row.category ?? "geral"),
    imageUrl: String(row.image_url ?? "/platform/moldura.png"),
    thumbnailUrl: String(row.thumbnail_url ?? row.image_url ?? "/platform/moldura.png"),
    templateMode: "full_frame",
    isActive: Boolean(row.is_active ?? true),
    viewsCount: Number(row.views_count ?? 0),
    downloadsCount: Number(row.downloads_count ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapUserTemplateRow(row: Record<string, unknown>): UserTemplate {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id ?? ""),
    title: String(row.title ?? "Template"),
    templateMode: String(row.template_mode ?? "full_frame") as UserTemplate["templateMode"],
    frameUrl: String(row.frame_url ?? ""),
    frameStoragePath: (row.frame_storage_path as Nullable<string>) ?? undefined,
    thumbnailUrl: (row.thumbnail_url as Nullable<string>) ?? undefined,
    status: String(row.status ?? "draft") as UserTemplate["status"],
    isPublic: Boolean(row.is_public ?? false),
    publishUnlocked: Boolean(row.publish_unlocked ?? false),
    shareSlug: (row.share_slug as Nullable<string>) ?? undefined,
    usesCount: Number(row.uses_count ?? 0),
    viewsCount: Number(row.views_count ?? 0),
    downloadsCount: Number(row.downloads_count ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    publishedAt: (row.published_at as Nullable<string>) ?? null,
    pricePaid: (row.price_paid as Nullable<number>) ?? null,
    source: String(row.source ?? "custom") as UserTemplate["source"],
    platformTemplateId: (row.platform_template_id as Nullable<string>) ?? undefined,
    overlayConfig: toOverlayConfig(row.overlay_config),
    deletedAt: (row.deleted_at as Nullable<string>) ?? null,
    purgeAt: (row.purge_at as Nullable<string>) ?? null,
  };
}

export function mapPaymentRow(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    templateId: String(row.template_id ?? ""),
    provider: String(row.provider ?? "asaas") as PaymentRecord["provider"],
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? "pending") as PaymentRecord["status"],
    checkoutUrl: (row.checkout_url as Nullable<string>) ?? undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: (row.updated_at as Nullable<string>) ?? undefined,
  };
}
