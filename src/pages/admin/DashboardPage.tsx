import { useMemo } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getProduk, getTransaksi } from "../../lib/sheetsStore";
import { formatRupiah } from "../../lib/format";
import { effectiveTransaksi } from "../../lib/ledger";
import { computeTodayStats, dailySeries, formatDelta, lowStockProducts } from "../../lib/stats";
import { Card, StatCard } from "../../components/ui/Card";
import { BarChart } from "../../components/ui/BarChart";
import { Spinner } from "../../components/ui/Spinner";
import { BoxIcon, CartIcon, ReceiptIcon, WalletIcon } from "../../components/ui/icons";

export function DashboardPage() {
  const { accessToken, spreadsheetId, settings } = useSettings();
  const ready = accessToken && spreadsheetId;
  const { data, loading } = useSheetsData(ready ? () => getTransaksi(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const produkResult = useSheetsData(ready ? () => getProduk(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);

  const view = useMemo(() => {
    const all = data ?? [];
    const stats = computeTodayStats(all);
    const now = new Date();
    const today = effectiveTransaksi(all).filter((t) => new Date(t.tanggalWaktu).toDateString() === now.toDateString());
    const counts = new Map<string, number>();
    for (const t of today) for (const item of t.items) counts.set(item.nama, (counts.get(item.nama) ?? 0) + item.qty);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const week = dailySeries(all, 7).map((p) => ({
      label: p.date.toLocaleDateString("id-ID", { weekday: "short" }),
      value: p.omzet,
      title: `${p.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}: ${formatRupiah(p.omzet)}`,
    }));
    return { stats, best, week };
  }, [data]);

  const low = lowStockProducts(produkResult.data ?? []);
  const countDelta = formatDelta(view.stats.countDelta);
  const omzetDelta = formatDelta(view.stats.omzetDelta);
  const itemsDelta = formatDelta(view.stats.itemsDelta);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Halo, {settings.businessName || "Kasir Rakyat"}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Ringkasan hari ini</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-10 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard tone="green" icon={<ReceiptIcon size={22} />} label="Transaksi Hari Ini" value={String(view.stats.today.count)} delta={countDelta?.text} deltaTone={countDelta?.tone} />
            <StatCard tone="blue" icon={<WalletIcon size={22} />} label="Omzet Hari Ini" value={formatRupiah(view.stats.today.omzet)} delta={omzetDelta?.text} deltaTone={omzetDelta?.tone} />
            <StatCard tone="violet" icon={<CartIcon size={22} />} label="Item Terjual" value={String(view.stats.today.itemsSold)} delta={itemsDelta?.text} deltaTone={itemsDelta?.tone} />
            <StatCard
              tone="amber"
              icon={<BoxIcon size={22} />}
              label="Stok Menipis"
              value={String(low.length)}
              delta={low.length > 0 ? `${low.length} produk perlu restok` : "Stok aman"}
              deltaTone={low.length > 0 ? "down" : "neutral"}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Card>
              <h2 className="mb-2 font-display text-sm font-bold text-[var(--text)]">Omzet 7 Hari Terakhir</h2>
              <BarChart data={view.week} height={210} width={420} />
            </Card>
            <Card>
              <h2 className="mb-3 font-display text-sm font-bold text-[var(--text)]">Produk Terlaris Hari Ini</h2>
              {view.best.length === 0 ? (
                <p className="text-sm text-[var(--text-faint)]">Belum ada penjualan.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {view.best.map(([nama, qty], i) => (
                    <div key={nama} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--brand-50)] text-[11px] font-extrabold text-[var(--brand-700)]">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">{nama}</span>
                      <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-[var(--border-soft)] sm:block">
                        <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: `${(qty / view.best[0][1]) * 100}%` }} />
                      </div>
                      <span className="font-tabular w-9 text-right text-xs font-bold text-[var(--text-secondary)]">{qty}x</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
