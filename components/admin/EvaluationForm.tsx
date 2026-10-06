"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { formatCategory, formatScore } from "@/lib/utils";
import Link from "next/link";
import { ratingToMarks, roundScore } from "@/lib/scoring/rating";
import { RECOMMENDATIONS } from "@/lib/scoring";

type Answer = {
  id: string;
  answer_text: string;
  auto_score: number | null;
  manual_score: number | null;
  question: {
    id: string;
    category: string;
    type: string;
    question_text: string;
    code_snippet: string | null;
    points: number;
  };
  answer_evaluation?: {
    criteria: Record<string, number> | null;
    comments: string | null;
  } | null;
};

type ExistingEvaluation = {
  score: number | null;
  comments: string | null;
  recommendation: string | null;
} | null;

type DraftItem = {
  manualScore: string;
  comments: string;
  criteria: Record<string, number>;
};

type EvaluationDraft = Record<string, DraftItem>;

export function EvaluationForm({ attemptId, answers, existingEvaluation, nextCandidateId }: { attemptId: string; answers: Answer[]; existingEvaluation: ExistingEvaluation; nextCandidateId?: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<EvaluationDraft>(() => Object.fromEntries(answers.map((answer) => [answer.id, {
    manualScore: answer.manual_score == null ? "" : String(answer.manual_score),
    comments: answer.answer_evaluation?.comments || "",
    criteria: answer.answer_evaluation?.criteria || {},
  }])) as EvaluationDraft);
  const [comments, setComments] = useState(existingEvaluation?.comments || "");
  const [recommendation, setRecommendation] = useState(existingEvaluation?.recommendation || "Maybe");
  const automaticTotal = useMemo(() => answers.reduce((sum, answer) => sum + Number(answer.auto_score || 0), 0), [answers]);
  const manualTotal = useMemo(() => roundScore(Object.values(draft as EvaluationDraft).reduce<number>((sum, item) => sum + (Number(item.manualScore) || 0), 0)), [draft]);
  const [finalScore, setFinalScore] = useState(String(existingEvaluation?.score ?? Math.min(100, roundScore(automaticTotal + manualTotal))));
  const [scoreOverride, setScoreOverride] = useState(existingEvaluation?.score != null && Number(existingEvaluation.score) !== Math.min(100, roundScore(automaticTotal + manualTotal)));
  const displayedScore = scoreOverride ? finalScore : String(Math.min(100, roundScore(automaticTotal + manualTotal)));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const descriptive = answers.filter((answer) => !["mcq", "scenario_mcq", "true_false", "code_output"].includes(answer.question.type));

  function updateAnswer(answerId: string, patch: Partial<DraftItem>) {
    setDraft((previous) => ({ ...previous, [answerId]: { ...previous[answerId], ...patch } }));
    setState("idle");
  }

  async function save(goNext = false) {
    const invalid = descriptive.find((answer) => {
      const value = draft[answer.id].manualScore;
      return !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > answer.question.points;
    });
    if (invalid) {
      setError("Choose a score for every open response. Use No credit for unanswered or incorrect responses.");
      setState("error");
      document.getElementById(`manual-${invalid.id}`)?.focus();
      return;
    }
    if (scoreOverride && !comments.trim()) {
      setError("Explain the score override in the overall comment.");
      setState("error");
      return;
    }
    if (!displayedScore.trim() || !Number.isFinite(Number(displayedScore)) || Number(displayedScore) < 0 || Number(displayedScore) > 100) {
      setError("Enter a final score between 0 and 100.");
      setState("error");
      return;
    }
    setState("saving");
    setError("");
    try {
      const response = await fetch(`/api/admin/candidates/${attemptId}/evaluation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answerEvaluations: descriptive.map((answer) => ({
            answerId: answer.id,
            manualScore: Number(draft[answer.id].manualScore || 0),
            comments: draft[answer.id].comments,
            criteria: draft[answer.id].criteria,
          })),
          finalScore: Number(displayedScore),
          comments,
          recommendation,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save evaluation.");
      setState("saved");
      if (goNext) router.push(nextCandidateId ? `/admin/candidates/${nextCandidateId}` : "/admin/evaluations");
      else router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Connection problem. Please try again.");
      setState("error");
    }
  }

  return (
    <fieldset disabled={state === "saving"} className="min-w-0 space-y-8">
      <div>
        <h2 className="text-xl font-bold">Candidate answers</h2>
        <p className="mt-2 text-sm text-zinc-500">Choose a score for each open response, then a recommendation. Objective answers are already scored.</p>
        <Link href="/admin/answer-key" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm text-violet-300">Answer key &amp; scoring guidance ↗<span className="sr-only"> (opens in a new tab)</span></Link>
      </div>

      <div className="rounded-2xl border border-line bg-panel/70 p-5" aria-live="polite">
        <p className="text-sm text-zinc-400">{descriptive.filter((answer) => draft[answer.id].manualScore.trim() !== "").length} of {descriptive.length} open responses marked</p>
        <p className="mt-2 text-2xl font-bold">{displayedScore} <span className="text-sm font-normal text-zinc-400">/ 100 total</span></p>
        <p className="mt-1 text-xs text-zinc-400">Objective: {automaticTotal} · Manual: {manualTotal}</p>
      </div>
      {answers.filter((answer) => descriptive.includes(answer)).map((answer, index) => {
        const item = draft[answer.id];
        return (
          <section key={answer.id} className="rounded-2xl border border-line bg-panel/70 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{index + 1}. {formatCategory(answer.question.category)}</p>
                <h3 className="mt-2 font-semibold leading-7 text-zinc-100">{answer.question.question_text}</h3>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">{answer.question.points} pts</span>
            </div>
            {answer.question.code_snippet && <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-sm text-zinc-300"><code>{answer.question.code_snippet}</code></pre>}
            <div className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-line bg-black/20 p-4 text-sm leading-6 text-zinc-300">
              {answer.answer_text || <span className="text-zinc-600">No answer</span>}
            </div>

            <div className="mt-5 border-t border-line pt-5">
                <fieldset id={`manual-${answer.id}`} tabIndex={-1}>
                  <legend className="mb-3 text-sm font-medium text-zinc-300">Score / 10</legend>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
                      const marks = ratingToMarks(rating, answer.question.points);
                      const selected = item.manualScore !== "" && Number(item.manualScore) === marks;
                      return <button type="button" key={rating} disabled={Number(answer.question.points) === 0} aria-label={`Score ${rating} of 10 for response ${index + 1}`} aria-pressed={selected} onClick={() => updateAnswer(answer.id, { manualScore: String(marks) })} className={`grid h-11 w-11 place-items-center rounded-lg border text-sm font-semibold disabled:opacity-40 ${selected ? "border-violet-400 bg-violet-600 text-white" : "border-line text-zinc-300 hover:bg-white/5"}`}>{rating}</button>;
                    })}
                    <button type="button" aria-label={`No credit for response ${index + 1}`} aria-pressed={item.manualScore !== "" && Number(item.manualScore) === 0} onClick={() => updateAnswer(answer.id, { manualScore: "0" })} className={`min-h-11 rounded-lg border px-3 text-sm ${item.manualScore !== "" && Number(item.manualScore) === 0 ? "border-violet-400 bg-violet-600 text-white" : "border-line text-zinc-300 hover:bg-white/5"}`}>No credit (0)</button>
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{item.manualScore === "" ? "Not scored yet" : `${formatScore(Number(item.manualScore))} / ${formatScore(Number(answer.question.points))} marks`}{Number(answer.question.points) !== 10 && " · Rating is scaled to this question’s point value."}</p>
                </fieldset>
                <details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm text-zinc-400">Add an answer note (optional)</summary>
                <label htmlFor={`comments-${answer.id}`} className="mt-5 block text-xs font-medium text-zinc-500">Answer comments</label>
                <Textarea id={`comments-${answer.id}`} maxLength={2000} rows={3} className="mt-2" value={item.comments} onChange={(e) => updateAnswer(answer.id, { comments: e.target.value })} placeholder="Optional evaluator note…" />
                </details>
            </div>
          </section>
        );
      })}

      <details className="rounded-2xl border border-line bg-panel/70 p-5">
        <summary className="min-h-11 cursor-pointer text-sm text-zinc-300">View auto-scored answers ({answers.length - descriptive.length})</summary>
        <div className="mt-3 space-y-5">{answers.filter((answer) => !descriptive.includes(answer)).map((answer) => <div key={answer.id} className="border-t border-line pt-4"><h3 className="font-medium">{answer.question.question_text}</h3>{answer.question.code_snippet && <pre className="mt-2 overflow-x-auto text-sm"><code>{answer.question.code_snippet}</code></pre>}<p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-400">{answer.answer_text || "No answer"}</p><p className="mt-2 text-sm">{answer.auto_score ?? 0} / {answer.question.points} marks</p></div>)}</div>
      </details>
      <section className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] p-5 sm:p-6">
        <h2 className="text-xl font-bold">Final evaluation</h2>
        <p className="mt-2 text-sm text-zinc-400">Total: {displayedScore} / 100</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p id="recommendation-label" className="mb-2 block text-sm font-medium text-zinc-300">Final recommendation</p>
            <div role="group" aria-labelledby="recommendation-label" className="grid grid-cols-2 gap-2">
              {RECOMMENDATIONS.map((option) => <button type="button" key={option} aria-pressed={recommendation === option} onClick={() => { setRecommendation(option); setState("idle"); }} className={`min-h-12 rounded-xl border px-3 text-sm ${recommendation === option ? "border-violet-400 bg-violet-600 text-white" : "border-line bg-panel text-zinc-300"}`}>{option}</button>)}
            </div>
          </div>
          <details open={scoreOverride}>
            <summary className="min-h-11 cursor-pointer text-sm text-zinc-400">Advanced: override total</summary>
            <label htmlFor="final-score" className="mb-2 block text-sm font-medium text-zinc-300">Final score / 100</label>
            <input id="final-score" type="number" min={0} max={100} step="0.5" value={displayedScore} onChange={(e) => { setScoreOverride(true); setFinalScore(e.target.value); setState("idle"); }} className="min-h-12 w-full rounded-xl border border-line bg-black/20 px-4 text-sm" />
            <p className="mt-1 text-xs text-zinc-600">Current answer total: {automaticTotal + manualTotal} / 100</p>
            {scoreOverride && <button type="button" onClick={() => { setScoreOverride(false); setState("idle"); }} className="min-h-11 text-xs font-medium text-violet-300">Use answer total</button>}
          </details>
        </div>
        <label htmlFor="evaluation-comments" className="mt-5 block text-sm font-medium text-zinc-300">Overall comment {scoreOverride ? "(explain override)" : "(optional)"}</label>
        <Textarea id="evaluation-comments" maxLength={5000} className="mt-2" rows={3} value={comments} onChange={(e) => { setComments(e.target.value); setState("idle"); }} placeholder="Overall reasoning, strengths, concerns, and context…" />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => void save()} disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save evaluation"}</Button>
          <Button onClick={() => void save(true)} disabled={state === "saving"}>Save &amp; {nextCandidateId ? "next candidate" : "finish"}</Button>
          {state === "saved" && <span role="status" className="text-sm text-emerald-300">Evaluation saved</span>}
          {state === "error" && <span role="alert" className="text-sm text-red-300">{error}</span>}
        </div>
      </section>
    </fieldset>
  );
}
