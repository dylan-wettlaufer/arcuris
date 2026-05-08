import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseConfig, getSupabaseServiceRoleKey } from "./env";

export function createAdminClient() {
  const { url } = getPublicSupabaseConfig();

  return createClient(url, getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
