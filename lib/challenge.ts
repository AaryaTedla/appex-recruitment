import { createServiceClient } from "@/lib/supabase/service";

export function getChallengeConfig() {
  const configured = Number(process.env.NEXT_PUBLIC_CHALLENGE_MINUTES || 30);
  const minutes = Number.isFinite(configured) ? Math.max(1, Math.min(1440, configured)) : 30;
  const enabled = process.env.NEXT_PUBLIC_CHALLENGE_TIMER_ENABLED !== "false";
  return { minutes, enabled };
}

export function isAttemptExpired(startedAt: string | null, minutes = getChallengeConfig().minutes, enabled = getChallengeConfig().enabled) {
  if (!enabled || !startedAt) return false;
  const deadline = new Date(startedAt).getTime() + minutes * 60_000;
  return Date.now() >= deadline;
}

export async function submitAttempt(attemptId: string, answers: Record<string, string> = {}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("finalize_appex_attempt", {
    p_attempt_id: attemptId,
    p_answers: answers,
  });
  if (error) throw error;
  return data;
}
