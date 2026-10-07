import { expireAttempts } from "@/lib/expireAttempts";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { createServiceClient } from "@/lib/supabase/service";
import { requireEvaluator } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireEvaluator();
  await expireAttempts();
  const supabase = createServiceClient();

  const results = await Promise.all([
    supabase.from("candidates").select("id", { count: "exact", head: true }),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("candidates").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("evaluations").select("id", { count: "exact", head: true }).in("recommendation", ["Strongly Shortlist", "Shortlist"]),
    supabase.from("candidate_review_rows").select("id", { count: "exact", head: true }).eq("evaluated", false).in("attempt_status", ["submitted", "time_expired"]),
  ]);
  if (results.some((result) => result.error)) throw new Error("Could not load recruitment metrics.");
  const [{ count: total }, { count: completed }, { count: inProgress }, { count: shortlisted }, { count: pending }] = results;
  const metrics = [
    ["Total Candidates", total || 0],
    ["Completed", completed || 0],
    ["In Progress", inProgress || 0],
    ["Pending Evaluation", pending || 0],
    ["Shortlisted", shortlisted || 0],
  ];

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Overview</p>
          <h1 className="mt-2 text-3xl font-bold">Recruitment dashboard</h1>
        </div>
        <Link href="/admin/candidates" className="text-sm font-semibold text-violet-300 hover:text-violet-200">Review candidates →</Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <Card key={String(label)} className="p-5">
            <div className="text-3xl font-black">{value}</div>
            <div className="mt-2 text-xs leading-5 text-zinc-500">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="font-semibold">Evaluation principles</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">Use technical answers as one signal, not the whole decision. Look for reasoning, practicality, creativity, communication, adaptability, teamwork, and whether the candidate explains how they would learn when they do not know something.</p>
      </Card>
    </main>
  );
}
