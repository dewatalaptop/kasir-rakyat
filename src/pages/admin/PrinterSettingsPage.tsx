import { useState } from "react";
import { PageTip } from "../../components/help/PageTip";
import { markStep } from "../../lib/guide";
import { useSettings } from "../../context/SettingsContext";
import { usePrinter, type PrinterStatus } from "../../context/PrinterContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { PrinterIcon, SmartphoneIcon } from "../../components/ui/icons";
import { PAPER_WIDTHS, type PaperWidthKey } from "../../lib/escpos";
import { printViaBrowser, printViaRawBT } from "../../lib/printing";
import type { Pengaturan, Transaksi } from "../../types";

const SAMPLE_TRANSAKSI: Transaksi = {
  id: "contoh-0000-0000-0000-000000000000",
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

const PREFS: { key: Pengaturan["printerPref"]; label: string; desc: string; nativeOnly?: boolean }[] = [
  { key: "bluetooth", label: "Bluetooth langsung", desc: "Aplikasi Android terhubung sendiri ke printer thermal Bluetooth LE — tanpa aplikasi tambahan.", nativeOnly: true },
  { key: "rawbt", label: "RawBT", desc: "Pakai aplikasi RawBT (gratis) yang sudah terhubung ke printermu — cocok untuk printer Bluetooth klasik." },
  { key: "browser", label: "Cetak Browser", desc: "Tanpa aplikasi tambahan, untuk printer USB/jaringan di komputer/laptop." },
];

const STATUS_LABEL: Record<PrinterStatus, string> = {
  disconnected: "Belum terhubung",
  scanning: "Mencari printer...",
  connecting: "Menghubungkan...",
  connected: "Terhubung",
  printing: "Mencetak...",
  error: "Gagal",
};

export function PrinterSettingsPage() {
  const { settings, updateSettings, plan } = useSettings();
  const printer = usePrinter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  async function handlePrefChange(pref: Pengaturan["printerPref"]) {
    setBusy(true);
    try {
      await updateSettings({ printer_pref: pref });
      markStep("printer");
    } finally {
      setBusy(false);
    }
  }

  async function testBluetooth() {
    try {
      await printer.printTestPage(settings.businessName);
      show("Halaman tes dikirim ke printer.", "success");
      markStep("printer");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal mencetak.", "error");
    }
  }

  const statusTone =
    printer.status === "connected" || printer.status === "printing"
      ? "bg-[var(--success-bg)] text-[var(--success-text)]"
      : printer.status === "error"
        ? "bg-[var(--error-bg)] text-[var(--error-text)]"
        : "bg-[var(--border-soft)] text-[var(--text-secondary)]";

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Pengaturan Printer</h1>
      <PageTip id="printer-cara" title="Belum punya printer? Tidak masalah">
        Struk tetap bisa dibagikan atau dicetak lewat browser. Printer thermal Bluetooth LE bisa tersambung langsung di aplikasi Android; printer lain lewat aplikasi RawBT. Setelah memilih, tekan “Cetak Halaman Tes”.
      </PageTip>

      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Cara mencetak struk">
        {PREFS.map((p) => {
          const unavailable = p.nativeOnly && !printer.isNative;
          const selected = settings.printerPref === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy || unavailable}
              onClick={() => handlePrefChange(p.key)}
              className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                selected ? "border-[var(--brand-400)] bg-[var(--brand-50)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand-300)]"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                {p.label}
                {selected && <span className="rounded-full bg-[var(--brand-500)] px-2 py-0.5 text-[10px] font-bold text-white">Dipakai</span>}
                {unavailable && <span className="rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--warning-text)]">Hanya di aplikasi Android</span>}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{p.desc}</span>
            </button>
          );
        })}
      </div>

      {printer.isNative && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--kpi-blue-bg)] text-[var(--kpi-blue-fg)]">
              <PrinterIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text)]">Printer Bluetooth</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">{printer.connectedName ?? "Belum ada printer terhubung"}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone}`}>{STATUS_LABEL[printer.status]}</span>
          </div>

          {printer.error && (
            <p role="alert" className="rounded-xl bg-[var(--error-bg)] px-3 py-2 text-xs text-[var(--error-text)]">
              {printer.error}
            </p>
          )}

          {printer.isConnected ? (
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 text-xs font-bold text-[var(--text-secondary)]">Lebar kertas</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PAPER_WIDTHS) as PaperWidthKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => printer.setPaperWidth(k)}
                      className={`min-h-[44px] rounded-xl border text-sm font-bold ${
                        printer.paperWidth === k ? "border-[var(--brand-400)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {PAPER_WIDTHS[k].label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--border)] px-3 text-sm text-[var(--text)]">
                <input type="checkbox" className="h-5 w-5 accent-[var(--brand-500)]" checked={printer.autoPrint} onChange={(e) => printer.setAutoPrint(e.target.checked)} />
                Cetak otomatis setiap transaksi selesai
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={testBluetooth} disabled={printer.status === "printing"} icon={<PrinterIcon size={16} />}>
                  {printer.status === "printing" ? "Mencetak..." : "Tes Cetak"}
                </Button>
                <Button onClick={() => printer.disconnect()} variant="ghost">
                  Putuskan
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Button onClick={() => (printer.status === "scanning" ? printer.stopScan() : printer.scan())} variant="soft" icon={<SmartphoneIcon size={16} />} disabled={printer.status === "connecting"}>
                {printer.status === "scanning" ? "Berhenti mencari" : "Cari Printer"}
              </Button>
              {printer.devices.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {printer.devices.map((d) => (
                    <li key={d.deviceId}>
                      <button
                        type="button"
                        onClick={() => printer.connect(d)}
                        className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[var(--border)] px-3 text-left text-sm font-semibold text-[var(--text)] hover:border-[var(--brand-300)]"
                      >
                        <span className="truncate">{d.name}</span>
                        <span className="text-xs font-bold text-[var(--brand-600)]">Hubungkan</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-[var(--text-faint)]">
                Nyalakan printer, aktifkan Bluetooth dan Lokasi di HP, lalu ketuk Cari Printer. Printer Bluetooth klasik (bukan LE) tidak muncul di sini — pakai RawBT untuk itu.
              </p>
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3">
        <p className="text-xs font-semibold text-[var(--text-secondary)]">Tes Cetak Struk Contoh</p>
        <Button onClick={() => printViaRawBT(SAMPLE_TRANSAKSI, settings, plan === "gratis", PAPER_WIDTHS[printer.paperWidth].chars)} variant="ghost" fullWidth>
          Tes via RawBT
        </Button>
        <Button onClick={printViaBrowser} variant="ghost" fullWidth>
          Tes via Browser
        </Button>
      </div>
    </div>
  );
}
