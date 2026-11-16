/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COMING_SOON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
