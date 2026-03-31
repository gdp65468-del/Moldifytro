import { onCall } from "firebase-functions/v2/https";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { adminDb, assertAdmin } from "./admin";
import {
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryCloudName,
  cloudinaryFolder,
} from "./config";
import type { PaymentStatus } from "../../src/types/payment";
import type { TemplateMode, TemplateStatus } from "../../src/types/template";

type FireDoc = { id: string } & Record<string, unknown>;

function includesSearch(values: Array<string | undefined>, search?: string) {
  if (!search) {
    return true;
  }

  const haystack = values.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|webp));base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem invalido. Use PNG ou WebP.");
  }

  const mimeType = match[1];
  const base64Body = match[2];
  return {
    mimeType,
    buffer: Buffer.from(base64Body, "base64"),
  };
}

async function uploadPlatformImage(dataUrl: string): Promise<UploadedPlatformImage> {
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const extension = mimeType === "image/png" ? "png" : "webp";
  const fileName = `${randomUUID()}.${extension}`;
  const path = `platform/templates/${fileName}`;
  const token = randomUUID();
  const bucket = getStorage().bucket();
  const file = bucket.file(path);

  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      cacheControl: "public,max-age=3600",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const encodedPath = encodeURIComponent(path);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
  return { path, url, provider: "firebase_storage" };
}

type UploadedPlatformImage = {
  path?: string;
  url: string;
  provider: "cloudinary" | "firebase_storage";
  publicId?: string;
};

async function uploadPlatformImageToCloudinary(dataUrl: string): Promise<UploadedPlatformImage | null> {
  const cloudName = cloudinaryCloudName.value().trim();
  if (!cloudName) {
    return null;
  }

  const apiKey = cloudinaryApiKey.value().trim();
  const apiSecret = cloudinaryApiSecret.value().trim();
  const folder = cloudinaryFolder.value().trim() || "moldify/platform";

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");
  const form = new URLSearchParams();
  form.set("file", dataUrl);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudinary upload falhou: ${body.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
  };

  if (!payload.secure_url) {
    throw new Error("Cloudinary nao retornou a URL da imagem.");
  }

  return {
    url: payload.secure_url,
    provider: "cloudinary",
    publicId: payload.public_id,
  };
}

export const getAdminStatus = onCall(async (request) => {
  try {
    await assertAdmin(request);
    return { isAdmin: true };
  } catch {
    return { isAdmin: false };
  }
});

export const getAdminOverview = onCall(async (request) => {
  await assertAdmin(request);

  const [usersSnap, templatesSnap, paymentsSnap] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("user_templates").get(),
    adminDb.collection("payments").get(),
  ]);

  const templates: FireDoc[] = templatesSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));
  const payments: FireDoc[] = paymentsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));

  const users = usersSnap.docs.length;
  const totalViews = templates.reduce((sum, item) => sum + Number(item.viewsCount ?? 0), 0);
  const totalDownloads = templates.reduce((sum, item) => sum + Number(item.downloadsCount ?? 0), 0);
  const approvedPayments = payments.filter((item) => item.status === "approved");
  const recentTemplates = templates
    .sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      ownerId: String(item.ownerId ?? ""),
      ownerName: "Criador",
      ownerEmail: "-",
      title: String(item.title ?? "Template"),
      templateMode: item.templateMode,
      status: item.status,
      isPublic: Boolean(item.isPublic),
      shareSlug: item.shareSlug,
      thumbnailUrl: item.thumbnailUrl,
      viewsCount: Number(item.viewsCount ?? 0),
      downloadsCount: Number(item.downloadsCount ?? 0),
      updatedAt: String(item.updatedAt ?? ""),
    }));

  return {
    totalUsers: users,
    totalTemplates: templates.length,
    publishedTemplates: templates.filter((item) => item.status === "published").length,
    totalViews,
    totalDownloads,
    approvedPayments: approvedPayments.length,
    pendingOrFailedPayments: payments.filter((item) => item.status !== "approved").length,
    revenueTotal: approvedPayments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    recentTemplates,
  };
});

