/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEON_POSTGRES_REST_URL?: string;
  readonly VITE_NEON_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
