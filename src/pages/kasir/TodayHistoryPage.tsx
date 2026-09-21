import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getTransaksi } from "../../lib/sheetsStore";
import { effectiveTransaksi } from "../../lib/ledger";
import { useAccess } from "../../context/AccessContext";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { EmptyState } from "../../components/ui/EmptyState";
import { ReceiptIcon } from "../../components/ui/icons";
import { Spinner } from "../../components/ui/Spinner";
import { TopBar } from "../../components/layout/TopBar";

export function TodayHistoryPage() {
  const { accessToken, spreadsheetId } = useSettings();
  const navigate = useNavigate();
  const { activeKasir, can, actorName } = useAccess();
  // A kasir without the "riwayat" permission only sees their own sales.
  const ownOnly = !!activeKasir && !can("riwayat");
  const { data, loading, error } = useSheetsData(
    accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null,
    [accessToken, spreadsheetId]
  );

  const today = useMemo(() => {
    const now = new Date();
    return effectiveTransaksi(data ?? []).filter(
      (t) => new Date(t.tanggalWaktu).toDateString() === now.toDateString() && (!ownOnly || t.kasirNama === actorName)
    );
  }, [data, ownOnly, actorName]);

  const total = today.reduce((s, t) => s + t.total, 0);

  return (
    <div>
      <TopBar title="Riwayat Hari Ini" subtitle={`${today.length} transaksi · ${formatRupiah(total)}`} />
      <div className="mx-auto max-w-3xl px-4 pb-6 pt-2 lg:px-6">
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
              className="shape-card card-shadow flex min-h-[56px] items-center justify-between border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition hover:border-[var(--brand-300)]"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{formatDateTime(t.tanggalWaktu)}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t.jumlahItem} item · {PAYMENT_METHOD_LABEL[t.metodeBayar]}
                </p>
              </div>
              <span className="font-tabular text-sm font-extrabold text-[var(--brand-600)]">{formatRupiah(t.total)}</span>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
