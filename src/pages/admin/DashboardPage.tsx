import { useMemo } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getTransaksi } from "../../lib/sheetsStore";
import { formatRupiah } from "../../lib/format";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";

export function DashboardPage() {
  const { accessToken, spreadsheetId, settings } = useSettings();
  const { data, loading } = useSheetsData(
    accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null,
    [accessToken, spreadsheetId]
  );

  const stats = useMemo(() => {
    const now = new Date();
    const today = (data ?? []).filter((t) => t.status === "selesai" && new Date(t.tanggalWaktu).toDateString() === now.toDateString());
    const omzet = today.reduce((s, t) => s + t.total, 0);
    const counts = new Map<string, number>();
    for (const t of today) for (const item of t.items) counts.set(item.nama, (counts.get(item.nama) ?? 0) + item.qty);
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { omzet, count: today.length, best };
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--text)]">Halo, {settings.businessName || "Kasir Rakyat"}</h1>
        <p className="text-sm text-[var(--text-secondary)]">Ringkasan hari ini</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-8 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-[var(--text-secondary)]">Omzet Hari Ini</p>
              <p className="font-tabular text-xl font-extrabold text-[var(--brand-600)]">{formatRupiah(stats.omzet)}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--text-secondary)]">Jumlah Transaksi</p>
              <p className="font-tabular text-xl font-extrabold text-[var(--accent-500)]">{stats.count}</p>
            </Card>
          </div>
          <Card>
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Produk Terlaris Hari Ini</p>
            {stats.best.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">Belum ada penjualan.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.best.map(([nama, qty]) => (
                  <div key={nama} className="flex items-center gap-2">
                    <span className="flex-1 text-sm text-[var(--text)]">{nama}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-soft)]">
                      <div
                        className="h-full rounded-full bg-[var(--brand-500)]"
                        style={{ width: `${(qty / stats.best[0][1]) * 100}%` }}
                      />
                    </div>
                    <span className="font-tabular w-8 text-right text-xs text-[var(--text-secondary)]">{qty}x</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
