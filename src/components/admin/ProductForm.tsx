import { useState } from "react";
import type { Kategori, Produk } from "../../types";
import { Button } from "../ui/Button";

interface ProductFormProps {
  initial?: Produk;
  kategori: Kategori[];
  busy: boolean;
  onSubmit: (data: Omit<Produk, "id" | "createdAt" | "updatedAt">) => void;
}

export function ProductForm({ initial, kategori, busy, onSubmit }: ProductFormProps) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [kategoriId, setKategoriId] = useState(initial?.kategoriId ?? kategori[0]?.id ?? "");
  const [harga, setHarga] = useState(initial?.harga ?? 0);
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [status, setStatus] = useState<Produk["status"]>(initial?.status ?? "aktif");
  const [stokTampilan, setStokTampilan] = useState<string>(initial?.stokTampilan?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || busy) return;
    onSubmit({
      nama: nama.trim(),
      kategoriId,
      harga,
      deskripsi: deskripsi.trim(),
      status,
      stokTampilan: stokTampilan === "" ? null : Number(stokTampilan),
      urutan: initial?.urutan ?? 0,
      iconKey: initial?.iconKey ?? "package",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        autoFocus
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama produk"
        className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      <select
        value={kategoriId}
        onChange={(e) => setKategoriId(e.target.value)}
        className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      >
        {kategori.map((k) => (
          <option key={k.id} value={k.id}>
            {k.nama}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        value={harga || ""}
        onChange={(e) => setHarga(Number(e.target.value) || 0)}
        placeholder="Harga (Rp)"
        className="font-tabular shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      <textarea
        value={deskripsi}
        onChange={(e) => setDeskripsi(e.target.value)}
        placeholder="Deskripsi (opsional)"
        rows={2}
        className="shape-card resize-none border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      <input
        type="number"
        min={0}
        value={stokTampilan}
        onChange={(e) => setStokTampilan(e.target.value)}
        placeholder="Stok (opsional, hanya info)"
        className="font-tabular shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input type="checkbox" checked={status === "aktif"} onChange={(e) => setStatus(e.target.checked ? "aktif" : "nonaktif")} />
        Aktif (tampil di kasir)
      </label>
      <Button type="submit" disabled={busy || !nama.trim()} fullWidth>
        {busy ? "Menyimpan..." : "Simpan Produk"}
      </Button>
    </form>
  );
}
