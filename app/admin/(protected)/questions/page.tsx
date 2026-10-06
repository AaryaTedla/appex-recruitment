import { PageNavigation } from "@/components/admin/PageNavigation";
import { redirectToValidPage } from "@/lib/pagination";
import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { QuestionManager, type QuestionRow } from "@/components/admin/QuestionManager";

export const dynamic = "force-dynamic";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawPage = Number(params.page || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  await requireAdmin();
  const supabase = createServiceClient();
  const [result, statsResult] = await Promise.all([
    supabase.from("questions")
      .select("id,category,type,question_text,code_snippet,options,correct_answer,points,difficulty,is_active,sort_order", { count: "exact" })
      .order("sort_order", { ascending: true }).order("id").range((page - 1) * 25, page * 25 - 1),
    supabase.rpc("appex_question_bank_stats"),
  ]);
  if (result.error || statsResult.error) throw new Error("Could not load questions.");
  redirectToValidPage("/admin/questions", params, page, result.count || 0);
  const stats = statsResult.data as { activeCount: number; activePoints: number; nextOrder: number };

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Admin · Questions</p>
      <h1 className="mt-2 text-3xl font-bold">Challenge question bank</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">The standard bank is 20 MCQs and 2 descriptive tasks, totaling 100 points. Deactivate old questions once attempts exist instead of deleting them.</p>
      <div className="mt-8"><QuestionManager key={page} questions={(result.data || []) as QuestionRow[]} stats={stats} /></div>
      <PageNavigation path="/admin/questions" params={params} page={page} count={result.count || 0} />
    </main>
  );
}
