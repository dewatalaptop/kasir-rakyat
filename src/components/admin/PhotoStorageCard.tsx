import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";
import { usePhotoAccess } from "../../hooks/usePhotoAccess";
import { blockReasonText } from "../../lib/features";
import type { FotoStorage } from "../../types";
import { useToast } from "../ui/Toast";
import { CloudIcon, ImageIcon, LockIcon, SmartphoneIcon } from "../ui/icons";

const OPTIONS: { key: FotoStorage; title: string; desc: string; icon: React.ReactNode }[] = [
  {
    key: "internal",
    title: "Memori internal aplikasi",
    desc: "Foto disimpan privat di HP ini. Cepat dan bisa dipakai offline, tetapi tidak muncul di HP kasir lain dan ikut hilang jika aplikasi dihapus.",
    icon: <SmartphoneIcon size={20} />,
  },
  {
    key: "drive",
    title: "Google Drive toko",
    desc: "Foto diunggah ke folder “Kasir Rakyat - Foto Produk” di Google Drive akun toko dan tampil di semua HP kasir. Butuh internet saat menambah foto.",
    icon: <CloudIcon size={20} />,
  },
];

// Pengaturan > Foto Produk. Locked (with the reason) unless the paid plan AND
// the Android app are both in play; when open, picks where NEW photos go.
export function PhotoStorageCard() {
  const { settings, updateSettings } = useSettings();
  const access = usePhotoAccess();
  const { show } = useToast();
  const [busy, setBusy] = useState<FotoStorage | null>(null);

  async function choose(key: FotoStorage) {
    if (!access.allowed || key === settings.fotoStorage || busy) return;
    setBusy(key);
    try {
      await updateSettings({ foto_storage: key });
      show(key === "drive" ? "Foto baru akan disimpan di Google Drive." : "Foto baru akan disimpan di memori internal.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menyimpan pilihan.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 card-shadow">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--kpi-violet-bg)] text-[var(--kpi-violet-fg)]">
          <ImageIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-bold text-[var(--text)]">Foto Produk</h2>
          <p className="text-xs text-[var(--text-secondary)]">Tempat penyimpanan foto produk baru</p>
        </div>
        {!access.allowed && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--warning-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--warning-text)]">
            <LockIcon size={12} /> Terkunci
          </span>
        )}
      </div>

      {!access.allowed && access.reason && (
        <p className="rounded-xl bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)]">{blockReasonText(access.reason)}</p>
      )}

      <div role="radiogroup" aria-label="Tempat penyimpanan foto" className="flex flex-col gap-2">
        {OPTIONS.map((o) => {
          const selected = settings.fotoStorage === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!access.allowed}
              onClick={() => choose(o.key)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                selected ? "border-[var(--brand-400)] bg-[var(--brand-50)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand-300)]"
              }`}
            >
              <span className={`mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg ${selected ? "bg-[var(--brand-500)] text-white" : "bg-[var(--border-soft)] text-[var(--text-secondary)]"}`}>
                {o.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                  {o.title}
                  {selected && <span className="rounded-full bg-[var(--brand-500)] px-2 py-0.5 text-[10px] font-bold text-white">Dipakai</span>}
                  {busy === o.key && <span className="text-[11px] font-medium text-[var(--text-secondary)]">menyimpan...</span>}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-secondary)]">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[var(--text-faint)]">Mengubah pilihan ini hanya berlaku untuk foto yang ditambahkan setelahnya; foto lama tetap di tempatnya.</p>
    </section>
  );
}
