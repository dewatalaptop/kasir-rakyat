import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useSheetsData } from "../../hooks/useSheetsData";
import { getKategori, saveKategori } from "../../lib/sheetsStore";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ListIcon } from "../../components/ui/icons";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

export function CategoriesPage() {
  const { accessToken, spreadsheetId } = useSettings();
  const { show } = useToast();
  const { data, loading, refetch } = useSheetsData(accessToken && spreadsheetId ? () => getKategori(accessToken, spreadsheetId) : null, [accessToken, spreadsheetId]);
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !accessToken || !spreadsheetId || busy) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await saveKategori(accessToken, spreadsheetId, {
        id: crypto.randomUUID(),
        nama: nama.trim(),
        urutan: (data ?? []).length,
        warnaTag: "brand",
        createdAt: now,
      });
      setNama("");
      show("Kategori ditambahkan.", "success");
      refetch();
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menambah kategori.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Kategori</h1>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama kategori baru"
          className="shape-card flex-1 border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <Button type="submit" disabled={busy || !nama.trim()} shape="pill">
          Tambah
        </Button>
      </form>
      {loading ? (
        <div className="flex justify-center py-8 text-[var(--brand-500)]">
          <Spinner />
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon={<ListIcon size={32} />} title="Belum ada kategori" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {(data ?? []).map((k) => (
            <span key={k.id} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]">
              {k.nama}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
