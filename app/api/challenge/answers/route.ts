import { DESCRIPTIVE_ANSWER_LIMIT } from "@/lib/challengeLimits";
import { NextResponse } from "next/server";
import { getCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";

export async function PUT(request: Request) {
  try {
    const session = await getCandidateSession();
    if (!session) return NextResponse.json({ error: "Session expired." }, { status: 401 });
    const body = await request.json();
    const questionId = String(body.questionId || "");
    if (!/^[0-9a-f-]{36}$/i.test(questionId)) return NextResponse.json({ error: "Invalid question." }, { status: 400 });
    const supabase = createServiceClient();
    const { data: attempt, error: attemptError } = await supabase.from("attempts").select("id")
      .eq("candidate_id", session.candidate.id).single();
    if (attemptError) throw attemptError;
    const { data, error } = await supabase.rpc("save_appex_answer", {
      p_attempt_id: attempt.id, p_question_id: questionId, p_text: String(body.answerText ?? "").slice(0, DESCRIPTIVE_ANSWER_LIMIT),
    });
    if (error) throw error;
    return NextResponse.json(data, { status: data.submitted ? 409 : 200 });
  } catch (error) {
    console.error("answer save error", error);
    return NextResponse.json({ error: "Could not save answer. Please try again." }, { status: 500 });
  }
}
