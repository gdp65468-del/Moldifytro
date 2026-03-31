import type { PaymentRecord } from "@/types/payment";
import type { PlatformTemplate, TemplateUse, UserTemplate } from "@/types/template";
import type { UserProfile } from "@/types/user";
import { buildUniqueSlug } from "@/utils/slug";

const ADMIN_ACCESS_KEY = "moldify.demo.admin-access";
const USERS_KEY = "moldify.demo.users";
const CURRENT_USER_KEY = "moldify.demo.current-user";
const USER_TEMPLATES_KEY = "moldify.demo.user-templates";
const PAYMENTS_KEY = "moldify.demo.payments";
const TEMPLATE_USES_KEY = "moldify.demo.template-uses";
const PLATFORM_TEMPLATES_KEY = "moldify.demo.platform-templates";

export const DEMO_ADMIN_EMAILS = ["demo@moldify.local"];

const DEFAULT_PLATFORM_TEMPLATES: PlatformTemplate[] = [
  {
    id: "platform-moldura-ciclismo",
    title: "Moldura da plataforma",
    category: "esporte",
    imageUrl: "/platform/moldura.png",
    thumbnailUrl: "/platform/moldura.png",
    templateMode: "full_frame",
    isActive: true,
    viewsCount: 0,
    downloadsCount: 0,
    createdAt: new Date().toISOString(),
  },
];

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getDemoCurrentUser(): UserProfile | null {
  return readJson<UserProfile | null>(CURRENT_USER_KEY, null);
}

export function setDemoCurrentUser(user: UserProfile | null) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function upsertDemoUser(user: UserProfile) {
  const users = readJson<UserProfile[]>(USERS_KEY, []);
  const index = users.findIndex((item) => item.id === user.id);

  if (index >= 0) {
    users[index] = user;
  } else {
    users.unshift(user);
  }

  writeJson(USERS_KEY, users);
}

export function listDemoUsers() {
  return readJson<UserProfile[]>(USERS_KEY, []);
}

export function listDemoAdminAccess() {
  const current = readJson<{ uid: string; email: string; active: boolean; createdAt: string }[]>(
    ADMIN_ACCESS_KEY,
    [],
  );

  if (current.length) {
    return current;
  }

  const seeded = [
    {
      uid: "demo-user",
      email: "demo@moldify.local",
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];

  writeJson(ADMIN_ACCESS_KEY, seeded);
  return seeded;
}

export function getDemoPlatformTemplates() {
  const templates = readJson<PlatformTemplate[]>(PLATFORM_TEMPLATES_KEY, []);
  if (templates.length) {
    return templates;
  }

  writeJson(PLATFORM_TEMPLATES_KEY, DEFAULT_PLATFORM_TEMPLATES);
  return DEFAULT_PLATFORM_TEMPLATES;
}

export function saveDemoPlatformTemplate(template: PlatformTemplate) {
  const templates = getDemoPlatformTemplates();
  const index = templates.findIndex((item) => item.id === template.id);
  const next = [...templates];

  if (index >= 0) {
    next[index] = template;
  } else {
    next.unshift(template);
  }

  writeJson(PLATFORM_TEMPLATES_KEY, next);
  return template;
}

export function listDemoUserTemplates(ownerId?: string) {
  const items = readJson<UserTemplate[]>(USER_TEMPLATES_KEY, []);
  return ownerId ? items.filter((item) => item.ownerId === ownerId) : items;
}

export function getDemoTemplate(templateId: string) {
  return listDemoUserTemplates().find((item) => item.id === templateId) ?? null;
}

export function getDemoPublicTemplateBySlug(slug: string) {
  return (
    listDemoUserTemplates().find((item) => item.shareSlug === slug && item.isPublic) ?? null
  );
}

export function saveDemoTemplate(template: UserTemplate) {
  const items = readJson<UserTemplate[]>(USER_TEMPLATES_KEY, []);
  const index = items.findIndex((item) => item.id === template.id);

  if (index >= 0) {
    items[index] = template;
  } else {
    items.unshift(template);
  }

  writeJson(USER_TEMPLATES_KEY, items);
  return template;
}

export function publishDemoTemplate(templateId: string) {
  const template = getDemoTemplate(templateId);
  if (!template) {
    throw new Error("Template nao encontrado.");
  }

  const payments = listDemoPayments().filter(
    (item) => item.templateId === templateId && item.status === "approved",
  );

  if (!payments.length) {
    throw new Error("Pagamento ainda nao aprovado.");
  }

  const published = {
    ...template,
    status: "published" as const,
    isPublic: true,
    publishUnlocked: true,
    pricePaid: payments[0].amount,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shareSlug: buildUniqueSlug(
      template.title,
      listDemoUserTemplates()
        .filter((item) => item.id !== templateId && item.shareSlug)
        .map((item) => item.shareSlug as string),
    ),
  };

  saveDemoTemplate(published);
  return published;
}

export function listDemoPayments() {
  return readJson<PaymentRecord[]>(PAYMENTS_KEY, []);
}

export function saveDemoPayment(payment: PaymentRecord) {
  const items = listDemoPayments();
  const index = items.findIndex((item) => item.id === payment.id);

  if (index >= 0) {
    items[index] = payment;
  } else {
    items.unshift(payment);
  }

  writeJson(PAYMENTS_KEY, items);
  return payment;
}

export function listDemoTemplateUses() {
  return readJson<TemplateUse[]>(TEMPLATE_USES_KEY, []);
}

export function saveDemoTemplateUse(templateUse: TemplateUse) {
  const items = listDemoTemplateUses();
  items.unshift(templateUse);
  writeJson(TEMPLATE_USES_KEY, items);
}

export function incrementDemoTemplateStats(
  templateId: string,
  action: TemplateUse["action"],
) {
  const template = getDemoTemplate(templateId);
  if (!template) {
    return null;
  }

  const next: UserTemplate = {
    ...template,
    usesCount: template.usesCount + (action === "download" ? 1 : 0),
    viewsCount: (template.viewsCount ?? 0) + (action === "view" ? 1 : 0),
    downloadsCount: (template.downloadsCount ?? 0) + (action === "download" ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };

  saveDemoTemplate(next);
  return next;
}

export function setDemoTemplateVisibility(templateId: string, isPublic: boolean) {
  const template = getDemoTemplate(templateId);
  if (!template) {
    throw new Error("Template nao encontrado.");
  }

  const next: UserTemplate = {
    ...template,
    isPublic,
    status: isPublic ? "published" : "draft",
    updatedAt: new Date().toISOString(),
  };

  saveDemoTemplate(next);
  return next;
}
