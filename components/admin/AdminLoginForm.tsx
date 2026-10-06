"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { isAllowedAdminEmail } from "@/lib/auth/adminAllowlist";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      if (!isAllowedAdminEmail(email)) {
        setError("This email is not authorized for APPEX access.");
        return;
      }
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !authData.user) {
        setError("Invalid evaluator credentials.");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!profile || !["evaluator", "admin"].includes(profile.role)) {
        await supabase.auth.signOut();
        setError("This account is not authorized for APPEX evaluation.");
        setLoading(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Could not connect. Please try signing in again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="email">Email</label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="password">Password</label>
        <Input id="password" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
