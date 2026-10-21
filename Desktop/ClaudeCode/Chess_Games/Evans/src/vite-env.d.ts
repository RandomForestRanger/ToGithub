/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to 1 at build time to expose window.__ctl / __engine for tools/smoke.mjs. */
  readonly VITE_SMOKE?: string;
}
