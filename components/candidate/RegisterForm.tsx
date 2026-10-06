"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

export function RegisterForm() {
  const router = useRouter();
  const [srn, setSrn] = useState("");
  const [fullName, setFullName] = useState("");
  const [onlineRegistration, setOnlineRegistration] = useState<"yes" | "no" | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!onlineRegistration) { setError("Choose Yes or No for online registration."); return; }
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ srn, fullName, onlineRegistrationConfirmed: onlineRegistration === "yes" }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not register. Please try again.");
        return;
      }

      router.push(data.next || "/challenge/instructions");

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
      <fieldset disabled={loading} className="border-t border-line pt-5">
        <legend className="mb-3 text-sm font-medium text-zinc-300">Have you filled the online registration form?</legend>
        <div className="flex gap-3">
          {(["yes", "no"] as const).map((value) => <label key={value} className={`flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm ${onlineRegistration === value ? "border-violet-400 bg-violet-500/10 text-violet-100" : "border-line text-zinc-300"}`}><input type="radio" name="onlineRegistration" value={value} checked={onlineRegistration === value} onChange={() => setOnlineRegistration(value)} required className="h-4 w-4 accent-violet-500" />{value === "yes" ? "Yes" : "No"}</label>)}
        </div>
        {onlineRegistration === "no" && <div className="mt-4 border-l-2 border-violet-400 pl-4 text-sm text-zinc-400"><p>Please complete the registration form too. You can still take the test now.</p><a href="https://rahulfye.github.io/appex-recruitment/" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center font-medium text-violet-300">Open registration form <span aria-hidden="true" className="ml-2">↗</span><span className="sr-only"> (opens in a new tab)</span></a></div>}
      </fieldset>
      {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Checking…" : "Continue to test"}</Button>
    </form>
  );
}
