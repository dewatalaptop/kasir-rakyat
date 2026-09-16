import type { Produk } from "../../types";
import { ProductCard } from "./ProductCard";
import { EmptyState } from "../ui/EmptyState";
import { GridIcon } from "../ui/icons";

export function ProductGrid({ produk, onAdd }: { produk: Produk[]; onAdd: (p: Produk) => void }) {
  if (produk.length === 0) {
    return <EmptyState icon={<GridIcon size={32} />} title="Belum ada produk" description="Tambahkan produk lewat menu Admin > Produk." />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {produk.map((p) => (
        <ProductCard key={p.id} produk={p} onAdd={onAdd} />
      ))}
    </div>
  );
}
