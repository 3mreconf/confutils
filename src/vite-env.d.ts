
interface ImportMetaEnv {
  readonly VITE_AUTH_ENCRYPTION_KEY: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}