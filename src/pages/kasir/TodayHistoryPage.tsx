import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getTransaksi } from "../../lib/sheetsStore";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { EmptyState } from "../../components/ui/EmptyState";
import { ReceiptIcon } from "../../components/ui/icons";
import { Spinner } from "../../components/ui/Spinner";

export function TodayHistoryPage() {
  const { accessToken, spreadsheetId } = useSettings();
  const navigate = useNavigate();
  const { data, loading, error } = useSheetsData(
    accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null,
    [accessToken, spreadsheetId]
  );

  const today = useMemo(() => {
    const now = new Date();
    return (data ?? []).filter((t) => {
      const d = new Date(t.tanggalWaktu);
      return d.toDateString() === now.toDateString() && t.status === "selesai";
    });
  }, [data]);

  const total = today.reduce((s, t) => s + t.total, 0);

  return (
    <div className="p-4">
      <h1 className="mb-1 font-display text-lg font-bold text-[var(--text)]">Riwayat Hari Ini</h1>
      <p className="font-tabular mb-4 text-sm text-[var(--text-secondary)]">
        {today.length} transaksi · {formatRupiah(total)}
      </p>
      {loading ? (
        <div className="flex justify-center py-8 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-[var(--error-text)]">{error}</p>
      ) : today.length === 0 ? (
        <EmptyState icon={<ReceiptIcon size={32} />} title="Belum ada transaksi hari ini" />
      ) : (
        <div className="flex flex-col gap-2">
          {today.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/kasir/struk/${t.id}`, { state: { transaksi: t } })}
              className="shape-card flex items-center justify-between border border-[var(--border)] bg-[var(--surface)] p-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{formatDateTime(t.tanggalWaktu)}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t.jumlahItem} item · {PAYMENT_METHOD_LABEL[t.metodeBayar]}
                </p>
              </div>
              <span className="font-tabular text-sm font-bold text-[var(--brand-600)]">{formatRupiah(t.total)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
