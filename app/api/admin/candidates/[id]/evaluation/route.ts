import { NextResponse } from "next/server";
import { hasApiRole } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { RECOMMENDATIONS } from "@/lib/scoring";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await hasApiRole(["evaluator", "admin"]);
    if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    if (body.attemptId !== id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
    const score = Number(body.finalScore);
    if (body.finalScore == null || body.finalScore === "" || !Number.isFinite(score) || score < 0 || score > 100
      || !RECOMMENDATIONS.includes(body.recommendation)) {
      return NextResponse.json({ error: "Enter a score between 0 and 100 and a valid recommendation." }, { status: 400 });
    }
    const { error } = await createServiceClient().rpc("save_appex_evaluation", {
      p_attempt_id: id, p_evaluator_id: identity.user.id, p_score: score,
      p_recommendation: body.recommendation, p_comments: String(body.comments ?? "").slice(0, 5000),
      p_answers: Array.isArray(body.answerEvaluations) ? body.answerEvaluations : [],
    });
    if (error) {
      const expected = ["Invalid answer reference", "Manual score outside point range", "Invalid rubric",
        "Objective answer cannot be manually scored", "Already evaluated by another evaluator", "Attempt has not been submitted"];
      const message = expected.find((value) => error.message.includes(value));
      if (message) return NextResponse.json({ error: message + "." }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("evaluation save error", error);
    return NextResponse.json({ error: "Could not save evaluation. Please try again." }, { status: 500 });
  }
}
