import { requireEvaluator } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCategory } from "@/lib/utils";
import { PageNavigation } from "@/components/admin/PageNavigation";
import { redirectToValidPage } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function AnswerKeyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireEvaluator();
  const params = await searchParams;
  const raw = Number(params.page || 1);
  const page = Number.isSafeInteger(raw) && raw > 0 ? raw : 1;
  const { data, count, error } = await createServiceClient().from("questions")
    .select("id,sort_order,category,question_text,code_snippet,options,correct_answer,points,evaluation_notes", { count: "exact" })
    .eq("is_active", true).order("sort_order").order("id").range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Could not load evaluator guidance.");
  redirectToValidPage("/admin/answer-key", params, page, count || 0);
  return <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
    <p className="text-xs uppercase tracking-[0.16em] text-violet-300">Evaluator reference</p>
    <h1 className="mt-2 text-3xl font-bold">Answer key &amp; scoring guidance</h1>
    <p className="mt-3 text-sm text-zinc-400">For the active question bank. Candidates do not receive these explanations.</p>
    <div className="mt-8 space-y-5">{(data || []).map((question) => <section key={question.id} className="rounded-2xl border border-line bg-panel/70 p-5">
      <p className="text-xs text-violet-300">{question.sort_order} · {formatCategory(question.category)} · {question.points} marks</p>
      <h2 className="mt-2 font-semibold leading-7">{question.question_text}</h2>
      {question.code_snippet && <pre className="mt-4 overflow-x-auto rounded-xl bg-black/30 p-4 text-sm"><code>{question.code_snippet}</code></pre>}
      {question.options && <ol className="mt-4 space-y-2 text-sm text-zinc-400">{(question.options as string[]).map((option, i) => <li key={i} className={option === question.correct_answer ? "font-semibold text-emerald-300" : ""}>{String.fromCharCode(65 + i)}. {option}{option === question.correct_answer && " — Correct"}</li>)}</ol>}
      <p className="mt-4 whitespace-pre-wrap break-words border-t border-line pt-4 text-sm leading-7 text-zinc-300">{question.evaluation_notes || "No scoring notes configured for this question."}</p>
    </section>)}</div>
    {!data?.length && <p className="mt-8 text-sm text-zinc-400">No active questions.</p>}
    <PageNavigation path="/admin/answer-key" params={params} page={page} count={count || 0} />
  </main>;
}
