export const PRIVACY_EFFECTIVE_DATE = "31 de março de 2026";
export const COOKIE_NOTICE_STORAGE_KEY = "moldify_cookie_notice_v1";
export const PRIVACY_CONTACT_EMAIL = import.meta.env.VITE_PRIVACY_CONTACT_EMAIL?.trim() || "";

export function getPrivacyContactLabel() {
  return PRIVACY_CONTACT_EMAIL || "o canal oficial de atendimento informado pelo responsavel pelo app";
}
