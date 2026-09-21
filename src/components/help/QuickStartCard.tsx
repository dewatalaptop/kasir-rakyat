import { Link } from "react-router-dom";
import { useAccess } from "../../context/AccessContext";
import { useGuide } from "../../hooks/useGuide";
import { computeQuickStart, setChecklistHidden } from "../../lib/guide";
import { CheckIcon } from "../ui/icons";

// "Panduan Awal": what to do first, with real progress. Only the owner sees it
// (cashiers have nothing to set up), and it can be hidden — it then lives on in
// Bantuan (`alwaysShow`).
export function QuickStartCard({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const { isOwner, hasOwnerPassword } = useAccess();
  const { marked, checklistHidden } = useGuide();
  const qs = computeQuickStart({ marked, hasOwnerPassword });

  if (!isOwner) return null;
  if (!alwaysShow && (checklistHidden || qs.allDone)) return null;

  return (
    <section aria-label="Panduan Awal" className="shape-card card-shadow border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-extrabold text-[var(--text)]">Panduan Awal</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {qs.allDone ? "Semua langkah selesai — kamu siap berjualan!" : `${qs.done} dari ${qs.total} langkah selesai. Ikuti urutannya, tiap langkah hanya beberapa menit.`}
          </p>
        </div>
        {!alwaysShow && (
          <button type="button" onClick={() => setChecklistHidden(true)} className="min-h-[36px] flex-none px-2 text-xs font-semibold text-[var(--text-faint)]">
            Sembunyikan
          </button>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={qs.percent}
        aria-label="Kemajuan panduan awal"
        className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border-soft)]"
      >
        <div className="h-full rounded-full bg-[var(--brand-500)] transition-all" style={{ width: `${qs.percent}%` }} />
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {qs.steps.map((s) => (
          <li key={s.key}>
            <Link
              to={s.to}
              className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2 ${
                s.done ? "border-transparent bg-[var(--brand-50)]" : s.key === qs.next?.key ? "border-[var(--brand-300)] bg-[var(--surface)]" : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-extrabold ${
                  s.done ? "bg-[var(--brand-500)] text-white" : "border-2 border-[var(--border)] text-[var(--text-faint)]"
                }`}
              >
                {s.done ? <CheckIcon size={15} /> : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-bold ${s.done ? "text-[var(--text-secondary)] line-through" : "text-[var(--text)]"}`}>
                  {s.title}
                  {s.optional && !s.done && <span className="ml-2 rounded-full bg-[var(--border-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] no-underline">Opsional</span>}
                </span>
                {!s.done && <span className="block text-xs text-[var(--text-secondary)]">{s.hint}</span>}
              </span>
              {!s.done && <span className="flex-none text-xs font-bold text-[var(--brand-600)]">{s.key === qs.next?.key ? "Mulai →" : "Buka →"}</span>}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
