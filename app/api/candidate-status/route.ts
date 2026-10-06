import { NextResponse } from "next/server";
import { getCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";
import { getChallengeConfig } from "@/lib/challenge";

export async function POST(request: Request) {
  try {
    const session = await getCandidateSession();
    if (!session) return NextResponse.redirect(new URL("/register", request.url), 303);

    const supabase = createServiceClient();
    const { data: attempt, error } = await supabase
      .from("attempts")
      .select("id,started_at,status")
      .eq("candidate_id", session.candidate.id)
      .single();
    if (error) throw error;

    if (attempt.status === "submitted" || attempt.status === "time_expired") {
      return NextResponse.redirect(new URL("/challenge/complete", request.url), 303);
    }

    if (!attempt.started_at) {
      const timer = getChallengeConfig();
      const { error: startError } = await supabase.rpc("start_appex_attempt", {
        p_candidate_id: session.candidate.id, p_minutes: timer.minutes, p_timer_enabled: timer.enabled,
      });
      if (startError) throw startError;
    }

    return NextResponse.redirect(new URL("/challenge", request.url), 303);
  } catch (error) {
    console.error("start challenge error", error);
    return NextResponse.redirect(new URL("/challenge/instructions?error=1", request.url), 303);
  }
}
