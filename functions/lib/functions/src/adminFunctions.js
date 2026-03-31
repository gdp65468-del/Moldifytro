"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserTemplateVisibility = exports.createPlatformTemplate = exports.updatePlatformTemplate = exports.togglePlatformTemplate = exports.listAdminPlatformTemplates = exports.listAdminUsers = exports.listAdminPayments = exports.listAdminTemplates = exports.getAdminOverview = exports.getAdminStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-admin/storage");
const node_crypto_1 = require("node:crypto");
const node_crypto_2 = require("node:crypto");
const admin_1 = require("./admin");
const config_1 = require("./config");
function includesSearch(values, search) {
    if (!search) {
        return true;
    }
    const haystack = values.filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(search.toLowerCase());
}
function parseDataUrl(dataUrl) {
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
async function uploadPlatformImage(dataUrl) {
    const { mimeType, buffer } = parseDataUrl(dataUrl);
    const extension = mimeType === "image/png" ? "png" : "webp";
    const fileName = `${(0, node_crypto_1.randomUUID)()}.${extension}`;
    const path = `platform/templates/${fileName}`;
    const token = (0, node_crypto_1.randomUUID)();
    const bucket = (0, storage_1.getStorage)().bucket();
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
async function uploadPlatformImageToCloudinary(dataUrl) {
    const cloudName = config_1.cloudinaryCloudName.value().trim();
    if (!cloudName) {
        return null;
    }
    const apiKey = config_1.cloudinaryApiKey.value().trim();
    const apiSecret = config_1.cloudinaryApiSecret.value().trim();
    const folder = config_1.cloudinaryFolder.value().trim() || "moldify/platform";
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = (0, node_crypto_2.createHash)("sha1").update(toSign).digest("hex");
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
    const payload = (await response.json());
    if (!payload.secure_url) {
        throw new Error("Cloudinary nao retornou a URL da imagem.");
    }
    return {
        url: payload.secure_url,
        provider: "cloudinary",
        publicId: payload.public_id,
    };
}
exports.getAdminStatus = (0, https_1.onCall)(async (request) => {
    try {
        await (0, admin_1.assertAdmin)(request);
        return { isAdmin: true };
    }
    catch {
        return { isAdmin: false };
    }
});
exports.getAdminOverview = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const [usersSnap, templatesSnap, paymentsSnap] = await Promise.all([
        admin_1.adminDb.collection("users").get(),
        admin_1.adminDb.collection("user_templates").get(),
        admin_1.adminDb.collection("payments").get(),
    ]);
    const templates = templatesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
    const payments = paymentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
exports.listAdminTemplates = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const filters = (request.data ?? {});
    const [templatesSnap, usersSnap] = await Promise.all([
        admin_1.adminDb.collection("user_templates").get(),
        admin_1.adminDb.collection("users").get(),
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
        if (filters.status && filters.status !== "all" && item.status !== filters.status)
            return false;
        if (filters.mode && filters.mode !== "all" && item.templateMode !== filters.mode)
            return false;
        if (filters.visibility === "public" && !item.isPublic)
            return false;
        if (filters.visibility === "private" && item.isPublic)
            return false;
        return includesSearch([item.title, item.ownerName, item.ownerEmail, item.shareSlug], filters.search);
    })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});
exports.listAdminPayments = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const filters = (request.data ?? {});
    const [paymentsSnap, usersSnap, templatesSnap] = await Promise.all([
        admin_1.adminDb.collection("payments").get(),
        admin_1.adminDb.collection("users").get(),
        admin_1.adminDb.collection("user_templates").get(),
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
        if (filters.status && filters.status !== "all" && item.status !== filters.status)
            return false;
        return includesSearch([item.userName, item.userEmail, item.templateTitle], filters.search);
    })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
});
exports.listAdminUsers = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const [usersSnap, templatesSnap] = await Promise.all([
        admin_1.adminDb.collection("users").get(),
        admin_1.adminDb.collection("user_templates").get(),
    ]);
    const templates = templatesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
exports.listAdminPlatformTemplates = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const snapshot = await admin_1.adminDb.collection("platform_templates").get();
    const templates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    templates.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")));
    return templates;
});
exports.togglePlatformTemplate = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const templateId = String(request.data?.templateId ?? "");
    const isActive = Boolean(request.data?.isActive);
    const ref = admin_1.adminDb.collection("platform_templates").doc(templateId);
    await ref.set({ isActive }, { merge: true });
    const snapshot = await ref.get();
    return { id: snapshot.id, ...snapshot.data() };
});
exports.updatePlatformTemplate = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const templateId = String(request.data?.templateId ?? "");
    const title = String(request.data?.title ?? "");
    const category = String(request.data?.category ?? "");
    const ref = admin_1.adminDb.collection("platform_templates").doc(templateId);
    await ref.set({ title, category }, { merge: true });
    const snapshot = await ref.get();
    return { id: snapshot.id, ...snapshot.data() };
});
exports.createPlatformTemplate = (0, https_1.onCall)({ secrets: [config_1.cloudinaryApiKey, config_1.cloudinaryApiSecret] }, async (request) => {
    await (0, admin_1.assertAdmin)(request);
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
    const uploaded = (await uploadPlatformImageToCloudinary(imageDataUrl)) ??
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
    const ref = await admin_1.adminDb.collection("platform_templates").add(payload);
    return { id: ref.id, ...payload };
});
exports.setUserTemplateVisibility = (0, https_1.onCall)(async (request) => {
    await (0, admin_1.assertAdmin)(request);
    const templateId = String(request.data?.templateId ?? "");
    const isPublic = Boolean(request.data?.isPublic);
    const ref = admin_1.adminDb.collection("user_templates").doc(templateId);
    await ref.set({
        isPublic,
        status: isPublic ? "published" : "draft",
        updatedAt: new Date().toISOString(),
    }, { merge: true });
    const snapshot = await ref.get();
    return { id: snapshot.id, ...snapshot.data() };
});
//# sourceMappingURL=adminFunctions.js.map