import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PaymentMethodPicker } from "../../components/checkout/PaymentMethodPicker";
import { CashReceivedInput } from "../../components/checkout/CashReceivedInput";
import { Button } from "../../components/ui/Button";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ui/Toast";
import { computeTotals } from "../../lib/cart";
import { buildTransaksi, submitTransaksi } from "../../lib/checkout";
import { formatRupiah } from "../../lib/format";
import type { PaymentMethod } from "../../types";

export function PaymentPage() {
  const { state, dispatch } = useCart();
  const { settings, accessToken, spreadsheetId } = useSettings();
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [uangDiterima, setUangDiterima] = useState(0);
  const [busy, setBusy] = useState(false);

  const totals = computeTotals(state.lines, settings.taxPercent, settings.serviceChargePercent);
  const canConfirm = method !== null && (method !== "tunai" || uangDiterima >= totals.total) && !busy;

  async function handleConfirm() {
    if (!method || !accessToken || !spreadsheetId || !user) return;
    setBusy(true);
    try {
      const transaksi = buildTransaksi({
        lines: state.lines,
        meja: state.meja,
        catatan: state.catatan,
        metodeBayar: method,
        uangDiterima: method === "tunai" ? uangDiterima : null,
        kasirEmail: user.email ?? "",
        kasirNama: user.displayName ?? user.email ?? "Kasir",
        settings: { taxPercent: settings.taxPercent, serviceChargePercent: settings.serviceChargePercent },
      });
      const result = await submitTransaksi(accessToken, spreadsheetId, transaksi);
      if (result.status === "queued-offline") {
        show("Transaksi tersimpan offline, akan disinkron otomatis.", "info");
      } else if (result.status === "auth-expired") {
        show("Sesi Google Sheets berakhir — transaksi tersimpan, sambungkan ulang di Pengaturan.", "error");
      } else {
        show("Transaksi berhasil disimpan.", "success");
      }
      dispatch({ type: "clear" });
      navigate(`/kasir/struk/${transaksi.id}`, { state: { transaksi } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Pembayaran</h1>
      <div className="shape-card border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-xs text-[var(--text-secondary)]">Total Bayar</p>
        <p className="font-tabular text-2xl font-extrabold text-[var(--brand-600)]">{formatRupiah(totals.total)}</p>
      </div>
      <PaymentMethodPicker value={method} onChange={setMethod} />
      {method === "tunai" && <CashReceivedInput total={totals.total} value={uangDiterima} onChange={setUangDiterima} />}
      <Button onClick={handleConfirm} disabled={!canConfirm} fullWidth>
        {busy ? "Menyimpan..." : "Konfirmasi Diterima"}
      </Button>
    </div>
  );
}
