import type { Produk } from "../../types";
import { formatRupiah } from "../../lib/format";
import { PlusIcon } from "../ui/icons";

export function ProductCard({ produk, onAdd }: { produk: Produk; onAdd: (p: Produk) => void }) {
  const lowStock = produk.stokTampilan !== null && produk.stokTampilan <= 5;
  return (
    <button
      type="button"
      onClick={() => onAdd(produk)}
      className="shape-card relative flex flex-col items-start gap-1 border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition active:scale-[0.98]"
    >
      {lowStock && (
        <span className="absolute right-2 top-2 rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning-text)]">
          Sisa {produk.stokTampilan}
        </span>
      )}
      <span className="line-clamp-2 text-sm font-semibold text-[var(--text)]">{produk.nama}</span>
      <span className="font-tabular text-sm font-bold text-[var(--brand-600)]">{formatRupiah(produk.harga)}</span>
      <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-500)] text-white">
        <PlusIcon size={16} />
      </span>
    </button>
  );
}
