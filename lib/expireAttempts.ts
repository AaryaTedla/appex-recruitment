import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/service";

// Once per server render; no cross-request cache of mutable attempt state.
export const expireAttempts = cache(async () => {
  const { error } = await createServiceClient().rpc("expire_appex_attempts");
  if (error) throw new Error("Could not finalize expired attempts.");
});
