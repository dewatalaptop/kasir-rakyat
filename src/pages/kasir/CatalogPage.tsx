import { useMemo, useState } from "react";
import { TopHeaderBanner } from "../../components/layout/TopHeaderBanner";
import { CategoryChips } from "../../components/catalog/CategoryChips";
import { ProductGrid } from "../../components/catalog/ProductGrid";
import { CartSummaryBar } from "../../components/cart/CartSummaryBar";
import { Spinner } from "../../components/ui/Spinner";
import { useSettings } from "../../context/SettingsContext";
import { useCart } from "../../context/CartContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getKategori, getProduk } from "../../lib/sheetsStore";
import { useToast } from "../../components/ui/Toast";

export function CatalogPage() {
  const { accessToken, spreadsheetId, settings } = useSettings();
  const { dispatch } = useCart();
  const { show } = useToast();
  const [activeKategori, setActiveKategori] = useState<string | null>(null);

  const produkResult = useSheetsData(
    accessToken && spreadsheetId ? () => getProduk(accessToken, spreadsheetId) : null,
    [accessToken, spreadsheetId]
  );
  const kategoriResult = useSheetsData(
    accessToken && spreadsheetId ? () => getKategori(accessToken, spreadsheetId) : null,
    [accessToken, spreadsheetId]
  );

  const produkAktif = useMemo(() => (produkResult.data ?? []).filter((p) => p.status === "aktif"), [produkResult.data]);
  const filtered = useMemo(
    () => (activeKategori ? produkAktif.filter((p) => p.kategoriId === activeKategori) : produkAktif),
    [produkAktif, activeKategori]
  );

  return (
    <div>
      <TopHeaderBanner businessName={settings.businessName || "Kasir Rakyat"} tagline="Ketuk produk untuk tambah ke keranjang" />
      <CategoryChips kategori={kategoriResult.data ?? []} active={activeKategori} onChange={setActiveKategori} />
      {produkResult.loading ? (
        <div className="flex justify-center py-10 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : produkResult.error ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--error-text)]">{produkResult.error}</p>
      ) : (
        <ProductGrid
          produk={filtered}
          onAdd={(p) => {
            dispatch({ type: "add", produk: p });
            show(`${p.nama} ditambahkan`, "success");
          }}
        />
      )}
      <CartSummaryBar />
    </div>
  );
}
