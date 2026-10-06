export const CATEGORY_MAX: Record<string, number> = {
  python_programming: 15,
  computer_technology: 15,
  aptitude_patterns: 20,
  situational_decision: 15,
  improvisation_problem_solving: 20,
  commitment_reliability: 5,
  wildcard: 10,
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
