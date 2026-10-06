"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setVisible(true), 200); return () => clearTimeout(timer); }, []);
  return <div id="main-content" tabIndex={-1} role="status" className="mx-auto min-h-[50vh] max-w-6xl px-5 py-10 sm:px-8"><span className={visible ? "text-sm text-zinc-400" : "sr-only"}>Loading APPEX…</span></div>;
}
