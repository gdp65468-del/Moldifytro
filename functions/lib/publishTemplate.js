"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishTemplate = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const helpers_1 = require("./helpers");
exports.publishTemplate = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login necessario.");
    }
    const templateId = String(request.data?.templateId ?? "");
    if (!templateId) {
        throw new https_1.HttpsError("invalid-argument", "templateId obrigatorio.");
    }
    const templateRef = admin_1.adminDb.collection("user_templates").doc(templateId);
    const templateSnapshot = await templateRef.get();
    if (!templateSnapshot.exists) {
        throw new https_1.HttpsError("not-found", "Template nao encontrado.");
    }
    const template = templateSnapshot.data();
    if (template?.ownerId !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Template pertence a outro usuario.");
    }
    const payments = await admin_1.adminDb
        .collection("payments")
        .where("templateId", "==", templateId)
        .where("userId", "==", request.auth.uid)
        .where("status", "==", "approved")
        .limit(1)
        .get();
    if (payments.empty) {
        throw new https_1.HttpsError("failed-precondition", "Pagamento ainda nao aprovado.");
    }
    const slugBase = (0, helpers_1.buildSlug)(String(template?.title ?? "template"));
    let slug = slugBase;
    for (let attempt = 0; attempt < 12; attempt += 1) {
        const existing = await admin_1.adminDb
            .collection("user_templates")
            .where("shareSlug", "==", slug)
            .limit(1)
            .get();
        if (existing.empty || existing.docs[0]?.id === templateId) {
            break;
        }
        slug = (0, helpers_1.buildSlug)(String(template?.title ?? "template"), Math.random().toString(36).slice(2, 6));
    }
    const published = {
        ...template,
        status: "published",
        isPublic: true,
        publishUnlocked: true,
        shareSlug: slug,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pricePaid: 5.9,
    };
    await templateRef.set(published, { merge: true });
    return {
        template: {
            id: templateId,
            ...published,
        },
    };
});
//# sourceMappingURL=publishTemplate.js.map