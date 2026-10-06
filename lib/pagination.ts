import { redirect } from "next/navigation";

export const PAGE_SIZE = 25;
export function pageHref(path: string, params: Record<string, string | string[] | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value);
  query.set("page", String(page));
  return `${path}?${query}`;
}
export function redirectToValidPage(path: string, params: Record<string, string | string[] | undefined>, page: number, count: number) {
  const last = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page > last) redirect(pageHref(path, params, last));
}
