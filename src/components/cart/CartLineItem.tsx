import type { CartLine } from "../../types";
import { formatRupiah } from "../../lib/format";
import { MinusIcon, PlusIcon, TrashIcon } from "../ui/icons";

export function CartLineItem({ line, onSetQty, onRemove }: { line: CartLine; onSetQty: (qty: number) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border-soft)] py-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--text)]">{line.nama}</p>
        <p className="font-tabular text-xs text-[var(--text-secondary)]">{formatRupiah(line.harga)}</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSetQty(line.qty - 1)}
          aria-label="Kurangi"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]"
        >
          <MinusIcon size={16} />
        </button>
        <span className="font-tabular w-7 text-center text-sm font-semibold">{line.qty}</span>
        <button
          type="button"
          onClick={() => onSetQty(line.qty + 1)}
          aria-label="Tambah"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-500)] text-white"
        >
          <PlusIcon size={16} />
        </button>
      </div>
      <button type="button" onClick={onRemove} aria-label="Hapus" className="flex h-9 w-9 items-center justify-center text-[var(--danger)]">
        <TrashIcon size={16} />
      </button>
    </div>
  );
}
