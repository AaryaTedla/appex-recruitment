import { createServiceClient } from "@/lib/supabase/service";

export async function getTestAccess() {
  const { data, error } = await createServiceClient().from("recruitment_settings").select("test_open").eq("id", 1).single();
  if (error || !data) throw new Error("Could not load test availability.");
  return data.test_open as boolean;
}
