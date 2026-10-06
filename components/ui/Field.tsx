import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-xl border border-line bg-black/20 px-4 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-line bg-black/20 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-violet-400",
        className,
      )}
      {...props}
    />
  );
}
