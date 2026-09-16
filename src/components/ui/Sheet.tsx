import type { ReactNode } from "react";
import { CloseIcon } from "./icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// Bottom-sheet modal — the mobile-native pattern for a focused task
// (payment picker, product form) without leaving the current screen.
export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 pb-safe shadow-xl sm:max-w-md sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="font-display text-lg font-bold text-[var(--text)]">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
