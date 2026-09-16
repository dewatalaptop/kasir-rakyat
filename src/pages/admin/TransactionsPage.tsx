import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getTransaksi } from "../../lib/sheetsStore";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { EmptyState } from "../../components/ui/EmptyState";
import { ReceiptIcon } from "../../components/ui/icons";
import { Spinner } from "../../components/ui/Spinner";

export function TransactionsPage() {
  const { accessToken, spreadsheetId } = useSettings();
  const navigate = useNavigate();
  const { data, loading, error } = useSheetsData(accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Transaksi</h1>
      {loading ? (
        <div className="flex justify-center py-8 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-sm text-[var(--error-text)]">{error}</p>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<ReceiptIcon size={32} />} title="Belum ada transaksi" />
      ) : (
        <div className="flex flex-col gap-2">
          {(data ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/admin/transaksi/${t.id}`, { state: { transaksi: t } })}
              className="shape-card flex items-center justify-between border border-[var(--border)] bg-[var(--surface)] p-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{formatDateTime(t.tanggalWaktu)}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {t.kasirNama} · {t.jumlahItem} item · {PAYMENT_METHOD_LABEL[t.metodeBayar]}
                  {t.status === "dibatalkan" && <span className="ml-1 text-[var(--error-text)]">· Dibatalkan</span>}
                </p>
              </div>
              <span className={`font-tabular text-sm font-bold ${t.status === "dibatalkan" ? "text-[var(--text-faint)] line-through" : "text-[var(--brand-600)]"}`}>
                {formatRupiah(t.total)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
