import { useState } from "react";
import { markStep } from "../../lib/guide";
import { useNavigate } from "react-router-dom";
import { PaymentMethodPicker } from "../../components/checkout/PaymentMethodPicker";
import { CashReceivedInput } from "../../components/checkout/CashReceivedInput";
import { Button } from "../../components/ui/Button";
import { TopBar } from "../../components/layout/TopBar";
import { CartTotals } from "../../components/cart/CartTotals";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../hooks/useAuth";
import { useAccess } from "../../context/AccessContext";
import { useToast } from "../../components/ui/Toast";
import { computeTotals } from "../../lib/cart";
import { buildTransaksi, submitTransaksi } from "../../lib/checkout";
import { formatRupiah } from "../../lib/format";
import type { PaymentMethod } from "../../types";

export function PaymentPage() {
  const { state, dispatch } = useCart();
  const { settings, accessToken, spreadsheetId } = useSettings();
  const { user } = useAuth();
  const { actorName } = useAccess();
  const { show } = useToast();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod | null>("tunai");
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
        kasirNama: actorName,
        settings: { taxPercent: settings.taxPercent, serviceChargePercent: settings.serviceChargePercent },
      });
      const result = await submitTransaksi(accessToken, spreadsheetId, transaksi);
      if (result.status === "queued-offline") {
        show("Transaksi tersimpan offline, akan disinkron otomatis.", "info");
      } else if (result.status === "auth-expired") {
        show("Sesi Google Sheets berakhir — transaksi aman di perangkat ini. Ketuk \"Sambungkan Ulang\" di bagian atas layar agar terkirim.", "error");
      } else {
        show("Transaksi berhasil disimpan.", "success");
      }
      dispatch({ type: "clear" });
      markStep("jual");
      navigate(`/kasir/struk/${transaksi.id}`, { state: { transaksi, fresh: true } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TopBar title="Pembayaran" subtitle="Pilih metode dan konfirmasi pembayaran" />
      <div className="mx-auto grid max-w-4xl gap-5 px-4 pb-8 pt-2 lg:grid-cols-[1fr_20rem] lg:px-6">
        <div className="flex flex-col gap-5">
          <div className="shape-card card-shadow rounded-2xl bg-[var(--brand-500)] p-5 text-center text-white">
            <p className="text-xs font-semibold text-white/80">Total Bayar</p>
            <p className="font-tabular text-3xl font-extrabold">{formatRupiah(totals.total)}</p>
          </div>
          <PaymentMethodPicker value={method} onChange={setMethod} />
          {method === "tunai" && <CashReceivedInput total={totals.total} value={uangDiterima} onChange={setUangDiterima} />}
          <Button onClick={handleConfirm} disabled={!canConfirm} fullWidth className="text-base">
            {busy ? "Menyimpan..." : "Konfirmasi Diterima"}
          </Button>
        </div>
        <aside className="shape-card card-shadow h-fit border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="mb-2 font-display text-sm font-bold text-[var(--text)]">Ringkasan pesanan</h2>
          <ul className="mb-3 flex flex-col gap-1 border-b border-[var(--border-soft)] pb-3 text-[13px] text-[var(--text-secondary)]">
            {state.lines.map((l) => (
              <li key={l.produkId} className="flex justify-between gap-3">
                <span className="truncate">
                  {l.qty}× {l.nama}
                </span>
                <span className="font-tabular font-semibold">{formatRupiah(l.harga * l.qty)}</span>
              </li>
            ))}
          </ul>
          <CartTotals totals={totals} taxPercent={settings.taxPercent} serviceChargePercent={settings.serviceChargePercent} />
        </aside>
      </div>
    </div>
  );
}
