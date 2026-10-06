import Link from "next/link";
import { PAGE_SIZE, pageHref } from "@/lib/pagination";

export function PageNavigation({ path, params, page, count, size = PAGE_SIZE }: {
  path: string; params: Record<string, string | string[] | undefined>; page: number; count: number; size?: number;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  const numbers = Array.from(new Set([1, ...Array.from({ length: 5 }, (_, i) => page - 2 + i).filter((n) => n > 0 && n <= pages), pages])).sort((a, b) => a - b);
  const button = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line px-3 hover:bg-white/5";
  return <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
    <span>{count ? `${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count}` : "0 results"} · Page {page} of {pages}</span>
    {pages > 1 && <div className="flex flex-wrap gap-2">
      {page > 1 && <Link prefetch={false} className={button} href={pageHref(path, params, page - 1)}>Previous</Link>}
      {numbers.map((n, i) => <span key={n} className="inline-flex items-center gap-2">{i > 0 && n - numbers[i - 1] > 1 && <span aria-hidden="true">…</span>}<Link prefetch={false} aria-label={`Page ${n}`} aria-current={n === page ? "page" : undefined} className={`${button} ${n === page ? "border-violet-400 bg-violet-500/10 text-violet-200" : ""}`} href={pageHref(path, params, n)}>{n}</Link></span>)}
      {page < pages && <Link prefetch={false} className={button} href={pageHref(path, params, page + 1)}>Next</Link>}
    </div>}
  </nav>;
}
