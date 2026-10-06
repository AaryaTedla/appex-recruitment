"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const links = [["/admin", "Overview"], ["/admin/candidates", "Candidates"], ["/admin/evaluations", "Evaluations"]];
  if (role === "admin") links.push(["/admin/questions", "Questions"], ["/admin/users", "Access"]);
  return (
    <div className="border-b border-line bg-panel/70">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-8">
        <nav aria-label="Admin navigation" className="flex flex-wrap gap-1">
          {links.map(([href, label]) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined}
              className={cn("inline-flex min-h-11 items-center rounded-xl px-3 text-sm transition", active ? "bg-violet-500/15 font-semibold text-violet-200 ring-1 ring-inset ring-violet-400/25" : "text-zinc-400 hover:bg-white/5 hover:text-white")}>{label}</Link>;
          })}
        </nav>
        <div className="flex items-center gap-3"><span className="rounded-full border border-line px-3 py-1 text-xs capitalize text-zinc-400">{role}</span><SignOutButton /></div>
      </div>
    </div>
  );
}
