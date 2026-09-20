import type { Produk, Transaksi } from "../../types";
import { formatRupiah } from "../../lib/format";
import { computeTodayStats, formatDelta, lowStockProducts } from "../../lib/stats";
import { StatCard } from "../ui/Card";
import { BoxIcon, CartIcon, ReceiptIcon, WalletIcon } from "../ui/icons";

// Today's numbers strip on the desktop cashier screen. `transaksi` may be
// null while loading/failed — tiles then show "–" rather than a fake 0.
export function KpiRow({ transaksi, produk }: { transaksi: Transaksi[] | null; produk: Produk[] }) {
  const stats = transaksi ? computeTodayStats(transaksi) : null;
  const low = lowStockProducts(produk);
  const countDelta = stats ? formatDelta(stats.countDelta, true) : null;
  const omzetDelta = stats ? formatDelta(stats.omzetDelta, true) : null;
  const itemsDelta = stats ? formatDelta(stats.itemsDelta, true) : null;
  return (
    <div className="hidden gap-3 px-6 pb-3 pt-2 lg:grid lg:grid-cols-4">
      <StatCard
        compact
        tone="green"
        icon={<ReceiptIcon size={22} />}
        label="Transaksi Hari Ini"
        value={stats ? String(stats.today.count) : "–"}
        delta={countDelta?.text}
        deltaTone={countDelta?.tone}
      />
      <StatCard
        compact
        tone="blue"
        icon={<WalletIcon size={22} />}
        label="Omzet Hari Ini"
        value={stats ? formatRupiah(stats.today.omzet) : "–"}
        delta={omzetDelta?.text}
        deltaTone={omzetDelta?.tone}
      />
      <StatCard
        compact
        tone="violet"
        icon={<CartIcon size={22} />}
        label="Item Terjual"
        value={stats ? String(stats.today.itemsSold) : "–"}
        delta={itemsDelta?.text}
        deltaTone={itemsDelta?.tone}
      />
      <StatCard
        compact
        tone="amber"
        icon={<BoxIcon size={22} />}
        label="Stok Menipis"
        value={String(low.length)}
        delta={low.length > 0 ? `${low.length} perlu restok` : "Stok aman"}
        deltaTone={low.length > 0 ? "down" : "neutral"}
      />
    </div>
  );
}
