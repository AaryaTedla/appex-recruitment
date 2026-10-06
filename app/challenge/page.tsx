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
    .select("started_at,status")
    .eq("candidate_id", session.candidate.id)
    .maybeSingle();

  if (error) throw error;
  if (!attempt) redirect("/register");
  if (!attempt.started_at) redirect("/challenge/instructions");
  if (attempt.status === "submitted" || attempt.status === "time_expired") redirect("/challenge/complete");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header />
      <ChallengeClient candidateName={session.candidate.full_name} />
    </main>
  );
}
