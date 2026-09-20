import { useLocation, useNavigate } from "react-router-dom";
import { ReceiptView } from "../../components/receipt/ReceiptView";
import { ReceiptActions } from "../../components/receipt/ReceiptActions";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/Button";
import { PlusIcon } from "../../components/ui/icons";
import { useSettings } from "../../context/SettingsContext";
import type { Transaksi } from "../../types";

export function ReceiptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, plan } = useSettings();
  const transaksi = (location.state as { transaksi?: Transaksi } | null)?.transaksi;
  const watermark = plan === "gratis";

  if (!transaksi) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Struk tidak ditemukan. Lihat riwayat transaksi untuk detail.</p>
        <Button onClick={() => navigate("/kasir/riwayat")}>Ke Riwayat</Button>
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Struk Transaksi" subtitle="Cetak atau simpan bukti pembayaran" />
      <div className="mx-auto grid max-w-3xl gap-5 px-4 pb-8 pt-3 md:grid-cols-[minmax(0,20rem)_1fr] md:items-start lg:px-6">
        <ReceiptView t={transaksi} p={settings} watermark={watermark} />
        <div className="flex flex-col gap-3">
          <ReceiptActions t={transaksi} p={settings} watermark={watermark} />
          <Button onClick={() => navigate("/kasir")} variant="soft" fullWidth icon={<PlusIcon size={18} />}>
            Transaksi Baru
          </Button>
        </div>
      </div>
    </div>
  );
}
