import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { Button } from "../../components/ui/Button";
import { printViaBrowser, printViaRawBT } from "../../lib/printing";
import type { Transaksi } from "../../types";

const SAMPLE_TRANSAKSI: Transaksi = {
  id: "contoh",
  tanggalWaktu: new Date().toISOString(),
  kasirEmail: "kasir@contoh.com",
  kasirNama: "Kasir Contoh",
  meja: "",
  items: [
    { produkId: "1", nama: "Produk Contoh", harga: 15000, qty: 2 },
    { produkId: "2", nama: "Produk Lain", harga: 5000, qty: 1 },
  ],
  jumlahItem: 3,
  subtotal: 35000,
  diskon: 0,
  pajak: 0,
  total: 35000,
  metodeBayar: "tunai",
  uangDiterima: 40000,
  kembalian: 5000,
  catatan: "",
  status: "selesai",
  idTransaksiAsal: null,
};

export function PrinterSettingsPage() {
  const { settings, updateSettings, plan } = useSettings();
  const [busy, setBusy] = useState(false);

  async function handlePrefChange(pref: "rawbt" | "browser") {
    setBusy(true);
    try {
      await updateSettings({ printer_pref: pref });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Pengaturan Printer</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        <strong>RawBT</strong> (rekomendasi): pasang aplikasi RawBT di HP Android yang terhubung ke printer thermal
        Bluetooth-mu, lalu struk dikirim otomatis lewat aplikasi itu. <strong>Cetak Browser</strong>: fallback
        universal tanpa aplikasi tambahan, cocok untuk printer USB/jaringan di komputer/laptop.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePrefChange("rawbt")}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold ${
            settings.printerPref === "rawbt" ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
          }`}
        >
          RawBT
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePrefChange("browser")}
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold ${
            settings.printerPref === "browser" ? "bg-[var(--brand-500)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
          }`}
        >
          Cetak Browser
        </button>
      </div>
      <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">Tes Cetak Struk Contoh</p>
        <Button onClick={() => printViaRawBT(SAMPLE_TRANSAKSI, settings, plan === "gratis")} variant="ghost" fullWidth>
          Tes via RawBT
        </Button>
        <Button onClick={printViaBrowser} variant="ghost" fullWidth>
          Tes via Browser
        </Button>
        <p className="text-xs text-[var(--text-faint)]">
          Dukungan Bluetooth langsung (tanpa RawBT) direncanakan untuk versi aplikasi Android mendatang.
        </p>
      </div>
    </div>
  );
}
