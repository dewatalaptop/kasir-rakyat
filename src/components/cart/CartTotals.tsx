import type { CartTotals as Totals } from "../../lib/cart";
import { formatRupiah } from "../../lib/format";

// Subtotal / (diskon) / pajak / service charge / total. Rows for zero-value
// optional charges are omitted so a plain shop sees just Subtotal + Total.
export function CartTotals({ totals, taxPercent, serviceChargePercent, diskon = 0 }: { totals: Totals; taxPercent: number; serviceChargePercent: number; diskon?: number }) {
  const row = (label: string, value: string, cls = "text-[var(--text-secondary)]") => (
    <div className={`flex justify-between text-[13px] ${cls}`}>
      <span>{label}</span>
      <span className="font-tabular font-semibold">{value}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-1.5">
      {row("Subtotal", formatRupiah(totals.subtotal))}
      {diskon > 0 && row("Diskon", `-${formatRupiah(diskon)}`)}
      {totals.pajak > 0 && row(`Pajak (${taxPercent}%)`, formatRupiah(totals.pajak))}
      {totals.serviceCharge > 0 && row(`Service (${serviceChargePercent}%)`, formatRupiah(totals.serviceCharge))}
      <div className="mt-1 flex items-baseline justify-between border-t border-dashed border-[var(--border)] pt-2.5">
        <span className="font-display text-sm font-bold text-[var(--text)]">Total</span>
        <span className="font-tabular font-display text-xl font-extrabold text-[var(--text)]">{formatRupiah(totals.total)}</span>
      </div>
    </div>
  );
}
