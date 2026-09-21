import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../context/SettingsContext";
import { getBusinessType } from "../../lib/businessType";
import { saveKategori, saveProduk } from "../../lib/sheetsStore";
import type { BusinessTypeKey, Kategori, Produk } from "../../types";

const SAMPLE_PRODUCTS: Record<BusinessTypeKey, { nama: string; harga: number }[]> = {
  resto: [
    { nama: "Nasi Goreng Spesial", harga: 22000 },
    { nama: "Es Teh Manis", harga: 5000 },
    { nama: "Ayam Bakar", harga: 25000 },
  ],
  warung: [
    { nama: "Kopi Hitam", harga: 5000 },
    { nama: "Mie Rebus Telur", harga: 12000 },
    { nama: "Gorengan", harga: 2000 },
  ],
  toko: [
    { nama: "Beras 5kg", harga: 65000 },
    { nama: "Minyak Goreng 1L", harga: 18000 },
    { nama: "Gula Pasir 1kg", harga: 15000 },
  ],
  lainnya: [{ nama: "Produk Contoh", harga: 10000 }],
};

export function StepDone({ businessType }: { businessType: BusinessTypeKey }) {
  const { accessToken, spreadsheetId, updateSettings } = useSettings();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function finish(seedSamples: boolean) {
    setBusy(true);
    try {
      if (seedSamples && accessToken && spreadsheetId) {
        const bt = getBusinessType(businessType);
        const now = new Date().toISOString();
        const kategoriList: Kategori[] = bt.defaultKategori.map((nama, i) => ({
          id: crypto.randomUUID(),
          nama,
          urutan: i,
          warnaTag: "brand",
          createdAt: now,
        }));
        for (const k of kategoriList) await saveKategori(accessToken, spreadsheetId, k);
        const samples = SAMPLE_PRODUCTS[businessType];
        for (let i = 0; i < samples.length; i++) {
          const produk: Produk = {
            id: crypto.randomUUID(),
            nama: samples[i].nama,
            kategoriId: kategoriList[0]?.id ?? "",
            harga: samples[i].harga,
            deskripsi: "",
            status: "aktif",
            stokTampilan: null,
            urutan: i,
            iconKey: "package",
            foto: "",
            createdAt: now,
            updatedAt: now,
          };
          await saveProduk(accessToken, spreadsheetId, produk);
        }
      }
      await updateSettings({ onboarding_completed: "true" });
      navigate("/kasir");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-center">
      <h2 className="font-display text-xl font-bold text-[var(--text)]">Semua siap!</h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Mau kami isikan beberapa produk contoh supaya katalog tidak kosong? Kamu bisa hapus/ubah kapan saja di menu
        Produk. Setelah ini kamu akan ditawari tur singkat (bisa dilewati).
      </p>
      <Button onClick={() => finish(true)} disabled={busy} fullWidth>
        {busy ? "Menyiapkan..." : "Ya, isi contoh produk"}
      </Button>
      <Button onClick={() => finish(false)} disabled={busy} variant="ghost" fullWidth>
        Lewati, mulai kosong
      </Button>
    </div>
  );
}
