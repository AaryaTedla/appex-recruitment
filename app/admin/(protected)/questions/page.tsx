import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { QuestionManager, type QuestionRow } from "@/components/admin/QuestionManager";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id,category,type,question_text,code_snippet,options,correct_answer,points,difficulty,is_active,sort_order")
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Could not load questions.");

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Admin · Questions</p>
      <h1 className="mt-2 text-3xl font-bold">Challenge question bank</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-500">Keep the active set at roughly 14 questions and 100 total points. Deactivate old questions once attempts exist instead of deleting them.</p>
      <div className="mt-8"><QuestionManager questions={(data || []) as QuestionRow[]} /></div>
    </main>
  );
}
