import { isAttemptExpired, submitAttempt } from "@/lib/challenge";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { ChallengeClient } from "@/components/challenge/ChallengeClient";
import { getCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";

export default async function ChallengePage() {
  const session = await getCandidateSession();
  if (!session) redirect("/register");

  const supabase = createServiceClient();
  const { data: attempt, error } = await supabase
    .from("attempts")
    .select("id,started_at,status,submitted_at,duration_minutes,timer_enabled")
    .eq("candidate_id", session.candidate.id)
    .maybeSingle();

  if (error) throw error;
  if (!attempt) redirect("/register");
  if (!attempt.started_at) redirect("/challenge/instructions");
  if (attempt.status === "submitted" || attempt.status === "time_expired") redirect("/challenge/complete");

  if (isAttemptExpired(attempt.started_at, attempt.duration_minutes, attempt.timer_enabled)) {
    await submitAttempt(attempt.id);
    redirect("/challenge/complete");
  }
  const [questionResult, answerResult, integrityResult] = await Promise.all([
    supabase.from("questions").select("id,category,type,question_text,code_snippet,options,points,difficulty,sort_order").eq("is_active", true).order("sort_order"),
    supabase.from("answers").select("question_id,answer_text").eq("attempt_id", attempt.id),
    supabase.from("integrity_events").select("id", { count: "exact", head: true }).eq("attempt_id", attempt.id),
  ]);
  if (questionResult.error || answerResult.error || integrityResult.error) throw new Error("Could not load the challenge.");
  const initialData = {
    attempt, questions: questionResult.data || [], answers: answerResult.data || [], integrityCount: integrityResult.count || 0,
    timer: { minutes: Number(attempt.duration_minutes), enabled: attempt.timer_enabled, serverNow: new Date().toISOString() },
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header />
      <ChallengeClient candidateName={session.candidate.full_name} initialData={initialData} />
    </main>
  );
}
