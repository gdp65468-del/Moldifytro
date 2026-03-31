/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRIVACY_CONTACT_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
