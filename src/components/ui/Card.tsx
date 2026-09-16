import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`shape-card border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}
      {...props}
    />
  );
}

export function Pill({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`} {...props} />;
}
