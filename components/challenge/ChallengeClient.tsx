"use client";

import { DESCRIPTIVE_ANSWER_LIMIT } from "@/lib/challengeLimits";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { cn, formatCategory } from "@/lib/utils";
import type { ChallengeBootstrap, Question } from "@/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ChallengeClient({ candidateName }: { candidateName: string }) {
  const router = useRouter();
  const [data, setData] = useState<ChallengeBootstrap | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [warning, setWarning] = useState<{ count: number; event: string } | null>(null);
  const [integrityCount, setIntegrityCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const answersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);
  const serverOffset = useRef(0);
  const saveQueue = useRef(Promise.resolve());
  const dirtyQuestions = useRef(new Set<string>());
  const activeRef = useRef(true);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastIntegrityAt = useRef(0);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/challenge/bootstrap", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          if (response.status === 409 && payload.submitted) {
            router.replace("/challenge/complete");
            return;
          }
          throw new Error(payload.error || "Could not load challenge.");
        }
        if (!active) return;
        if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
          setFatalError("No active challenge questions are configured. Ask an APPEX admin to seed or activate the question bank.");
          return;
        }
        setData(payload);
        serverOffset.current = new Date(payload.timer.serverNow).getTime() - Date.now();
        setIntegrityCount(payload.integrityCount || 0);
        answersRef.current = Object.fromEntries((payload.answers || []).map((answer: { question_id: string; answer_text: string }) => [answer.question_id, answer.answer_text]));
        setAnswers(answersRef.current);
      } catch (error) {
        if (active) setFatalError(error instanceof Error ? error.message : "Could not load challenge.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    activeRef.current = true;
    const timers = saveTimers.current;
    return () => {
      activeRef.current = false;
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const submitChallenge = useCallback(async (reason: "submitted" | "time_expired" = "submitted") => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    Object.values(saveTimers.current).forEach(clearTimeout);
    try {
      const response = await fetch("/api/challenge/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, answers: answersRef.current }),
        signal: AbortSignal.timeout(20_000),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Submission failed.");
      router.replace("/challenge/complete");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not submit. Please try again.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [router]);

  useEffect(() => {
    if (!data?.timer.enabled || !data.attempt.started_at) return;
    const start = new Date(data.attempt.started_at).getTime();
    const deadline = start + data.timer.minutes * 60_000;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - (Date.now() + serverOffset.current)) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        void submitChallenge("time_expired");
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data, submitChallenge]);

  useEffect(() => {
    if (!data) return;

    async function logIntegrity(eventType: "tab_switch" | "window_blur") {
      const now = Date.now();
      // A normal tab switch commonly fires both blur and visibilitychange.
      // Count that as one integrity event instead of two warnings.
      if (now - lastIntegrityAt.current < 1200) return;
      lastIntegrityAt.current = now;

      try {
        const response = await fetch("/api/challenge/integrity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventType }),
          keepalive: true,
        });
        if (!response.ok) return;
        const payload = await response.json();
        if (payload.recorded === false) return;
        setIntegrityCount(payload.count);
        setWarning({ count: payload.count, event: eventType });
      } catch {
        // Integrity logging should never destroy the candidate experience.
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") void logIntegrity("tab_switch");
    };
    const onBlur = () => void logIntegrity("window_blur");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [data]);

  async function persistAnswer(questionId: string, value: string) {
    if (submittingRef.current || !activeRef.current) return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/challenge/answers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answerText: value }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json();
      if (response.status === 409 && payload.submitted) {
        router.replace("/challenge/complete");
        return;
      }
      if (!response.ok) throw new Error();
      if (!activeRef.current || submittingRef.current) return;
      if (answersRef.current[questionId] === value) dirtyQuestions.current.delete(questionId);
      setSaveState(dirtyQuestions.current.size ? "saving" : "saved");
      window.setTimeout(() => {
        if (activeRef.current && !dirtyQuestions.current.size) setSaveState("idle");
      }, 1200);
    } catch {
      setSaveState("error");
    }
  }

  function setAnswer(questionId: string, value: string, immediate = false) {
    if (submittingRef.current || secondsLeft === 0) return;
    answersRef.current = { ...answersRef.current, [questionId]: value };
    setAnswers(answersRef.current);
    dirtyQuestions.current.add(questionId);
    setSaveState("saving");
    if (saveTimers.current[questionId]) clearTimeout(saveTimers.current[questionId]);
    const enqueue = () => {
      saveQueue.current = saveQueue.current.then(() => persistAnswer(questionId, answersRef.current[questionId] || ""));
    };
    if (immediate) {
      enqueue();
      return;
    }
    saveTimers.current[questionId] = setTimeout(enqueue, 550);
  }

  const answeredCount = useMemo(() => {
    if (!data) return 0;
    return data.questions.filter((question) => (answers[question.id] || "").trim().length > 0).length;
  }, [answers, data]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-5 py-16 text-center text-sm text-zinc-500">Preparing your challenge…</div>;
  }

  if (fatalError || !data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">We could not load the challenge.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{fatalError || "Please reload this page."}</p>
        <Button className="mt-6" onClick={() => location.reload()}>Reload</Button>
      </div>
    );
  }

  if (reviewing) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <ChallengeTopBar name={candidateName} secondsLeft={secondsLeft} saveState={saveState} integrityCount={integrityCount} />
        {submitError && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{submitError} Your current answers are still here. Try submitting again.</p>}
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Review</p>
          <h1 className="mt-2 text-3xl font-bold">You’re about to submit your APPEX Challenge.</h1>
          <div className="mt-4 flex gap-6 text-sm text-zinc-400">
            <span><strong className="text-zinc-100">Answered:</strong> {answeredCount}/{data.questions.length}</span>
            <span><strong className="text-zinc-100">Unanswered:</strong> {data.questions.length - answeredCount}</span>
          </div>

          <Card className="mt-8 overflow-hidden">
            {data.questions.map((question, index) => {
              const done = Boolean((answers[question.id] || "").trim());
              return (
                <button
                  key={question.id}
                  onClick={() => { setCurrent(index); setReviewing(false); }}
                  className="flex w-full items-center justify-between border-b border-line px-5 py-4 text-left last:border-b-0 hover:bg-white/[0.03]"
                >
                  <span className="text-sm"><span className="mr-3 text-zinc-600">{String(index + 1).padStart(2, "0")}</span>{formatCategory(question.category)}</span>
                  <span className={cn("text-xs font-semibold", done ? "text-emerald-300" : "text-amber-300")}>{done ? "Answered" : "Unanswered"}</span>
                </button>
              );
            })}
          </Card>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="secondary" onClick={() => setReviewing(false)}>Go Back</Button>
            <Button onClick={() => void submitChallenge("submitted")} disabled={submitting}>{submitting ? "Submitting…" : "Submit Challenge"}</Button>
          </div>
        </div>
        {warning && <IntegrityWarning warning={warning} onClose={() => setWarning(null)} />}
      </div>
    );
  }

  const question = data.questions[current];
  if (!question) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">This challenge is unavailable.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">The active question list changed or could not be loaded. Reload the challenge, or ask an APPEX admin to check the question bank.</p>
        <Button className="mt-6" onClick={() => location.reload()}>Reload</Button>
      </div>
    );
  }
  const progress = ((current + 1) / data.questions.length) * 100;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <ChallengeTopBar name={candidateName} secondsLeft={secondsLeft} saveState={saveState} integrityCount={integrityCount} />
      {submitError && <div role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"><p>{submitError} Your current answers are still here.</p><Button className="mt-3" disabled={submitting} onClick={() => void submitChallenge()}>Retry submission</Button></div>}

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Question {current + 1} of {data.questions.length}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">{formatCategory(question.category)}</p>
        </div>
        <div className="text-xs text-zinc-500">{question.points} pts</div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <Card className="mt-7 p-5 sm:p-8">
        <fieldset className="min-w-0" disabled={submitting || secondsLeft === 0}><QuestionView question={question} value={answers[question.id] || ""} onChange={(value, immediate) => setAnswer(question.id, value, immediate)} /></fieldset>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Question navigator">
        {data.questions.map((q, index) => (
          <button
            key={q.id}
            aria-label={`Go to question ${index + 1}${(answers[q.id] || "").trim() ? ", answered" : ", unanswered"}`}
            aria-current={index === current ? "step" : undefined}
            onClick={() => setCurrent(index)}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-xl text-sm transition",
              index === current ? "bg-violet-600 text-white" : (answers[q.id] || "").trim() ? "bg-emerald-500/10 text-emerald-300" : "border border-line text-zinc-500 hover:bg-white/5",
            )}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}>Previous</Button>
        {current < data.questions.length - 1 ? (
          <Button onClick={() => setCurrent((value) => Math.min(data.questions.length - 1, value + 1))}>Next</Button>
        ) : (
          <Button onClick={() => setReviewing(true)}>Review</Button>
        )}
      </div>

      {warning && <IntegrityWarning warning={warning} onClose={() => setWarning(null)} />}
    </div>
  );
}

