import { useGuide } from "../../hooks/useGuide";
import { closeTip } from "../../lib/guide";
import { CloseIcon, HelpIcon } from "../ui/icons";

// A short, dismissible explanation at the top of a screen that is not obvious
// the first time (why you deactivate instead of delete, what the printer options
// mean...). Once closed it stays closed on this device; the same text is always
// reachable from Bantuan.
export function PageTip({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { tipsClosed } = useGuide();
  if (tipsClosed.includes(id)) return null;
  return (
    <aside
      role="note"
      aria-label={`Tips: ${title}`}
      className="flex items-start gap-3 rounded-2xl border border-[var(--brand-200)] bg-[var(--brand-50)] px-4 py-3 text-[13px] leading-relaxed text-[var(--brand-700)]"
    >
      <HelpIcon size={18} className="mt-0.5 flex-none" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <div className="text-[var(--text-secondary)]">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => closeTip(id)}
        aria-label={`Tutup tips: ${title}`}
        className="-mr-1.5 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-[var(--brand-600)] hover:bg-white/60"
      >
        <CloseIcon size={14} />
      </button>
    </aside>
  );
}
