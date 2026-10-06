"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2"><button
      disabled={loading}
      className="min-h-11 rounded-xl border border-line px-3 text-xs font-medium text-zinc-400 transition hover:bg-white/5 disabled:opacity-50"
      onClick={async () => {
        setLoading(true);
        setError("");
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          router.replace("/admin/login");
          router.refresh();
        } catch {
          setError("Could not sign out. Try again.");
        } finally { setLoading(false); }
      }}
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>{error && <span role="alert" className="text-xs text-red-300">{error}</span>}</div>
  );
}
