// Backend-free data client. The app was built against the Base44 SDK surface
// (`base44.entities.X`, `base44.integrations.Core.UploadFile`, `base44.auth`).
// This module provides that exact surface, backed by either:
//   - Supabase (shared cloud database + Storage) when VITE_SUPABASE_URL and
//     VITE_SUPABASE_ANON_KEY are configured, or
//   - the browser's IndexedDB (local, per-device) otherwise.
// The rest of the app is unaware of which backend is in use.

import { authStub } from "./entityStore";
import { createLocalBackend } from "./localBackend";
import { createSupabaseBackend, isSupabaseConfigured } from "./supabaseBackend";

const backend = isSupabaseConfigured ? createSupabaseBackend() : createLocalBackend();

export const usingSupabase = isSupabaseConfigured;

export const base44 = {
  entities: backend.entities,
  integrations: backend.integrations,
  auth: authStub,
};
