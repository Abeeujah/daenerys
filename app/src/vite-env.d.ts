/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VERIFIER_ADDRESS: string;
  readonly VITE_PAYMENT_ADDRESS: string;
  readonly VITE_TOKEN_ADDRESS: string;
  readonly VITE_DEVNET_ACCOUNT_ADDRESS: string;
  readonly VITE_DEVNET_PRIVATE_KEY: string;
  readonly VITE_RPC_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
