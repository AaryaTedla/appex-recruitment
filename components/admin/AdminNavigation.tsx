"use client";

import { createContext, useContext, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Navigation = { destination: string | null; pending: boolean; delayed: boolean; navigate: (href: string) => void };
const Context = createContext<Navigation | null>(null);
export function useAdminNavigation() { return useContext(Context); }

export function AdminNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [destination, setDestination] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!pending) { setDestination(null); setDelayed(false); return; }
    const timer = setTimeout(() => setDelayed(true), 200);
    return () => clearTimeout(timer);
  }, [pending]);
  function navigate(href: string) {
    setDestination(href);
    startTransition(() => router.push(href));
  }
  return <Context.Provider value={{ destination, pending, delayed, navigate }}>{children}</Context.Provider>;
}

export function AdminContent({ children }: { children: ReactNode }) {
  const navigation = useAdminNavigation();
  return <div aria-busy={navigation?.pending || undefined} inert={navigation?.pending || undefined} className={navigation?.delayed ? "opacity-60 transition-opacity duration-150" : "transition-opacity duration-150"}>{children}</div>;
}
