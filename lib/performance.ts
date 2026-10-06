// Opt-in diagnostics: log only operation labels and timings, never URLs with
// query strings, credentials, candidate data, or request bodies.
export async function timed<T>(label: string, work: () => Promise<T>): Promise<T> {
  if (process.env.APPEX_PERF_TRACE !== "1") return work();
  const start = performance.now();
  try { return await work(); }
  finally { console.info(`[appex-perf] ${label} ${(performance.now() - start).toFixed(1)}ms`); }
}

export const timedServiceFetch: typeof fetch = async (input, init) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const pathname = new URL(raw).pathname;
  return timed(`${pathname.startsWith("/auth/") ? "service authentication" : "database"} ${pathname}`, () => fetch(input, init));
};
