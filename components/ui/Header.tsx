import Link from "next/link";

export function Header({ admin = false }: { admin?: boolean }) {
  return (
    <header className="border-b border-line/80 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link href={admin ? "/admin" : "/"} className="inline-flex min-h-11 items-center font-black tracking-[0.2em] text-zinc-50">
          APPEX
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          {admin ? "Evaluation" : "Recruitment"}
        </div>
      </div>
    </header>
  );
}
