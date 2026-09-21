import { useMemo, useState } from "react";
import { TopBar } from "../../components/layout/TopBar";
import { CategoryChips } from "../../components/catalog/CategoryChips";
import { ProductGrid } from "../../components/catalog/ProductGrid";
import { KpiRow } from "../../components/catalog/KpiRow";
import { CartPanel } from "../../components/cart/CartPanel";
import { CartSummaryBar } from "../../components/cart/CartSummaryBar";
import { Spinner } from "../../components/ui/Spinner";
import { useSettings } from "../../context/SettingsContext";
import { useCart } from "../../context/CartContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getKategori, getProduk, getTransaksi } from "../../lib/sheetsStore";

export function CatalogPage() {
  const { accessToken, spreadsheetId, settings } = useSettings();
  const { state, dispatch } = useCart();
  const [activeKategori, setActiveKategori] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const ready = accessToken && spreadsheetId;
  const produkResult = useSheetsData(ready ? () => getProduk(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const kategoriResult = useSheetsData(ready ? () => getKategori(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  // Only feeds the KPI strip (desktop) — a failure here must never block selling.
  const transaksiResult = useSheetsData(ready ? () => getTransaksi(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);

  const produkAktif = useMemo(() => (produkResult.data ?? []).filter((p) => p.status === "aktif"), [produkResult.data]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      produkAktif.filter((p) => (activeKategori ? p.kategoriId === activeKategori : true) && (q ? p.nama.toLowerCase().includes(q) : true)),
    [produkAktif, activeKategori, q]
  );
  const qtyById = useMemo(() => new Map(state.lines.map((l) => [l.produkId, l.qty])), [state.lines]);

  return (
    <div className="xl:grid xl:h-screen xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0 xl:overflow-y-auto">
        <TopBar
          title={settings.businessName || "Kasir Rakyat"}
          subtitle="Ketuk produk untuk menambah ke transaksi"
          search={{ value: query, onChange: setQuery, placeholder: "Cari produk..." }}
        />
        <KpiRow transaksi={transaksiResult.data} produk={produkAktif} />
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
            qtyById={qtyById}
            searching={q.length > 0}
            // Feedback comes from the qty badge on the card, the cart side panel
            // (xl+) and the floating cart bar (phones) — no toast needed.
            onAdd={(p) => dispatch({ type: "add", produk: p })}
          />
        )}
        <div className="h-16 xl:hidden" aria-hidden />
      </div>
      <aside data-tour="cart" className="hidden border-l border-[var(--border)] xl:block xl:h-screen">
        <CartPanel />
      </aside>
      <CartSummaryBar />
    </div>
  );
}
