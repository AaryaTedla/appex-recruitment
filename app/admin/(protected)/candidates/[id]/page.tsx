import { expireAttempts } from "@/lib/expireAttempts";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EvaluationForm } from "@/components/admin/EvaluationForm";
import { requireEvaluator } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCategory, formatScore } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEvaluator();
  await expireAttempts();
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const supabase = createServiceClient();

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("id,srn,full_name,status,created_at,online_registration_confirmed,attempts(id,status,started_at,submitted_at,objective_score,final_score,answers(id,answer_text,auto_score,manual_score,questions(id,category,type,question_text,code_snippet,points,sort_order),answer_evaluations(criteria,comments)),evaluations(id,score,comments,recommendation,evaluator_id,updated_at),integrity_events(id,event_type,created_at))")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Could not load candidate details.");
  if (!candidate) notFound();
  // Supabase returns this one-to-one relationship as an object at runtime,
  // while the untyped client declaration describes it as an array.
  const attempt = Array.isArray(candidate.attempts) ? candidate.attempts[0] : candidate.attempts;
  if (!attempt) notFound();

  const answers = (attempt.answers || [])
    .map((answer) => ({
      ...answer,
      question: Array.isArray(answer.questions) ? answer.questions[0] : answer.questions,
      answer_evaluation: Array.isArray(answer.answer_evaluations) ? answer.answer_evaluations[0] : answer.answer_evaluations,
    }))
    .filter((answer) => answer.question)
    .sort((a, b) => a.question.sort_order - b.question.sort_order);

  const objectiveTypes = new Set(["mcq", "scenario_mcq", "true_false", "code_output"]);
  const objectiveMax = answers.reduce((sum: number, answer) => sum + (objectiveTypes.has(answer.question.type) ? Number(answer.question.points || 0) : 0), 0);
  const categoryScores: Record<string, number> = {};
  const categoryMax: Record<string, number> = {};
  for (const answer of answers) {
    categoryMax[answer.question.category] = (categoryMax[answer.question.category] || 0) + Number(answer.question.points);
    categoryScores[answer.question.category] = (categoryScores[answer.question.category] || 0) + Number(answer.auto_score || 0) + Number(answer.manual_score || 0);
  }
  const evaluation = Array.isArray(attempt.evaluations) ? attempt.evaluations[0] : attempt.evaluations;

  const { data: nextCandidate, error: nextError } = await supabase.from("candidate_review_rows")
    .select("id").eq("evaluated", false).in("attempt_status", ["submitted", "time_expired"])
    .neq("id", id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (nextError) throw new Error("Could not load the evaluation queue.");

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link href="/admin/candidates" className="mb-6 inline-flex min-h-11 items-center text-sm font-medium text-violet-300 hover:text-violet-200">← All candidates</Link>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Candidate</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{candidate.full_name}</h1>
          <p className="mt-2 font-mono text-sm text-zinc-500">{candidate.srn}</p>
        </div>
        <div className="text-right text-sm text-zinc-400">
          <div>Status: <strong className="text-zinc-100">{attempt.status === "time_expired" ? "time_expired" : candidate.status}</strong></div>
          <div className="mt-1">Online form: <strong className="text-zinc-100">{candidate.online_registration_confirmed == null ? "Unknown" : candidate.online_registration_confirmed ? "Yes" : "No"}</strong> <span className="text-xs">(self-reported)</span></div>
          <div className="mt-1">Objective score: <strong className="text-zinc-100">{formatScore(attempt.objective_score)} / {formatScore(objectiveMax)}</strong></div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(categoryMax).map(([category, max]) => (
          <Card key={category} className="p-4">
            <div className="text-xs leading-5 text-zinc-500">{formatCategory(category)}</div>
            <div className="mt-2 text-xl font-bold">{formatScore(categoryScores[category] || 0)} <span className="text-sm font-normal text-zinc-600">/ {max}</span></div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Integrity events</h2>
            <p className="mt-1 text-sm text-zinc-500">These are review signals, not automatic disqualifications.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${attempt.integrity_events?.length >= 3 ? "bg-amber-500/10 text-amber-300" : "bg-white/5 text-zinc-400"}`}>{attempt.integrity_events?.length || 0} events</span>
        </div>
        {attempt.integrity_events?.length > 0 && (
          <div className="mt-4 space-y-2 text-sm text-zinc-400">
            {attempt.integrity_events.map((event) => <div key={event.id}>{event.event_type.replaceAll("_", " ")} — {new Date(event.created_at).toLocaleTimeString("en-IN")}</div>)}
          </div>
        )}
      </Card>

      <div className="mt-10">
        {attempt.status === "in_progress" ? <Card className="p-6"><h2 className="font-semibold">Challenge in progress</h2><p className="mt-2 text-sm text-zinc-400">Evaluation becomes available after the candidate submits.</p></Card> : <EvaluationForm key={attempt.id} attemptId={attempt.id} answers={answers} existingEvaluation={evaluation} nextCandidateId={nextCandidate?.id} />}
      </div>
    </main>
  );
}
