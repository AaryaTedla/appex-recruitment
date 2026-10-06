import { redirect } from "next/navigation";
import { Header } from "@/components/ui/Header";
import { getCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";

export default async function CompletePage() {
  const session = await getCandidateSession();
  if (!session) redirect("/register");
  const supabase = createServiceClient();
  const { data: attempt, error } = await supabase.from("attempts").select("status,submitted_at").eq("candidate_id", session.candidate.id).maybeSingle();
  if (error) throw error;
  if (!attempt) redirect("/register");
  if (attempt.status !== "submitted" && attempt.status !== "time_expired") redirect("/challenge");

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl flex-col justify-center px-5 py-16 text-center sm:px-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-violet-400/40 bg-violet-500/10 text-2xl">✓</div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">APPEX Recruitment</p>
        <h1 className="mt-3 text-4xl font-black">Challenge Complete.</h1>
        <p className="mt-4 leading-7 text-zinc-400">Your response has been submitted successfully. The APPEX team will review it.</p>
        {attempt.status === "time_expired" && <p className="mt-3 text-sm text-zinc-500">Your attempt was automatically submitted when the challenge time ended.</p>}
      </div>
    </main>
  );
}
