import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { UserManager } from "@/components/admin/UserManager";
import { ADMIN_EMAILS, isAllowedAdminEmail } from "@/lib/auth/adminAllowlist";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const identity = await requireAdmin();
  const supabase = createServiceClient();
  const [{ data: authData, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabase.from("profiles").select("id,role"),
  ]);
  if (authError || profileError) throw new Error("Could not load evaluator accounts.");
  const authUsers = authData.users.filter((user) => isAllowedAdminEmail(user.email));
  let page = 2;
  let hasMore = authData.users.length === 200;
  while (hasMore && authUsers.length < ADMIN_EMAILS.size) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("Could not load evaluator accounts.");
    authUsers.push(...data.users.filter((user) => isAllowedAdminEmail(user.email)));
    hasMore = data.users.length === 200;
    page += 1;
  }

  const roleById = new Map((profiles || []).map((profile) => [profile.id, profile.role]));
  const users = authUsers.map((user) => ({
    id: user.id,
    email: user.email || "No email",
    role: (roleById.get(user.id) || null) as "admin" | "evaluator" | null,
    created_at: user.created_at,
    isCurrentUser: user.id === identity.user.id,
  }));

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Admin · Users</p>
      <h1 className="mt-2 text-3xl font-bold">Evaluator accounts</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">Create club evaluator accounts and control which authenticated users receive evaluator or admin access.</p>
      <div className="mt-8"><UserManager users={users} /></div>
    </main>
  );
}
