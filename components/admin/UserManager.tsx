"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

type AdminUser = {
  id: string;
  email: string;
  role: "admin" | "evaluator" | null;
  created_at: string;
  isCurrentUser: boolean;
};

export function UserManager({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "evaluator">("evaluator");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Could not create evaluator account.");
        setState("error");
        return;
      }
      setEmail("");
      setPassword("");
      setRole("evaluator");
      setState("idle");
      router.refresh();
    } catch {
      setMessage("Connection problem. Please try again.");
      setState("error");
    }
  }

  async function changeRole(userId: string, nextRole: "admin" | "evaluator") {
    setState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Could not update role.");
        setState("error");
        return;
      }
      setState("idle");
      router.refresh();
    } catch {
      setMessage("Connection problem. Please try again.");
      setState("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <form onSubmit={createUser} className="h-fit rounded-2xl border border-line bg-panel/80 p-5">
        <h2 className="font-semibold">Create an allowed account</h2>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Access is restricted to the five approved APPEX email addresses. Manage passwords in Supabase Authentication.</p>
        <div className="mt-5 space-y-4">
          <label className="block text-xs text-zinc-500">Email<Input className="mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="block text-xs text-zinc-500">Temporary password<Input className="mt-2" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label className="block text-xs text-zinc-500">Role
            <select className="mt-2 min-h-12 w-full rounded-xl border border-line bg-panel px-3 text-sm" value={role} onChange={(event) => setRole(event.target.value as "admin" | "evaluator")}>
              <option value="evaluator">Evaluator</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {message && <p role="alert" className={`text-sm ${state === "error" ? "text-red-300" : "text-zinc-400"}`}>{message}</p>}
          <Button type="submit" className="w-full" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Create Account"}</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel/60">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">Evaluator access</h2>
          <p className="mt-1 text-xs text-zinc-500">Only approved email addresses with an APPEX role can enter the dashboard.</p>
        </div>
        <div className="divide-y divide-line">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-200">{user.email}</div>
                <div className="mt-1 text-xs text-zinc-600">Created {new Date(user.created_at).toLocaleDateString("en-IN")}{user.isCurrentUser ? " · You" : ""}</div>
              </div>
              {user.role ? (
                <select
                  aria-label={`Role for ${user.email}`}
                  disabled={user.isCurrentUser || state === "saving"}
                  value={user.role}
                  onChange={(event) => void changeRole(user.id, event.target.value as "admin" | "evaluator")}
                  className="min-h-11 rounded-xl border border-line bg-panel px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="evaluator">Evaluator</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <button disabled={state === "saving"} onClick={() => void changeRole(user.id, "evaluator")} className="min-h-11 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-white/5">Grant evaluator</button>
              )}
            </div>
          ))}
          {users.length === 0 && <div className="px-5 py-10 text-center text-sm text-zinc-500">No Supabase Auth users found.</div>}
        </div>
      </div>
    </div>
  );
}
