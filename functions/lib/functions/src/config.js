"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryApiSecret = exports.cloudinaryApiKey = exports.cloudinaryFolder = exports.cloudinaryCloudName = exports.asaasApiBaseUrl = exports.appBaseUrl = exports.asaasApiKey = void 0;
const params_1 = require("firebase-functions/params");
exports.asaasApiKey = (0, params_1.defineSecret)("ASAAS_API_KEY");
exports.appBaseUrl = (0, params_1.defineSecret)("APP_BASE_URL");
exports.asaasApiBaseUrl = (0, params_1.defineString)("ASAAS_API_BASE_URL", {
    default: "https://api.asaas.com/v3",
});
exports.cloudinaryCloudName = (0, params_1.defineString)("CLOUDINARY_CLOUD_NAME", {
    default: "",
});
exports.cloudinaryFolder = (0, params_1.defineString)("CLOUDINARY_FOLDER", {
    default: "moldify/platform",
});
exports.cloudinaryApiKey = (0, params_1.defineSecret)("CLOUDINARY_API_KEY");
exports.cloudinaryApiSecret = (0, params_1.defineSecret)("CLOUDINARY_API_SECRET");
//# sourceMappingURL=config.js.map