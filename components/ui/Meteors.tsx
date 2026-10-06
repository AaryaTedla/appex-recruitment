"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface MeteorsProps {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
  className?: string;
}

type MeteorStyle = CSSProperties & { "--meteor-angle": string; "--meteor-tail": string };

export function Meteors({ number = 14, minDelay = 0, maxDelay = 10, minDuration = 3, maxDuration = 6, angle = 215, className }: MeteorsProps) {
  const [styles, setStyles] = useState<MeteorStyle[]>([]);

  useEffect(() => {
    const count = Math.max(0, Math.min(60, Math.floor(number)));
    const duration = Math.max(1, minDuration);
    setStyles(Array.from({ length: count }, () => ({
      "--meteor-angle": `${180 - angle}deg`,
      "--meteor-tail": `${70 + Math.random() * 30}px`,
      top: "-5%",
      left: `${Math.random() * 100}%`,
      animationDelay: `${-(Math.max(0, minDelay) + Math.random() * Math.max(0, maxDelay - minDelay))}s`,
      animationDuration: `${(duration + Math.random() * Math.max(0, maxDuration - duration)) / 0.6}s`,
    })));
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:hidden">
      {styles.map((style, index) => (
        <span key={index} style={style} className={cn("appex-meteor absolute h-0.5 w-0.5 rounded-full bg-violet-100", className)}>
          <span style={{ width: "var(--meteor-tail)" }} className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-violet-100 via-violet-200/50 to-transparent" />
        </span>
      ))}
    </div>
  );
}
