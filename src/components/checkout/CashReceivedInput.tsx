import { formatRupiah } from "../../lib/format";

const QUICK_AMOUNTS = [0, 5000, 10000, 20000, 50000, 100000];

export function CashReceivedInput({ total, value, onChange }: { total: number; value: number; onChange: (v: number) => void }) {
  const kembalian = value - total;
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[var(--text-secondary)]">Uang diterima</label>
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="font-tabular shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-lg font-bold"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(total)}
          className="rounded-full border border-[var(--brand-400)] bg-[var(--brand-50)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-700)]"
        >
          Uang Pas
        </button>
        {QUICK_AMOUNTS.filter((a) => a >= total).slice(0, 4).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            className="font-tabular rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)]"
          >
            {formatRupiah(a)}
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className={`text-sm font-semibold ${kembalian < 0 ? "text-[var(--error-text)]" : "text-[var(--success-text)]"}`}>
          {kembalian < 0 ? `Kurang ${formatRupiah(Math.abs(kembalian))}` : `Kembalian: ${formatRupiah(kembalian)}`}
        </p>
      )}
    </div>
  );
}
