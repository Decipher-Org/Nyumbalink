/// <reference types="vite/client" />

/**
 * Typed build-time configuration.
 *
 * Everything here ships to the browser in plain text — a `VITE_*` variable is
 * public by definition. API base URLs are fine; secrets (the Resend key, the
 * Better Auth secret, database URLs) belong to the backend's own `.env` and must
 * never appear in this file or any `VITE_*` value.
 */
interface ImportMetaEnv {
  /** Backend origin, no trailing slash. Defaults to http://localhost:8080. */
  readonly VITE_API_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
