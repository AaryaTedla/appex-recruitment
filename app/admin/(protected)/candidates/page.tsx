import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireEvaluator } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { formatScore } from "@/lib/utils";
import { PageNavigation } from "@/components/admin/PageNavigation";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireEvaluator();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const evaluation = typeof params.evaluation === "string" ? params.evaluation : "all";
  const shortlist = typeof params.shortlist === "string" ? params.shortlist : "all";
  const minScoreRaw = typeof params.minScore === "string" ? params.minScore : "";
  const minScore = minScoreRaw === "" ? null : Math.max(0, Math.min(100, Number(minScoreRaw)));
  const rawPage = Number(params.page || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const supabase = createServiceClient();
  let query = supabase
    .from("candidate_review_rows")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  const safeSearch = q.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  if (safeSearch) query = query.or(`srn.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`);
  if (status !== "all") query = query.eq("status", status);
  if (evaluation === "evaluated") query = query.eq("evaluated", true);
  if (evaluation === "pending") query = query.eq("evaluated", false).in("attempt_status", ["submitted", "time_expired"]);
  if (shortlist !== "all") query = query.eq("shortlisted", shortlist === "shortlisted");
  if (minScore != null && Number.isFinite(minScore)) query = query.gte("effective_score", minScore);
  const { data, count, error } = await query.range((page - 1) * 50, page * 50 - 1);
  if (error) throw new Error("Could not load candidates.");
  const candidates = data || [];

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Candidates</p>
      <h1 className="mt-2 text-3xl font-bold">Review recruitment attempts</h1>

      <Card className="mt-7 p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <input aria-label="Search name or SRN" name="q" defaultValue={q} placeholder="Search name or SRN" className="min-h-11 rounded-xl border border-line bg-black/20 px-4 text-sm text-zinc-100 placeholder:text-zinc-600" />
          <select aria-label="Candidate status" name="status" defaultValue={status} className="min-h-11 rounded-xl border border-line bg-panel px-3 text-sm text-zinc-300">
            <option value="all">All statuses</option><option value="registered">Registered</option><option value="in_progress">In progress</option><option value="submitted">Submitted</option>
          </select>
          <select aria-label="Evaluation status" name="evaluation" defaultValue={evaluation} className="min-h-11 rounded-xl border border-line bg-panel px-3 text-sm text-zinc-300">
            <option value="all">All evaluations</option><option value="pending">Pending</option><option value="evaluated">Evaluated</option>
          </select>
          <select aria-label="Shortlist status" name="shortlist" defaultValue={shortlist} className="min-h-11 rounded-xl border border-line bg-panel px-3 text-sm text-zinc-300">
            <option value="all">All recommendations</option><option value="shortlisted">Shortlisted</option><option value="not_shortlisted">Not shortlisted</option>
          </select>
          <input aria-label="Minimum score" name="minScore" defaultValue={minScoreRaw} type="number" min="0" max="100" step="1" placeholder="Min score" className="min-h-11 w-full rounded-xl border border-line bg-black/20 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 xl:w-28" />
          <button className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold">Filter</button>
        </form>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-black/20 text-xs uppercase tracking-wider text-zinc-600">
              <tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">SRN</th><th className="px-5 py-4">Score</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Evaluation</th><th className="px-5 py-4">Recommendation</th><th className="px-5 py-4">Integrity</th><th className="px-5 py-4"></th></tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => {
                return (
                  <tr key={candidate.id} className="border-b border-line/70 last:border-b-0 hover:bg-white/[0.025]">
                    <td className="px-5 py-4 font-medium text-zinc-100">{candidate.full_name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">{candidate.srn}</td>
                    <td className="px-5 py-4 font-mono">{formatScore(candidate.final_score ?? candidate.objective_score)}</td>
                    <td className="px-5 py-4 text-zinc-400">{candidate.status}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${candidate.evaluated ? "bg-emerald-500/10 text-emerald-200" : "bg-white/5 text-zinc-400"}`}>{candidate.evaluated ? "Evaluated" : ["submitted", "time_expired"].includes(candidate.attempt_status) ? "Pending" : "—"}</span></td>
                    <td className="px-5 py-4 text-zinc-400">{candidate.recommendation || "—"}</td>
                    <td className="px-5 py-4 text-zinc-400">{candidate.integrity_count || 0}</td>
                    <td className="px-5 py-4 text-right"><Link aria-label={`Open candidate ${candidate.full_name}`} href={`/admin/candidates/${candidate.id}`} className="inline-flex min-h-11 items-center px-2 font-semibold text-violet-300 hover:text-violet-200">Open</Link></td>
                  </tr>
                );
              })}
              {candidates.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-zinc-500">No candidates match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <PageNavigation path="/admin/candidates" params={params} page={page} count={count || 0} />
    </main>
  );
}
