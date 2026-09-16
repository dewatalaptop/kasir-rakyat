import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getKategori, getProduk, saveProduk } from "../../lib/sheetsStore";
import { ProductForm } from "../../components/admin/ProductForm";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";
import type { Produk } from "../../types";

export function ProductEditPage() {
  const { id } = useParams();
  const { accessToken, spreadsheetId } = useSettings();
  const navigate = useNavigate();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const kategoriResult = useSheetsData(accessToken && spreadsheetId ? () => getKategori(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const produkResult = useSheetsData(
    id && accessToken && spreadsheetId ? async () => (await getProduk(accessToken, spreadsheetId)).find((p) => p.id === id) ?? null : null,
    [id, accessToken, spreadsheetId]
  );

  async function handleSubmit(data: Omit<Produk, "id" | "createdAt" | "updatedAt">) {
    if (!accessToken || !spreadsheetId) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const produk: Produk = {
        id: produkResult.data?.id ?? crypto.randomUUID(),
        createdAt: produkResult.data?.createdAt ?? now,
        updatedAt: now,
        ...data,
      };
      await saveProduk(accessToken, spreadsheetId, produk);
      show("Produk disimpan.", "success");
      navigate("/admin/produk");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menyimpan produk.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (id && produkResult.loading) {
    return (
      <div className="flex justify-center py-8 text-[var(--brand-500)]">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-3 font-display text-lg font-bold text-[var(--text)]">{id ? "Edit Produk" : "Tambah Produk"}</h1>
      <ProductForm initial={produkResult.data ?? undefined} kategori={kategoriResult.data ?? []} busy={busy} onSubmit={handleSubmit} />
    </div>
  );
}
