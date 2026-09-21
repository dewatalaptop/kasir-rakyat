import { useMemo, useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getTransaksi } from "../../lib/sheetsStore";
import { formatRupiah } from "../../lib/format";
import { limitsFor } from "../../lib/limits";
import { dailySeries } from "../../lib/stats";
import { effectiveTransaksi } from "../../lib/ledger";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "../../types";
import { Card, StatCard } from "../../components/ui/Card";
import { BarChart, type BarDatum } from "../../components/ui/BarChart";
import { Spinner } from "../../components/ui/Spinner";
import { CartIcon, ChartIcon, LockIcon, ReceiptIcon, TrendIcon, WalletIcon } from "../../components/ui/icons";
import { useToast } from "../../components/ui/Toast";

const RANGE_OPTIONS = [
  { key: "7", label: "7 Hari" },
  { key: "30", label: "30 Hari" },
  { key: "90", label: "90 Hari" },
];

type TabKey = "penjualan" | "produk" | "bayar";
const TABS: { key: TabKey; label: string }[] = [
  { key: "penjualan", label: "Penjualan" },
  { key: "produk", label: "Produk Terlaris" },
  { key: "bayar", label: "Metode Pembayaran" },
];

const dayLabel = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

export function ReportsPage() {
  const { accessToken, spreadsheetId, plan } = useSettings();
  const { show } = useToast();
  const [rangeDays, setRangeDays] = useState("7");
  const [tab, setTab] = useState<TabKey>("penjualan");
  const { data, loading } = useSheetsData(accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const allowedDays = limitsFor(plan).laporanDayOptions;

  const report = useMemo(() => {
    const days = Number(rangeDays);
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const inRange = effectiveTransaksi(data ?? []).filter((t) => new Date(t.tanggalWaktu).getTime() >= cutoff.getTime());
    const total = inRange.reduce((s, t) => s + t.total, 0);
    const itemsSold = inRange.reduce((s, t) => s + t.jumlahItem, 0);
    const byMethod = new Map<PaymentMethod, number>();
    const byProduct = new Map<string, { qty: number; omzet: number }>();
    for (const t of inRange) {
      byMethod.set(t.metodeBayar, (byMethod.get(t.metodeBayar) ?? 0) + t.total);
      for (const item of t.items) {
        const cur = byProduct.get(item.nama) ?? { qty: 0, omzet: 0 };
        byProduct.set(item.nama, { qty: cur.qty + item.qty, omzet: cur.omzet + item.qty * item.harga });
      }
    }
    const bestSellers = [...byProduct.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);

    // Daily bars up to a month; longer ranges are bucketed weekly so the
    // chart never turns into 90 unreadable slivers.
    const series = dailySeries(data ?? [], days);
    let bars: BarDatum[];
    if (days <= 31) {
      bars = series.map((p) => ({
        label: dayLabel(p.date),
        value: p.omzet,
        title: `${p.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}: ${formatRupiah(p.omzet)} (${p.count} transaksi)`,
      }));
    } else {
      bars = [];
      for (let i = 0; i < series.length; i += 7) {
        const chunk = series.slice(i, i + 7);
        const sum = chunk.reduce((s, p) => s + p.omzet, 0);
        const cnt = chunk.reduce((s, p) => s + p.count, 0);
        bars.push({
          label: dayLabel(chunk[0].date),
          value: sum,
          title: `Minggu ${dayLabel(chunk[0].date)} – ${dayLabel(chunk[chunk.length - 1].date)}: ${formatRupiah(sum)} (${cnt} transaksi)`,
        });
      }
    }
    return { total, count: inRange.length, itemsSold, byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]), bestSellers, bars };
  }, [data, rangeDays]);

  const avg = report.count > 0 ? Math.round(report.total / report.count) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Laporan Penjualan</h1>
          <p className="text-xs text-[var(--text-secondary)]">Hanya transaksi selesai yang dihitung</p>
        </div>
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
                className={`flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition ${
                  rangeDays === r.key
                    ? "bg-[var(--brand-500)] text-white shadow-sm"
                    : locked
                      ? "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-faint)]"
                      : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--brand-300)]"
                }`}
              >
                {locked && <LockIcon size={12} />}
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="tablist" className="scrollbar-hide -mx-1 flex gap-1 overflow-x-auto border-b border-[var(--border)] px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px min-h-[44px] flex-none border-b-2 px-4 text-sm font-bold transition ${
              tab === t.key ? "border-[var(--brand-500)] text-[var(--brand-700)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard tone="green" icon={<WalletIcon size={22} />} label="Total Penjualan" value={formatRupiah(report.total)} />
            <StatCard tone="blue" icon={<ReceiptIcon size={22} />} label="Total Transaksi" value={String(report.count)} />
            <StatCard tone="violet" icon={<TrendIcon size={22} />} label="Rata-rata / Transaksi" value={formatRupiah(avg)} />
            <StatCard tone="amber" icon={<CartIcon size={22} />} label="Item Terjual" value={String(report.itemsSold)} />
          </div>

          {tab === "penjualan" && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <ChartIcon size={18} className="text-[var(--brand-500)]" />
                <h2 className="font-display text-sm font-bold text-[var(--text)]">Grafik Penjualan</h2>
                <span className="text-xs text-[var(--text-faint)]">{Number(rangeDays) > 31 ? "per minggu" : "per hari"}</span>
              </div>
              <BarChart data={report.bars} />
            </Card>
          )}

          {tab === "produk" && (
            <Card className="!p-0 overflow-hidden">
              <div className="border-b border-[var(--border-soft)] px-4 py-3">
                <h2 className="font-display text-sm font-bold text-[var(--text)]">Produk Terlaris</h2>
              </div>
              {report.bestSellers.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--text-faint)]">Belum ada data.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                      <th className="w-10 px-4 py-2">#</th>
                      <th className="py-2">Produk</th>
                      <th className="px-2 py-2 text-right">Jumlah</th>
                      <th className="px-4 py-2 text-right">Penjualan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bestSellers.map(([nama, v], i) => (
                      <tr key={nama} className="border-t border-[var(--border-soft)]">
                        <td className="px-4 py-2.5 font-bold text-[var(--text-faint)]">{i + 1}</td>
                        <td className="max-w-0 truncate py-2.5 font-semibold text-[var(--text)]">{nama}</td>
                        <td className="font-tabular px-2 py-2.5 text-right font-bold text-[var(--text)]">{v.qty}</td>
                        <td className="font-tabular px-4 py-2.5 text-right text-[var(--text-secondary)]">{formatRupiah(v.omzet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}

          {tab === "bayar" && (
            <Card>
              <h2 className="mb-3 font-display text-sm font-bold text-[var(--text)]">Berdasarkan Metode Pembayaran</h2>
              {report.byMethod.length === 0 ? (
                <p className="text-sm text-[var(--text-faint)]">Belum ada data.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {report.byMethod.map(([m, amount]) => (
                    <div key={m}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-[var(--text)]">{PAYMENT_METHOD_LABEL[m]}</span>
                        <span className="font-tabular font-bold text-[var(--text)]">
                          {formatRupiah(amount)} <span className="font-medium text-[var(--text-faint)]">· {report.total ? Math.round((amount / report.total) * 100) : 0}%</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border-soft)]">
                        <div className="h-full rounded-full bg-[var(--brand-500)]" style={{ width: `${report.total ? (amount / report.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
