import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputFile = path.resolve(__dirname, "./out/firebase-export.json");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel ${name} obrigatoria.`);
  }
  return value;
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const raw = await fs.readFile(inputFile, "utf8");
  const payload = JSON.parse(raw);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const users = (payload.users ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? "Criador Moldify",
    email: item.email ?? "",
    photo_url: item.photoURL ?? null,
    plan_type: item.planType ?? "free",
    published_templates_count: item.publishedTemplatesCount ?? 0,
    created_at: item.createdAt ?? new Date().toISOString(),
    updated_at: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }));

  const userRoles = (payload.adminAccess ?? [])
    .filter((item) => item.active === true)
    .map((item) => ({
      user_id: item.uid,
      role: "admin",
      active: true,
      created_at: item.createdAt ?? new Date().toISOString(),
    }));

  const platformTemplates = (payload.platformTemplates ?? []).map((item) => ({
    id: item.id,
    title: item.title ?? "Template",
    category: item.category ?? "geral",
    image_url: item.imageUrl,
    thumbnail_url: item.thumbnailUrl ?? item.imageUrl,
    template_mode: "full_frame",
    is_active: item.isActive ?? true,
    created_at: item.createdAt ?? new Date().toISOString(),
    updated_at: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }));

  const userTemplates = (payload.userTemplates ?? []).map((item) => ({
    id: item.id,
    owner_id: item.ownerId,
    title: item.title,
    template_mode: item.templateMode,
    frame_url: item.frameUrl,
    frame_storage_path: item.frameStoragePath ?? null,
    thumbnail_url: item.thumbnailUrl ?? null,
    status: item.status ?? "draft",
    is_public: item.isPublic ?? false,
    publish_unlocked: item.publishUnlocked ?? false,
    share_slug: item.shareSlug ?? null,
    uses_count: item.usesCount ?? 0,
    views_count: item.viewsCount ?? 0,
    downloads_count: item.downloadsCount ?? 0,
    created_at: item.createdAt ?? new Date().toISOString(),
    updated_at: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
    published_at: item.publishedAt ?? null,
    price_paid: item.pricePaid ?? null,
    source: item.source ?? "custom",
    platform_template_id: item.platformTemplateId ?? null,
    overlay_config: item.overlayConfig ?? null,
  }));

  const payments = (payload.payments ?? []).map((item) => ({
    id: item.id,
    user_id: item.userId,
    template_id: item.templateId,
    provider: item.provider ?? "asaas",
    amount: item.amount ?? 0,
    status: item.status ?? "pending",
    checkout_url: item.checkoutUrl ?? null,
    created_at: item.createdAt ?? new Date().toISOString(),
    updated_at: item.updatedAt ?? item.createdAt ?? new Date().toISOString(),
  }));

  const templateUses = (payload.templateUses ?? []).map((item) => ({
    id: item.id,
    template_id: item.templateId,
    used_by: item.usedBy ?? "anonymous",
    action: item.action ?? "view",
    created_at: item.createdAt ?? new Date().toISOString(),
  }));

  async function upsert(table, rows, onConflict = "id") {
    if (!rows.length) return;
    const { error } = await supabase.from(table).upsert(rows, { onConflict });
    if (error) {
      throw new Error(`Falha em ${table}: ${error.message}`);
    }
  }

  await upsert("users", users);
  await upsert("user_roles", userRoles, "user_id,role");
  await upsert("platform_templates", platformTemplates);
  await upsert("user_templates", userTemplates);
  await upsert("payments", payments);
  await upsert("template_uses", templateUses);

  console.log("Import para Supabase concluido.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

