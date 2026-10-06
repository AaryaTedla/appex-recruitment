import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Meteors } from "@/components/ui/Meteors";

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="landing-editorial relative isolate flex min-h-screen flex-col">
      <div className="pointer-events-none absolute inset-0 opacity-40"><Meteors /></div>
      <div className="relative z-10"><Header /></div>
      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="mb-8 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-400"><span className="h-px w-8 bg-violet-300" aria-hidden="true" />APPEX / Recruitment</p>
          <h1 className="text-[clamp(3.8rem,9vw,7.5rem)] font-black leading-[0.94] tracking-[-0.065em] text-zinc-50"><span className="block">Think.</span><span className="block">Solve.</span><span className="block font-serif font-normal italic tracking-[-0.07em] text-violet-200">Create.</span></h1>
        </div>
        <div className="border-t border-line pt-6 lg:mb-2 lg:border-t-0 lg:border-l lg:pl-9 lg:pt-0">
          <p className="max-w-xs text-xl leading-8 text-zinc-300 sm:text-2xl sm:leading-9">Your next chapter<br />starts at APPEX.</p>
          <Link href="/join" className="mt-8 inline-flex min-h-14 items-center justify-between gap-10 border-b border-violet-300 pb-2 text-base font-semibold text-zinc-50 transition hover:text-violet-200">Start the test <span aria-hidden="true" className="text-2xl font-normal">↗</span></Link>
        </div>
      </section>
      <section aria-label="Life at APPEX" className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid border-t border-line sm:grid-cols-3">
          {[["Build", "Turn ideas into things."], ["Learn", "Try something new."], ["Connect", "Find your people."]].map(([title, description], index) => (
            <div key={title} className="flex items-start gap-5 border-b border-line py-6 sm:px-5 sm:first:pl-0 sm:last:pr-0">
              <span aria-hidden="true" className="pt-1 font-mono text-xs text-violet-300">0{index + 1}</span>
              <div><h2 className="text-base font-semibold text-zinc-100">{title}</h2><p className="mt-1 text-sm text-zinc-400">{description}</p></div>
            </div>
          ))}
        </div>
      </section>
      <footer className="relative z-10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span className="font-mono tracking-[0.12em]">APPEX · PESU</span>
          <a href="https://www.instagram.com/appex.pesu/" target="_blank" rel="noopener noreferrer" aria-label="Follow @appex.pesu on Instagram (opens in a new tab)" className="inline-flex min-h-11 items-center gap-2 rounded-lg transition hover:text-violet-200">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></svg>
            Follow @appex.pesu <span aria-hidden="true">↗</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
