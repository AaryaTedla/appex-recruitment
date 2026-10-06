import { DESCRIPTIVE_ANSWER_LIMIT } from "@/lib/challengeLimits";
import { NextResponse } from "next/server";
import { getCandidateSession } from "@/lib/auth/candidate";
import { submitAttempt } from "@/lib/challenge";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const session = await getCandidateSession();
    if (!session) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const body = await request.json();
    const answers: Record<string, string> = {};
    if (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)) {
      for (const [id, value] of Object.entries(body.answers)) answers[id] = String(value ?? "").slice(0, DESCRIPTIVE_ANSWER_LIMIT);
    }
    const supabase = createServiceClient();
    const { data: attempt, error } = await supabase.from("attempts").select("id,started_at")
      .eq("candidate_id", session.candidate.id).single();
    if (error) throw error;
    if (!attempt.started_at) return NextResponse.json({ error: "Start the challenge before submitting." }, { status: 409 });
    const result = await submitAttempt(attempt.id, answers);
    return NextResponse.json(result);
  } catch (error) {
    console.error("submission error", error);
    return NextResponse.json({ error: "Could not submit. Your saved answers are safe. Please try again." }, { status: 500 });
  }
}
