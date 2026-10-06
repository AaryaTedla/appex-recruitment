import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-violet-600 text-white shadow-lg shadow-violet-950/30 hover:bg-violet-700 active:bg-violet-800",
        variant === "secondary" && "border border-line bg-white/5 text-zinc-100 hover:bg-white/10",
        variant === "danger" && "border border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20",
        className,
      )}
      {...props}
    />
  );
}
