"use client";

import { Button } from "@/components/ui/Button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div id="main-content" tabIndex={-1} className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">APPEX</p>
        <h1 className="text-2xl font-bold">Something went wrong.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Your saved challenge answers are not deleted. Try loading this page again.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
