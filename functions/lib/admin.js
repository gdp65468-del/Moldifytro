"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDb = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const app = (0, app_1.getApps)()[0] ?? (0, app_1.initializeApp)();
exports.adminDb = (0, firestore_1.getFirestore)(app);
//# sourceMappingURL=admin.js.map