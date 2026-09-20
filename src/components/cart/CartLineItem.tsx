import type { CartLine } from "../../types";
import { formatRupiah } from "../../lib/format";
import { ProductThumb } from "../catalog/ProductThumb";
import { MinusIcon, PlusIcon, TrashIcon } from "../ui/icons";

// One cart row, laid out in two lines so it stays readable in the narrow
// side panel:  [thumb] name ........ [trash]
//                      qty x price
//                      [− 2 +] ....... line total
// Stepper buttons are 36px in the dense panel; `roomy` makes them 44px for the
// full-screen phone cart.
export function CartLineItem({
  line,
  onSetQty,
  onRemove,
  roomy = false,
}: {
  line: CartLine;
  onSetQty: (qty: number) => void;
  onRemove: () => void;
  roomy?: boolean;
}) {
  const btn = roomy ? "h-11 w-11" : "h-9 w-9";
  return (
    <div className="flex gap-3 border-b border-[var(--border-soft)] py-3 last:border-b-0">
      <ProductThumb produk={line} className="h-14 w-14 flex-none rounded-xl text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--text)]">{line.nama}</p>
            <p className="font-tabular text-xs text-[var(--text-secondary)]">{formatRupiah(line.harga)}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Hapus ${line.nama}`}
            className="-mr-1.5 -mt-1.5 flex h-9 w-9 flex-none items-center justify-center rounded-full text-[var(--danger)] hover:bg-[var(--error-bg)]"
          >
            <TrashIcon size={16} />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSetQty(line.qty - 1)}
              aria-label={`Kurangi ${line.nama}`}
              className={`${btn} flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] active:bg-[var(--border-soft)]`}
            >
              <MinusIcon size={15} />
            </button>
            <span className="font-tabular w-8 text-center text-sm font-extrabold">{line.qty}</span>
            <button
              type="button"
              onClick={() => onSetQty(line.qty + 1)}
              aria-label={`Tambah ${line.nama}`}
              className={`${btn} flex items-center justify-center rounded-full bg-[var(--brand-500)] text-white active:bg-[var(--brand-600)]`}
            >
              <PlusIcon size={15} />
            </button>
          </div>
          <p className="font-tabular text-sm font-extrabold text-[var(--text)]">{formatRupiah(line.harga * line.qty)}</p>
        </div>
      </div>
    </div>
  );
}
