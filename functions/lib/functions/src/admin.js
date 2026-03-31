"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = void 0;
exports.assertAdmin = assertAdmin;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const app = (0, app_1.getApps)()[0] ?? (0, app_1.initializeApp)();
exports.adminDb = (0, firestore_1.getFirestore)(app);
async function assertAdmin(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login necessario.");
    }
    const access = await exports.adminDb.collection("admin_access").doc(request.auth.uid).get();
    if (!access.exists || access.data()?.active !== true) {
        throw new https_1.HttpsError("permission-denied", "Acesso admin necessario.");
    }
    return request.auth.uid;
}
//# sourceMappingURL=admin.js.map