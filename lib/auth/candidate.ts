import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

const COOKIE_NAME = "appex_candidate_session";
const SESSION_DAYS = 7;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createCandidateSession(candidateId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = createServiceClient();
  // Keep one active browser session per candidate to avoid two devices racing
  // to overwrite the same autosaved attempt.
  const { error } = await supabase.rpc("replace_appex_session", {
    p_candidate_id: candidateId,
    p_hash: tokenHash,
    p_expires: expiresAt,
  });

  if (error) throw error;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearCandidateSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCandidateSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const supabase = createServiceClient();
  const { data: session, error } = await supabase
    .from("candidate_sessions")
    .select("id,candidate_id,expires_at,candidates(id,srn,full_name,status,created_at)")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!session) return null;

  const candidate = Array.isArray(session.candidates) ? session.candidates[0] : session.candidates;
  if (!candidate) return null;

  return { session, candidate };
}
