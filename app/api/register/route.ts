import { NextResponse } from "next/server";
import { createCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const srn = String(body.srn || "").trim().toUpperCase();
    const fullName = String(body.fullName ?? "");
    if (!/^[A-Z0-9]{6,24}$/.test(srn) || fullName.trim().length < 2 || fullName.length > 120) {
      return NextResponse.json({ error: "Enter a valid SRN and your full name." }, { status: 400 });
    }
    const supabase = createServiceClient();
    const { data: candidateId, error } = await supabase.rpc("register_appex_candidate", { p_srn: srn, p_full_name: fullName });
    if (error?.message.includes("SRN_NAME_MISMATCH")) {
      return NextResponse.json({ error: "This SRN is already registered. Use the same full name as before, or contact APPEX." }, { status: 409 });
    }
    if (error || !candidateId) throw error || new Error("Candidate was not created");
    const { data: attempt, error: attemptError } = await supabase.from("attempts")
      .select("started_at,status").eq("candidate_id", candidateId).single();
    if (attemptError) throw attemptError;
    await createCandidateSession(candidateId);
    return NextResponse.json({ next: attempt.status !== "in_progress" ? "/challenge/complete" : attempt.started_at ? "/challenge" : "/challenge/instructions" });
  } catch (error) {
    console.error("register error", error);
    return NextResponse.json({ error: "Registration is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
