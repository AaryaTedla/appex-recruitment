import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Meteors } from "@/components/ui/Meteors";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="relative isolate flex min-h-screen flex-col">
      <Meteors />
      <div className="relative z-10"><Header /></div>
      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full border border-violet-400/10 sm:h-96 sm:w-96" />
          <div className="absolute left-1/2 top-20 h-56 w-56 -translate-x-1/2 rounded-full border border-violet-400/10 sm:h-80 sm:w-80" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">APPEX recruitment</p>
        <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight text-zinc-50 sm:text-7xl">Think. Solve.<br /><span className="text-violet-300">Create.</span></h1>
        <p className="mt-6 text-lg text-zinc-400">Show us how you think.</p>
        <Link href="/join" className="mt-9 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-violet-600 px-7 text-sm font-bold text-white transition hover:bg-violet-700">Start the test <span aria-hidden="true">→</span></Link>
        <div className="mt-14 grid w-full max-w-xl grid-cols-3 gap-3 border-t border-line pt-6 sm:gap-8">
          {[
            ["Build", "Turn ideas into things."],
            ["Learn", "Try something new."],
            ["Connect", "Find your people."],
          ].map(([title, description], index) => (
            <div key={title}>
              <span aria-hidden="true" className="font-mono text-xs text-violet-300/70">0{index + 1}</span>
              <h2 className="mt-2 text-sm font-semibold text-zinc-100 sm:text-base">{title}</h2>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="relative z-10 border-t border-line/80 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span className="font-semibold tracking-[0.16em]">APPEX · PESU</span>
          <a href="https://www.instagram.com/appex.pesu/" target="_blank" rel="noopener noreferrer" aria-label="Follow @appex.pesu on Instagram (opens in a new tab)" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-zinc-400 transition hover:text-violet-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></svg>
            Follow @appex.pesu <span aria-hidden="true">↗</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
