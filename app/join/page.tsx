import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";

export default function JoinPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Before you begin</p>
        <h1 className="mt-3 text-3xl font-bold">This is about how you think.</h1>
        <p className="mt-4 leading-7 text-zinc-400">
          You do not need advanced coding, DSA, ML, or competitive programming experience. The challenge looks for curiosity, reasoning, adaptability, creativity, teamwork, and basic technical understanding.
        </p>
        <Card className="mt-8 p-6">
          <ul className="space-y-3 text-sm leading-6 text-zinc-300">
            <li>• Use your SRN and full name to register.</li>
            <li>• Your answers are saved as you go.</li>
            <li>• You can move back and forth between questions.</li>
            <li>• Please stay on the challenge tab while attempting it.</li>
            <li>• Your score and evaluator comments are not shown after submission.</li>
          </ul>
        </Card>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex min-h-12 items-center rounded-xl bg-accent px-6 text-sm font-bold hover:bg-violet-700">Continue</Link>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-xl border border-line px-6 text-sm font-semibold text-zinc-300 hover:bg-white/5">Back</Link>
        </div>
      </div>
    </main>
  );
}
