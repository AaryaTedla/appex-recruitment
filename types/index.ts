export type CandidateStatus = "registered" | "in_progress" | "submitted";
export type AttemptStatus = "in_progress" | "submitted" | "time_expired";
export type UserRole = "evaluator" | "admin";

export type QuestionType =
  | "mcq"
  | "code_output"
  | "true_false"
  | "scenario_mcq"
  | "short_text"
  | "creative";

export type Question = {
  id: string;
  category: string;
  type: QuestionType;
  question_text: string;
  code_snippet: string | null;
  options: string[] | null;
  points: number;
  difficulty: "easy" | "medium";
  sort_order: number;
};

export type ChallengeAnswer = {
  question_id: string;
  answer_text: string;
};

export type ChallengeBootstrap = {
  attempt: {
    id: string;
    started_at: string;
    status: AttemptStatus;
    submitted_at: string | null;
  };
  questions: Question[];
  answers: ChallengeAnswer[];
  integrityCount: number;
  timer: {
    enabled: boolean;
    minutes: number;
    serverNow: string;
  };
};