function ChallengeTopBar({ name, secondsLeft, saveState, integrityCount }: { name: string; secondsLeft: number | null; saveState: SaveState; integrityCount: number }) {
  const minutes = secondsLeft == null ? null : Math.floor(secondsLeft / 60);
  const seconds = secondsLeft == null ? null : secondsLeft % 60;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5 text-xs text-zinc-500">
      <span className="min-w-0 break-words">{name}</span>
      <div className="flex items-center gap-4">
        {integrityCount > 0 && <span>Integrity events: {integrityCount}</span>}
        <span role="status" className={saveState === "error" ? "text-red-300" : saveState === "saving" ? "text-amber-300" : "text-zinc-500"}>
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed — latest answers will retry on submit" : "Autosave on"}
        </span>
        {minutes != null && seconds != null && <span className="font-mono text-zinc-300">{minutes}:{String(seconds).padStart(2, "0")} remaining</span>}
      </div>
    </div>
  );
}

function QuestionView({ question, value, onChange }: { question: Question; value: string; onChange: (value: string, immediate?: boolean) => void }) {
  const isChoice = ["mcq", "scenario_mcq", "true_false", "code_output"].includes(question.type) && question.options?.length;

  return (
    <div>
      <h2 className="text-xl font-semibold leading-8 text-zinc-50 sm:text-2xl">{question.question_text}</h2>
      {question.code_snippet && (
        <pre className="mt-6 overflow-x-auto rounded-xl border border-line bg-black/40 p-4 text-sm leading-6 text-zinc-200"><code>{question.code_snippet}</code></pre>
      )}

      {isChoice ? (
        <div className="mt-7 grid gap-3">
          {question.options!.map((option, index) => {
            const selected = value === option;
            return (
              <button
                aria-pressed={selected}
                key={option}
                onClick={() => onChange(option, true)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-4 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition",
                  selected ? "border-violet-400 bg-violet-500/10 text-white" : "border-line bg-black/10 text-zinc-300 hover:border-zinc-600 hover:bg-white/[0.03]",
                )}
              >
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs", selected ? "border-violet-400 bg-violet-600 text-white" : "border-line text-zinc-500")}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="min-w-0 break-words">{option}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-7">
          <Textarea
            aria-label="Your answer"
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, DESCRIPTIVE_ANSWER_LIMIT))}
            rows={7}
            placeholder="Your answer…"
            maxLength={DESCRIPTIVE_ANSWER_LIMIT}
          />
          <div className="mt-2 text-right text-xs text-zinc-600">{value.length} / {DESCRIPTIVE_ANSWER_LIMIT}</div>
        </div>
      )}
    </div>
  );
}

function IntegrityWarning({ warning, onClose }: { warning: { count: number; event: string }; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="integrity-title" className="max-w-[calc(100%-2rem)] bg-transparent p-0 text-zinc-100 backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      <Card className="w-full max-w-md p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{warning.count <= 3 ? `Warning ${warning.count} of 3` : "Integrity event recorded"}</p>
        <h3 id="integrity-title" className="mt-3 text-xl font-bold">Please stay on the APPEX Challenge page.</h3>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {warning.event === "tab_switch" ? "A tab switch was detected." : "The challenge window lost focus."} Your attempt will continue, and your saved answers are safe.
        </p>
        {warning.count >= 3 && <p className="mt-3 text-sm text-amber-200">This attempt will be flagged for evaluator review. You may continue the challenge.</p>}
        <Button className="mt-6 w-full" onClick={onClose}>Continue Challenge</Button>
      </Card>
    </dialog>
  );
}
