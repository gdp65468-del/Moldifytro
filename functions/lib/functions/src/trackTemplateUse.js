"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackTemplateUse = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
exports.trackTemplateUse = (0, https_1.onCall)(async (request) => {
    const templateId = String(request.data?.templateId ?? "");
    const usedBy = String(request.data?.usedBy ?? "anonymous");
    const action = request.data?.action === "view" ? "view" : "download";
    if (!templateId) {
        return;
    }
    const templateRef = admin_1.adminDb.collection("user_templates").doc(templateId);
    const templateSnapshot = await templateRef.get();
    if (templateSnapshot.exists) {
        const template = templateSnapshot.data();
        await templateRef.set({
            viewsCount: Number(template?.viewsCount ?? 0) + (action === "view" ? 1 : 0),
            downloadsCount: Number(template?.downloadsCount ?? 0) + (action === "download" ? 1 : 0),
            usesCount: Number(template?.usesCount ?? 0) + (action === "download" ? 1 : 0),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    }
    await admin_1.adminDb.collection("template_uses").add({
        templateId,
        usedBy,
        action,
        createdAt: new Date().toISOString(),
    });
});
//# sourceMappingURL=trackTemplateUse.js.map