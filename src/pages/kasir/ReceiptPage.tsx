import { useLocation, useNavigate } from "react-router-dom";
import { ReceiptView } from "../../components/receipt/ReceiptView";
import { ReceiptActions } from "../../components/receipt/ReceiptActions";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../context/SettingsContext";
import type { Transaksi } from "../../types";

export function ReceiptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const transaksi = (location.state as { transaksi?: Transaksi } | null)?.transaksi;

  if (!transaksi) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-sm text-[var(--text-secondary)]">Struk tidak ditemukan. Lihat riwayat transaksi untuk detail.</p>
        <Button onClick={() => navigate("/kasir/riwayat")}>Ke Riwayat</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <ReceiptView t={transaksi} p={settings} />
      <ReceiptActions t={transaksi} p={settings} />
      <Button onClick={() => navigate("/kasir")} variant="ghost" fullWidth>
        Transaksi Baru
      </Button>
    </div>
  );
}
