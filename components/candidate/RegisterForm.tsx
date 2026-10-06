"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function RegisterForm() {
  const router = useRouter();
  const [srn, setSrn] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srn, fullName }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not register. Please try again.");
        return;
      }

      router.push(data.next || "/challenge/instructions");
      router.refresh();
    } catch {
      setError("Connection problem. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="srn" className="mb-2 block text-sm font-medium text-zinc-300">SRN</label>
        <Input id="srn" value={srn} onChange={(e) => setSrn(e.target.value.toUpperCase())} placeholder="SRN" autoComplete="off" autoCapitalize="characters" spellCheck={false} minLength={13} maxLength={13} required />
      </div>
      <div>
        <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-zinc-300">Full Name</label>
        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" maxLength={120} required />
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Checking…" : "Continue"}</Button>
    </form>
  );
}
