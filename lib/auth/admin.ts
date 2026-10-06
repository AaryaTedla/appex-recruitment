import { redirect } from "next/navigation";
import { timed } from "@/lib/performance";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAllowedAdminEmail } from "@/lib/auth/adminAllowlist";
import type { UserRole } from "@/types";

// Share identity checks between the layout and page within this render only.
export const getAdminIdentity = cache(async function getAdminIdentity() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await timed("page authentication", () => supabase.auth.getUser());

  if (!user || !isAllowedAdminEmail(user.email)) return null;

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile || !["evaluator", "admin"].includes(profile.role)) return null;

  return {
    user,
    role: profile.role as UserRole,
  };
});

export async function requireEvaluator() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/admin/login");
  return identity;
}

export async function requireAdmin() {
  const identity = await requireEvaluator();
  if (identity.role !== "admin") redirect("/admin?unauthorized=1");
  return identity;
}

export async function hasApiRole(roles: UserRole[]) {
  const identity = await getAdminIdentity();
  if (!identity || !roles.includes(identity.role)) return null;
  return identity;
}
