import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Transaksi } from "../../types";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { serviceChargeOf } from "../../lib/receipt";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useSettings } from "../../context/SettingsContext";
import { appendTransaksi, getTransaksi } from "../../lib/sheetsStore";
import { isVoided } from "../../lib/ledger";
import { useAccess } from "../../context/AccessContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { useToast } from "../../components/ui/Toast";

export function TransactionDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken, spreadsheetId } = useSettings();
  const { can, actorName } = useAccess();
  const listResult = useSheetsData(accessToken && spreadsheetId ? () => getTransaksi(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const t = (location.state as { transaksi?: Transaksi } | null)?.transaksi;

  if (!t) {
    return (
      <div className="p-4 text-center text-sm text-[var(--text-secondary)]">
        Transaksi tidak ditemukan. <Button onClick={() => navigate("/admin/transaksi")}>Kembali</Button>
      </div>
    );
  }

  async function handleCancel() {
    if (!accessToken || !spreadsheetId || !t || busy) return;
    if (!can("batalkan")) {
      show("Kamu tidak punya izin membatalkan transaksi.", "error");
      return;
    }
    if (!confirm("Batalkan transaksi ini? Ini akan mencatat baris pembatalan baru, bukan menghapus riwayat.")) return;
    setBusy(true);
    try {
      // Cancellation is a NEW appended row, never an edit to the
      // original — preserves the append-only guarantee even for
      // corrections (see plan: Transaksi tab is append-only, no
      // exceptions).
      // Re-read right before writing: another device may have voided it meanwhile.
      const fresh = await getTransaksi(accessToken, spreadsheetId);
      if (isVoided(t, fresh)) {
        show("Transaksi ini sudah dibatalkan.", "info");
        navigate("/admin/transaksi");
        return;
      }
      const cancellation: Transaksi = {
        ...t,
        id: crypto.randomUUID(),
        tanggalWaktu: new Date().toISOString(),
        // who voided it (the original row keeps who sold it)
        kasirNama: actorName,
        status: "dibatalkan",
        idTransaksiAsal: t.id,
      };
      await appendTransaksi(accessToken, spreadsheetId, cancellation);
      show("Transaksi dibatalkan.", "success");
      navigate("/admin/transaksi");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal membatalkan transaksi.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Detail Transaksi</h1>
      <Card>
        <p className="text-sm text-[var(--text-secondary)]">{formatDateTime(t.tanggalWaktu)}</p>
        <p className="text-sm text-[var(--text-secondary)]">Kasir: {t.kasirNama}</p>
        {t.meja && <p className="text-sm text-[var(--text-secondary)]">Meja: {t.meja}</p>}
        <div className="my-3 flex flex-col gap-1.5 border-y border-[var(--border-soft)] py-3">
          {t.items.map((item) => (
            <div key={item.produkId} className="flex justify-between text-sm">
              <span className="text-[var(--text)]">
                {item.nama} x{item.qty}
              </span>
              <span className="font-tabular text-[var(--text-secondary)]">{formatRupiah(item.harga * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="mb-2 flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-tabular">{formatRupiah(t.subtotal)}</span></div>
          {t.diskon > 0 && <div className="flex justify-between"><span>Diskon</span><span className="font-tabular">-{formatRupiah(t.diskon)}</span></div>}
          {t.pajak > 0 && <div className="flex justify-between"><span>Pajak</span><span className="font-tabular">{formatRupiah(t.pajak)}</span></div>}
          {serviceChargeOf(t) > 0 && <div className="flex justify-between"><span>Service</span><span className="font-tabular">{formatRupiah(serviceChargeOf(t))}</span></div>}
        </div>
        <div className="flex justify-between font-display text-base font-bold text-[var(--text)]">
          <span>Total</span>
          <span className="font-tabular">{formatRupiah(t.total)}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Bayar: {PAYMENT_METHOD_LABEL[t.metodeBayar]}</p>
      </Card>
      {t.status === "selesai" && !isVoided(t, listResult.data ?? []) && can("batalkan") && (
        <Button onClick={handleCancel} disabled={busy} variant="danger" fullWidth>
          {busy ? "Membatalkan..." : "Batalkan Transaksi"}
        </Button>
      )}
    </div>
  );
}
