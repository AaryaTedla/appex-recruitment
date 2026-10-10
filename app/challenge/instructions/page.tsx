import { getTestAccess } from "@/lib/testAccess";
import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";
import { getCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";
import { getChallengeConfig } from "@/lib/challenge";

export default async function InstructionsPage({ searchParams }: { searchParams: Promise<{ error?: string; closed?: string }> }) {
  const session = await getCandidateSession();
  if (!session) redirect("/register");

  const supabase = createServiceClient();
  const { data: attempt, error: attemptError } = await supabase.from("attempts").select("status,started_at").eq("candidate_id", session.candidate.id).maybeSingle();
  if (attemptError) throw attemptError;
  if (!attempt) redirect("/register");
  if (attempt?.status === "submitted" || attempt?.status === "time_expired") redirect("/challenge/complete");
  if (attempt?.started_at) redirect("/challenge");
  const { count, error } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("is_active", true);
  if (error) throw error;
  const timer = getChallengeConfig();
  const testOpen = await getTestAccess();
  const params = await searchParams;

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Candidate Instructions</p>
        <h1 className="mt-3 text-3xl font-bold">Ready, {session.candidate.full_name.trim().split(/\s+/)[0]}?</h1>
        <p className="mt-3 text-zinc-400">{timer.enabled ? `You have ${timer.minutes} minutes. The timer starts only when you begin.` : "Take your time. This round has no time limit."}</p>
        <Card className="mt-8 p-6">
          <div className="space-y-5 text-sm leading-6 text-zinc-300">
            <div><strong className="text-zinc-100">MCQs: 20 questions</strong> · suggested 12 minutes</div>
            <div><strong className="text-zinc-100">Descriptive: 2 questions</strong> · suggested 18 minutes</div>
            <div>One shared timer. You can switch sections anytime. Save enough time for the two written answers.</div>
            <div><strong className="text-zinc-100">Answers autosave.</strong> Refreshing the page should restore what reached the server.</div>
            <div><strong className="text-zinc-100">Stay on this page.</strong> Tab switches and window blur events are logged as basic integrity signals. One accidental event will not disqualify you.</div>
            <div><strong className="text-zinc-100">Review before submitting.</strong> You can revisit any question until the attempt is submitted.</div>
          </div>
        </Card>
        {(params.error || !count) && <p role="alert" className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">{!count ? "The question bank is not ready yet. Contact APPEX before starting." : "We could not start the challenge. Please try again or contact APPEX."}</p>}
        {!testOpen && <p role="status" className="mt-6 text-amber-200">New tests are closed. Contact APPEX if you need help.</p>}
        <form action="/api/candidate-status" method="post" className="mt-8">
          <button disabled={!count || !testOpen} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-6 text-sm font-bold hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Start Challenge</button>
        </form>
      </div>
    </main>
  );
}
