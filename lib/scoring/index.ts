export const CATEGORY_MAX: Record<string, number> = {
  python_programming: 16,
  computer_technology: 16,
  aptitude_patterns: 16,
  situational_decision: 26,
  improvisation_problem_solving: 10,
  commitment_reliability: 8,
  wildcard: 8,
};

export const RUBRIC_LABELS = [
  "Very weak",
  "Weak",
  "Good",
  "Strong",
  "Excellent",
] as const;

export const RECOMMENDATIONS = [
  "Strongly Shortlist",
  "Shortlist",
  "Maybe",
  "Do Not Shortlist",
] as const;
