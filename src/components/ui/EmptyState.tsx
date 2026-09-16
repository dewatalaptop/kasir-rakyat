import type { ReactNode } from "react";

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {icon && <div className="mb-1 text-[var(--text-faint)]">{icon}</div>}
      <p className="font-display text-base font-bold text-[var(--text)]">{title}</p>
      {description && <p className="max-w-xs text-sm text-[var(--text-secondary)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
