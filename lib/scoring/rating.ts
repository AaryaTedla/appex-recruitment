export function ratingToMarks(rating: number, points: number) {
  return Math.round(rating * Number(points) * 10) / 100;
}
export function roundScore(score: number) { return Math.round(score * 100) / 100; }
