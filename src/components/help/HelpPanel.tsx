import { useState } from "react";
import { HelpIcon, CloseIcon } from "../ui/icons";
import type { HelpTopic } from "./helpContent";

// Lightweight inline contextual help — a dismissible "?" panel per major
// screen, not a heavy separate onboarding library/dependency.
export function HelpPanel({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-600)]"
        aria-label="Bantuan"
      >
        <HelpIcon size={16} />
      </button>
      {open && (
        <div className="shape-card mt-2 border border-[var(--brand-200)] bg-[var(--brand-50)] p-3 text-sm text-[var(--brand-700)]">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">{topic.title}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup">
              <CloseIcon size={14} />
            </button>
          </div>
          <p>{topic.body}</p>
        </div>
      )}
    </div>
  );
}
