import type { Produk } from "../../types";
import { formatRupiah } from "../../lib/format";
import { LOW_STOCK_THRESHOLD } from "../../lib/stats";
import { PlusIcon } from "../ui/icons";
import { ProductThumb } from "./ProductThumb";

export function ProductCard({ produk, qtyInCart = 0, onAdd, tourAnchor = false }: { produk: Produk; qtyInCart?: number; onAdd: (p: Produk) => void; tourAnchor?: boolean }) {
  const lowStock = produk.stokTampilan !== null && produk.stokTampilan <= LOW_STOCK_THRESHOLD;
  const soldOut = produk.stokTampilan !== null && produk.stokTampilan <= 0;
  return (
    <button
      type="button"
      data-tour={tourAnchor ? "product" : undefined}
      onClick={() => onAdd(produk)}
      className={`shape-card card-shadow group relative flex flex-col overflow-hidden border bg-[var(--surface)] text-left transition active:scale-[0.98] ${
        qtyInCart > 0 ? "border-[var(--brand-400)] ring-1 ring-[var(--brand-300)]" : "border-[var(--border)] hover:border-[var(--brand-300)]"
      }`}
    >
      <div className="relative aspect-[5/3] w-full overflow-hidden bg-[var(--border-soft)]">
        <ProductThumb produk={produk} className="h-full w-full text-2xl transition duration-200 group-hover:scale-[1.03]" />
        {lowStock && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              soldOut ? "bg-[var(--error-bg)] text-[var(--error-text)]" : "bg-[var(--warning-bg)] text-[var(--warning-text)]"
            }`}
          >
            {soldOut ? "Habis" : `Sisa ${produk.stokTampilan}`}
          </span>
        )}
        {qtyInCart > 0 && (
          <span className="absolute right-2 top-2 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[var(--brand-500)] px-1.5 text-xs font-extrabold text-white shadow">
            {qtyInCart}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <span className="line-clamp-2 min-h-[2.5em] text-[13px] font-bold leading-snug text-[var(--text)]">{produk.nama}</span>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className="font-tabular text-[13px] font-extrabold text-[var(--brand-600)]">{formatRupiah(produk.harga)}</span>
          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] transition group-hover:bg-[var(--brand-500)] group-hover:text-white">
            <PlusIcon size={15} />
          </span>
        </div>
      </div>
    </button>
  );
}
