import { NextResponse } from "next/server";
import { getCandidateSession } from "@/lib/auth/candidate";
import { isAttemptExpired, submitAttempt } from "@/lib/challenge";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCandidateSession();
    if (!session) return NextResponse.json({ error: "Session expired." }, { status: 401 });

    const supabase = createServiceClient();
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id,started_at,status,submitted_at,duration_minutes,timer_enabled")
      .eq("candidate_id", session.candidate.id)
      .single();
    if (attemptError) throw attemptError;

    if (!attempt.started_at) {
      return NextResponse.json({ error: "Challenge has not been started." }, { status: 409 });
    }

    if (attempt.status === "submitted" || attempt.status === "time_expired") {
      return NextResponse.json({ submitted: true }, { status: 409 });
    }

    if (isAttemptExpired(attempt.started_at, attempt.duration_minutes, attempt.timer_enabled)) {
      await submitAttempt(attempt.id);
      return NextResponse.json({ submitted: true }, { status: 409 });
    }

    const [{ data: questions, error: questionError }, { data: answers, error: answerError }, { count, error: integrityError }] = await Promise.all([
      supabase
        .from("questions")
        .select("id,category,type,question_text,code_snippet,options,points,difficulty,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("answers")
        .select("question_id,answer_text")
        .eq("attempt_id", attempt.id),
      supabase
        .from("integrity_events")
        .select("id", { count: "exact", head: true })
        .eq("attempt_id", attempt.id),
    ]);

    if (questionError) throw questionError;
    if (answerError) throw answerError;
    if (integrityError) throw integrityError;

    if (!questions?.length) {
      return NextResponse.json(
        { error: "No active challenge questions are configured. Ask an APPEX admin to seed or activate the question bank." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      attempt,
      questions,
      answers,
      integrityCount: count || 0,
      timer: {
        minutes: Number(attempt.duration_minutes),
        enabled: attempt.timer_enabled,
        serverNow: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("challenge bootstrap error", error);
    return NextResponse.json({ error: "Could not load the challenge." }, { status: 500 });
  }
}
