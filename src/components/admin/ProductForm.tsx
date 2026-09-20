import { useState } from "react";
import type { Kategori, Produk } from "../../types";
import { Button } from "../ui/Button";
import { ProductPhotoField, type PendingPhoto } from "./ProductPhotoField";

export interface PhotoChange {
  pending: PendingPhoto | null;
  removed: boolean;
}

interface ProductFormProps {
  initial?: Produk;
  kategori: Kategori[];
  busy: boolean;
  onSubmit: (data: Omit<Produk, "id" | "createdAt" | "updatedAt" | "foto">, photo: PhotoChange) => void;
}

const inputClass =
  "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--brand-400)] focus:ring-2 focus:ring-[var(--brand-100)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

export function ProductForm({ initial, kategori, busy, onSubmit }: ProductFormProps) {
  const [nama, setNama] = useState(initial?.nama ?? "");
  const [kategoriId, setKategoriId] = useState(initial?.kategoriId ?? kategori[0]?.id ?? "");
  const [harga, setHarga] = useState(initial?.harga ?? 0);
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi ?? "");
  const [status, setStatus] = useState<Produk["status"]>(initial?.status ?? "aktif");
  const [stokTampilan, setStokTampilan] = useState<string>(initial?.stokTampilan?.toString() ?? "");
  const [pending, setPending] = useState<PendingPhoto | null>(null);
  const [removed, setRemoved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || busy) return;
    onSubmit(
      {
        nama: nama.trim(),
        kategoriId,
        harga,
        deskripsi: deskripsi.trim(),
        status,
        stokTampilan: stokTampilan === "" ? null : Number(stokTampilan),
        urutan: initial?.urutan ?? 0,
        iconKey: initial?.iconKey ?? "package",
      },
      { pending, removed }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <ProductPhotoField
        nama={nama}
        savedRef={initial?.foto ?? ""}
        pending={pending}
        removed={removed}
        onPick={(p) => {
          setPending(p);
          setRemoved(false);
        }}
        onRemove={() => {
          setPending(null);
          setRemoved(true);
        }}
      />
      <Field label="Nama produk">
        <input autoFocus value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Nasi Goreng" className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategori">
          <select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)} className={inputClass}>
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Harga (Rp)">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={harga || ""}
            onChange={(e) => setHarga(Number(e.target.value) || 0)}
            placeholder="15000"
            className={`${inputClass} font-tabular`}
          />
        </Field>
      </div>
      <Field label="Deskripsi (opsional)">
        <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
      </Field>
      <Field label="Stok (opsional, hanya info)">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={stokTampilan}
          onChange={(e) => setStokTampilan(e.target.value)}
          placeholder="Kosongkan bila tidak dipakai"
          className={`${inputClass} font-tabular`}
        />
      </Field>
      <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--text)]">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--brand-500)]"
          checked={status === "aktif"}
          onChange={(e) => setStatus(e.target.checked ? "aktif" : "nonaktif")}
        />
        Aktif (tampil di kasir)
      </label>
      <Button type="submit" disabled={busy || !nama.trim()} fullWidth>
        {busy ? "Menyimpan..." : "Simpan Produk"}
      </Button>
    </form>
  );
}
