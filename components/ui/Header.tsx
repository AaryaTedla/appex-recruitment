import Link from "next/link";
import Image from "next/image";

export function Header({ admin = false }: { admin?: boolean }) {
  return (
    <header className="border-b border-line/80 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link href={admin ? "/admin" : "/"} aria-label={admin ? "APPEX dashboard" : "APPEX home"} className="inline-flex min-h-11 items-center rounded-lg py-1.5">
          <Image src="/appex-logo-dark.png" alt="APPEX" width={2172} height={724} sizes="(min-width: 640px) 160px, 128px" priority className="h-auto w-32 sm:w-40" />
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          {admin ? "Evaluation" : "Recruitment"}
        </div>
      </div>
    </header>
  );
}
