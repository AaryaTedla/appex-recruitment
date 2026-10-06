"use client";

import { Button } from "@/components/ui/Button";

export default function AdminError({ reset }: { reset: () => void }) {
  return <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
    <h1 className="text-2xl font-bold">Something went wrong.</h1>
    <p role="alert" className="mt-3 max-w-lg text-sm text-zinc-400">This page could not load. Try again or choose another tab.</p>
    <Button onClick={reset} className="mt-6">Try again</Button>
  </main>;
}
