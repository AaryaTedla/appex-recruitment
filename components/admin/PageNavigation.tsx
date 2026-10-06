import Link from "next/link";

export function PageNavigation({ path, params, page, count, size = 50 }: {
  path: string; params: Record<string, string | string[] | undefined>; page: number; count: number; size?: number;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  const href = (next: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value);
    query.set("page", String(next));
    return `${path}?${query}`;
  };
  return <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
    <span>{count} results · Page {page} of {pages}</span>
    <div className="flex gap-2">
      {page > 1 && <Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 hover:bg-white/5" href={href(page - 1)}>Previous</Link>}
      {page < pages && <Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 hover:bg-white/5" href={href(page + 1)}>Next</Link>}
    </div>
  </nav>;
}
