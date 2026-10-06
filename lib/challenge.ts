import { createServiceClient } from "@/lib/supabase/service";

export function getChallengeConfig() {
  // New starts always receive 30 minutes; existing attempts use their stored duration.
  const minutes = 30;
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
