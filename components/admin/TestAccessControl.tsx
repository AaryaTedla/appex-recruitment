"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function TestAccessControl({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function toggle() {
    if (open && !window.confirm("Close new registrations and test starts? Applicants already taking the test can finish.")) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/admin/test-access", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ open: !open }), signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setOpen(body.open); router.refresh();
    } catch { setError("Could not update availability. Refresh to check the current status, then retry."); }
    finally { setPending(false); }
  }
  return <section className="mt-7 rounded-2xl border border-line bg-panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="font-semibold">Test access: {open ? "Open" : "Closed"}</h2><p className="mt-2 text-sm text-zinc-400">Closing blocks new registrations and starts. Applicants already started can finish.</p></div>
      <Button variant={open ? "danger" : "primary"} disabled={pending} onClick={() => void toggle()}>{pending ? "Saving…" : open ? "Close test" : "Reopen test"}</Button>
    </div>{error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>;
}
