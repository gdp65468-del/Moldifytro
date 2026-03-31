import { defineSecret, defineString } from "firebase-functions/params";

export const asaasApiKey = defineSecret("ASAAS_API_KEY");
export const appBaseUrl = defineSecret("APP_BASE_URL");
export const asaasApiBaseUrl = defineString("ASAAS_API_BASE_URL", {
  default: "https://api.asaas.com/v3",
});
export const cloudinaryCloudName = defineString("CLOUDINARY_CLOUD_NAME", {
  default: "",
});
export const cloudinaryFolder = defineString("CLOUDINARY_FOLDER", {
  default: "moldify/platform",
});
export const cloudinaryApiKey = defineSecret("CLOUDINARY_API_KEY");
export const cloudinaryApiSecret = defineSecret("CLOUDINARY_API_SECRET");
