import { timedServiceFetch } from "@/lib/performance";
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, key, {
    global: { fetch: timedServiceFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
