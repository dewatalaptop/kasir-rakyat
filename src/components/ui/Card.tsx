import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`shape-card card-shadow border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}
      {...props}
    />
  );
}

export function Pill({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`} {...props} />;
}

export type KpiTone = "green" | "blue" | "violet" | "amber";

const KPI_TONE: Record<KpiTone, string> = {
  green: "bg-[var(--kpi-green-bg)] text-[var(--kpi-green-fg)]",
  blue: "bg-[var(--kpi-blue-bg)] text-[var(--kpi-blue-fg)]",
  violet: "bg-[var(--kpi-violet-bg)] text-[var(--kpi-violet-fg)]",
  amber: "bg-[var(--kpi-amber-bg)] text-[var(--kpi-amber-fg)]",
};

// KPI stat tile: tinted icon square + label + big value + optional delta
// line (▲/▼ text supplied by the caller so the semantics stay explicit).
export function StatCard({
  compact = false,
  icon,
  tone,
  label,
  value,
  delta,
  deltaTone = "up",
}: {
  compact?: boolean;
  icon: React.ReactNode;
  tone: KpiTone;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "up" | "down" | "neutral";
}) {
  const deltaClass =
    deltaTone === "up"
      ? "text-[var(--brand-600)]"
      : deltaTone === "down"
        ? "text-[var(--danger)]"
        : "text-[var(--text-faint)]";
  return (
    <div className={`shape-card card-shadow flex items-center border border-[var(--border)] bg-[var(--surface)] ${compact ? "gap-2.5 p-3" : "gap-3 p-3.5"}`}>
      <span className={`flex-none items-center justify-center rounded-xl ${compact ? "hidden h-9 w-9 2xl:flex" : "flex h-11 w-11"} ${KPI_TONE[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[var(--text-secondary)] sm:text-xs">{label}</p>
        <p className={`font-tabular truncate font-extrabold leading-tight text-[var(--text)] ${compact ? "text-base" : "text-xl"}`}>{value}</p>
        {delta && <p className={`truncate text-[10px] font-semibold sm:text-[11px] ${deltaClass}`}>{delta}</p>}
      </div>
    </div>
  );
}
