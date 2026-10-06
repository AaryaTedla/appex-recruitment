export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCategory(category: string) {
  return category
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatScore(value: number | null | undefined) {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}
