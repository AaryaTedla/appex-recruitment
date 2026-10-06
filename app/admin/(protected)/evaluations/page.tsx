import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireEvaluator } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { PageNavigation } from "@/components/admin/PageNavigation";

export const dynamic = "force-dynamic";

export default async function EvaluationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireEvaluator();
  const supabase = createServiceClient();
  const params = await searchParams;
  const rawPage = Number(params.page || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const { data, count, error } = await supabase
    .from("candidate_review_rows")
    .select("id,srn,full_name,evaluated,recommendation,submitted_at", { count: "exact" })
    .in("attempt_status", ["submitted", "time_expired"])
    .order("submitted_at", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Could not load submitted attempts.");

  const rows = data || [];
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Evaluations</p>
      <h1 className="mt-2 text-3xl font-bold">Submitted attempts</h1>
      <Card className="mt-7 overflow-hidden">
        {rows.length === 0 ? <div className="px-6 py-12 text-center text-sm text-zinc-500">No submitted attempts yet.</div> : (
          <div className="divide-y divide-line">
            {rows.map((row) => {
              return (
                <div key={row.id} className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-white/[0.025]">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{row.full_name}</div>
                    <div className="mt-1 font-mono text-xs text-zinc-600">{row.srn}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-medium ${row.evaluated ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>{row.evaluated ? "Evaluated" : "Pending"}</div>
                  <div className="w-40 text-sm text-zinc-500">{row.recommendation || "—"}</div>
                  <Link href={`/admin/candidates/${row.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-300">Review →</Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <PageNavigation path="/admin/evaluations" params={params} page={page} count={count || 0} />
    </main>
  );
}
