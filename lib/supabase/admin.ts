import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Usa service_role — nunca expor no cliente browser
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
