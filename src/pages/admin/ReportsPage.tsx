import { useMemo, useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getTransaksi } from "../../lib/sheetsStore";
import { formatRupiah } from "../../lib/format";
import { limitsFor } from "../../lib/limits";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { LockIcon } from "../../components/ui/icons";
import { useToast } from "../../components/ui/Toast";

const RANGE_OPTIONS = [
  { key: "7", label: "7 Hari" },
  { key: "30", label: "30 Hari" },
  { key: "90", label: "90 Hari" },
];

export function ReportsPage() {
  const { accessToken, spreadsheetId, plan } = useSettings();
  const { show } = useToast();
  const [rangeDays, setRangeDays] = useState("7");
  const { data, loading } = useSheetsData(accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const allowedDays = limitsFor(plan).laporanDayOptions;

  const report = useMemo(() => {
    const cutoff = Date.now() - Number(rangeDays) * 86400000;
    const inRange = (data ?? []).filter((t) => t.status === "selesai" && new Date(t.tanggalWaktu).getTime() >= cutoff);
    const total = inRange.reduce((s, t) => s + t.total, 0);
    const byMethod = new Map<string, number>();
    const byProduct = new Map<string, number>();
    for (const t of inRange) {
      byMethod.set(t.metodeBayar, (byMethod.get(t.metodeBayar) ?? 0) + t.total);
      for (const item of t.items) byProduct.set(item.nama, (byProduct.get(item.nama) ?? 0) + item.qty);
    }
    const bestSellers = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { total, count: inRange.length, byMethod: [...byMethod.entries()], bestSellers };
  }, [data, rangeDays]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Laporan</h1>
      <div className="flex gap-2">
        {RANGE_OPTIONS.map((r) => {
          const locked = !allowedDays.includes(Number(r.key));
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                if (locked) {
                  show("Rentang laporan lebih panjang hanya untuk versi berbayar. Hubungi kami untuk upgrade.", "error");
                  return;
                }
                setRangeDays(r.key);
              }}
              className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold ${
                rangeDays === r.key
                  ? "bg-[var(--brand-500)] text-white"
                  : locked
                    ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-faint)]"
                    : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
              }`}
            >
              {locked && <LockIcon size={12} />}
              {r.label}
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="flex justify-center py-8 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <p className="text-xs text-[var(--text-secondary)]">Total Omzet</p>
              <p className="font-tabular text-lg font-extrabold text-[var(--brand-600)]">{formatRupiah(report.total)}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--text-secondary)]">Jumlah Transaksi</p>
              <p className="font-tabular text-lg font-extrabold text-[var(--accent-500)]">{report.count}</p>
            </Card>
          </div>
          <Card>
            <p className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">Produk Terlaris</p>
            {report.bestSellers.length === 0 ? (
              <p className="text-sm text-[var(--text-faint)]">Belum ada data.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {report.bestSellers.map(([nama, qty]) => (
                  <div key={nama} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-sm text-[var(--text)]">{nama}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-soft)]">
                      <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: `${(qty / report.bestSellers[0][1]) * 100}%` }} />
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
