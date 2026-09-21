import { useState } from "react";
import { markStep } from "../../lib/guide";
import { useNavigate, useParams } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getKategori, getProduk, saveProduk } from "../../lib/sheetsStore";
import { limitsFor } from "../../lib/limits";
import { ProductForm, type PhotoChange } from "../../components/admin/ProductForm";
import { deletePhoto, savePhoto } from "../../lib/productPhotos";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";
import type { Produk } from "../../types";

export function ProductEditPage() {
  const { id } = useParams();
  const { accessToken, spreadsheetId, plan, settings } = useSettings();
  const navigate = useNavigate();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const kategoriResult = useSheetsData(accessToken && spreadsheetId ? () => getKategori(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const produkResult = useSheetsData(
    id && accessToken && spreadsheetId ? async () => (await getProduk(accessToken, spreadsheetId)).find((p) => p.id === id) ?? null : null,
    [id, accessToken, spreadsheetId]
  );

  async function handleSubmit(data: Omit<Produk, "id" | "createdAt" | "updatedAt" | "foto">, photo: PhotoChange) {
    if (!accessToken || !spreadsheetId) return;
    // Defense in depth: ProductsPage already blocks the "+ Tambah" nav at
    // the cap, this re-checks in case someone navigates here directly.
    // Only new products are capped — existing ones stay editable
    // regardless of plan.
    if (!id) {
      const existing = await getProduk(accessToken, spreadsheetId);
      const activeCount = existing.filter((p) => p.status === "aktif").length;
      if (activeCount >= limitsFor(plan).maxProduk) {
        show(`Batas ${limitsFor(plan).maxProduk} produk aktif untuk versi gratis. Hubungi kami untuk upgrade.`, "error");
        return;
      }
    }
    setBusy(true);
    let newRef = "";
    try {
      const now = new Date().toISOString();
      const produkId = produkResult.data?.id ?? crypto.randomUUID();
      const oldRef = produkResult.data?.foto ?? "";
      let foto = photo.removed ? "" : oldRef;
      if (photo.pending) {
        newRef = await savePhoto(photo.pending.base64, produkId, settings.fotoStorage, accessToken);
        foto = newRef;
      }
      const produk: Produk = {
        id: produkId,
        createdAt: produkResult.data?.createdAt ?? now,
        updatedAt: now,
        ...data,
        foto,
      };
      await saveProduk(accessToken, spreadsheetId, produk);
      // The replaced/removed file is deleted only AFTER the sheet row points
      // at the new state, so a failed save never loses the old photo.
      if (oldRef && oldRef !== foto) await deletePhoto(oldRef, accessToken).catch(() => {});
      show("Produk disimpan.", "success");
      markStep("produk");
      navigate("/admin/produk");
    } catch (err) {
      // Do not leave the just-written new photo orphaned if saving failed.
      if (newRef) await deletePhoto(newRef, accessToken).catch(() => {});
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
