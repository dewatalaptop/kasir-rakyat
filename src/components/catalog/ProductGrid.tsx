import type { Produk } from "../../types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "../ui/EmptyState";
import { GridIcon, SearchIcon } from "../ui/icons";

export function ProductGrid({
  produk,
  qtyById,
  onAdd,
  searching = false,
}: {
  produk: Produk[];
  qtyById: Map<string, number>;
  onAdd: (p: Produk) => void;
  searching?: boolean;
}) {
  if (produk.length === 0) {
    return searching ? (
      <EmptyState icon={<SearchIcon size={32} />} title="Produk tidak ditemukan" description="Coba kata kunci lain atau pilih kategori Semua." />
    ) : (
      <EmptyState icon={<GridIcon size={32} />} title="Belum ada produk" description="Tambahkan produk lewat menu Kelola > Produk." />
    );
  }
  // Column counts follow the width actually left for the grid: with the
  // cart panel open (xl+) the grid is narrower than at lg (no panel).
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-6 pt-2 sm:grid-cols-3 lg:grid-cols-4 lg:px-6 xl:grid-cols-3 2xl:grid-cols-4">
      {produk.map((p) => (
        <ProductCard key={p.id} produk={p} qtyInCart={qtyById.get(p.id) ?? 0} onAdd={onAdd} />
      ))}
    </div>
  );
}