export const listAdminTemplates = onCall(async (request) => {
  await assertAdmin(request);
  const filters = (request.data ?? {}) as {
    search?: string;
    status?: TemplateStatus | "all";
    mode?: TemplateMode | "all";
    visibility?: "all" | "public" | "private";
  };

  const [templatesSnap, usersSnap] = await Promise.all([
    adminDb.collection("user_templates").get(),
    adminDb.collection("users").get(),
  ]);

  const users = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));

  return templatesSnap.docs
    .map((doc) => {
      const data = doc.data();
      const owner = users.get(String(data.ownerId ?? ""));
      return {
        id: doc.id,
        ownerId: String(data.ownerId ?? ""),
        ownerName: String(owner?.name ?? "Criador"),
        ownerEmail: String(owner?.email ?? "-"),
        title: String(data.title ?? "Template"),
        templateMode: data.templateMode,
        status: data.status,
        isPublic: Boolean(data.isPublic),
        shareSlug: data.shareSlug,
        thumbnailUrl: data.thumbnailUrl,
        viewsCount: Number(data.viewsCount ?? 0),
        downloadsCount: Number(data.downloadsCount ?? 0),
        updatedAt: String(data.updatedAt ?? ""),
      };
    })
    .filter((item) => {
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.mode && filters.mode !== "all" && item.templateMode !== filters.mode) return false;
      if (filters.visibility === "public" && !item.isPublic) return false;
      if (filters.visibility === "private" && item.isPublic) return false;
      return includesSearch([item.title, item.ownerName, item.ownerEmail, item.shareSlug], filters.search);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

export const listAdminPayments = onCall(async (request) => {
  await assertAdmin(request);
  const filters = (request.data ?? {}) as { search?: string; status?: PaymentStatus | "all" };

  const [paymentsSnap, usersSnap, templatesSnap] = await Promise.all([
    adminDb.collection("payments").get(),
    adminDb.collection("users").get(),
    adminDb.collection("user_templates").get(),
  ]);

  const users = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));
  const templates = new Map(templatesSnap.docs.map((doc) => [doc.id, doc.data()]));

  return paymentsSnap.docs
    .map((doc) => {
      const data = doc.data();
      const user = users.get(String(data.userId ?? ""));
      const template = templates.get(String(data.templateId ?? ""));
      return {
        id: doc.id,
        userId: String(data.userId ?? ""),
        userName: String(user?.name ?? "Criador"),
        userEmail: String(user?.email ?? "-"),
        templateId: String(data.templateId ?? ""),
        templateTitle: String(template?.title ?? "Template"),
        amount: Number(data.amount ?? 0),
        status: data.status,
        provider: String(data.provider ?? ""),
        createdAt: String(data.createdAt ?? ""),
      };
    })
    .filter((item) => {
      if (filters.status && filters.status !== "all" && item.status !== filters.status) return false;
      return includesSearch([item.userName, item.userEmail, item.templateTitle], filters.search);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});

export const listAdminUsers = onCall(async (request) => {
  await assertAdmin(request);
  const [usersSnap, templatesSnap] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("user_templates").get(),
  ]);

  const templates: FireDoc[] = templatesSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));

  return usersSnap.docs
    .map((doc) => {
      const user = doc.data();
      const owned = templates.filter((item) => String(item.ownerId ?? "") === doc.id);
      return {
        id: doc.id,
        name: String(user.name ?? "Criador"),
        email: String(user.email ?? "-"),
        templatesCount: owned.length,
        publishedTemplatesCount: owned.filter((item) => item.status === "published").length,
        totalDownloads: owned.reduce((sum, item) => sum + Number(item.downloadsCount ?? 0), 0),
        createdAt: String(user.createdAt ?? ""),
      };
    })
    .sort((a, b) => b.totalDownloads - a.totalDownloads);
});

export const listAdminPlatformTemplates = onCall(async (request) => {
  await assertAdmin(request);

  const snapshot = await adminDb.collection("platform_templates").get();
  const templates = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as FireDoc,
  );

  templates.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")));

  return templates;
});

export const togglePlatformTemplate = onCall(async (request) => {
  await assertAdmin(request);
  const templateId = String(request.data?.templateId ?? "");
  const isActive = Boolean(request.data?.isActive);

  const ref = adminDb.collection("platform_templates").doc(templateId);
  await ref.set({ isActive }, { merge: true });
  const snapshot = await ref.get();
  return { id: snapshot.id, ...snapshot.data() };
});

export const updatePlatformTemplate = onCall(async (request) => {
  await assertAdmin(request);
  const templateId = String(request.data?.templateId ?? "");
  const title = String(request.data?.title ?? "");
  const category = String(request.data?.category ?? "");

  const ref = adminDb.collection("platform_templates").doc(templateId);
  await ref.set({ title, category }, { merge: true });
  const snapshot = await ref.get();
  return { id: snapshot.id, ...snapshot.data() };
});

export const createPlatformTemplate = onCall(
  { secrets: [cloudinaryApiKey, cloudinaryApiSecret] },
  async (request) => {
  await assertAdmin(request);

  const title = String(request.data?.title ?? "").trim();
  const category = String(request.data?.category ?? "").trim();
  const imageDataUrl = String(request.data?.imageDataUrl ?? "").trim();

  if (!title) {
    throw new Error("Titulo obrigatorio.");
  }

  if (!category) {
    throw new Error("Categoria obrigatoria.");
  }

  if (!imageDataUrl) {
    throw new Error("Imagem obrigatoria.");
  }

  const uploaded =
    (await uploadPlatformImageToCloudinary(imageDataUrl)) ??
    (await uploadPlatformImage(imageDataUrl));
  const now = new Date().toISOString();

  const payload = {
    title,
    category,
    imageUrl: uploaded.url,
    thumbnailUrl: uploaded.url,
    imageStoragePath: uploaded.path,
    imageProvider: uploaded.provider,
    cloudinaryPublicId: uploaded.publicId,
    templateMode: "full_frame",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await adminDb.collection("platform_templates").add(payload);
  return { id: ref.id, ...payload };
},
);

export const setUserTemplateVisibility = onCall(async (request) => {
  await assertAdmin(request);
  const templateId = String(request.data?.templateId ?? "");
  const isPublic = Boolean(request.data?.isPublic);

  const ref = adminDb.collection("user_templates").doc(templateId);
  await ref.set(
    {
      isPublic,
      status: isPublic ? "published" : "draft",
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  const snapshot = await ref.get();
  return { id: snapshot.id, ...snapshot.data() };
});
