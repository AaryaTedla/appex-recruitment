import { NextResponse } from "next/server";
import { getCandidateSession } from "@/lib/auth/candidate";
import { createServiceClient } from "@/lib/supabase/service";

const ALLOWED_EVENTS = new Set(["tab_switch", "window_blur", "fullscreen_exit"]);

export async function POST(request: Request) {
  try {
    const session = await getCandidateSession();
    if (!session) return NextResponse.json({ error: "Session expired." }, { status: 401 });

    const eventType = String((await request.json()).eventType || "");
    if (!ALLOWED_EVENTS.has(eventType)) return NextResponse.json({ error: "Invalid event." }, { status: 400 });

    const supabase = createServiceClient();
    const { data: attempt, error: attemptError } = await supabase
      .from("attempts")
      .select("id,status,started_at")
      .eq("candidate_id", session.candidate.id)
      .maybeSingle();
    if (attemptError) throw attemptError;

    if (!attempt || !attempt.started_at || attempt.status !== "in_progress") {
      return NextResponse.json({ error: "Attempt is not active." }, { status: 409 });
    }

    const { data, error } = await supabase.rpc("record_appex_integrity", {
      p_attempt_id: attempt.id,
      p_event: eventType,
    });
    if (error) throw error;

    return NextResponse.json(data, { status: data.active ? 200 : 409 });
  } catch (error) {
    console.error("integrity log error", error);
    return NextResponse.json({ error: "Could not log event." }, { status: 500 });
  }
}
