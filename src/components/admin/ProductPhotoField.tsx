import { useState } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { usePhotoAccess } from "../../hooks/usePhotoAccess";
import { useProductPhotoUrl } from "../../hooks/useProductPhoto";
import { blockReasonText } from "../../lib/features";
import { PhotoCancelledError, pickPhoto, type PhotoSource } from "../../lib/productPhotos";
import { describeError } from "../../lib/errors";
import { ProductThumb } from "../catalog/ProductThumb";
import { useToast } from "../ui/Toast";
import { CameraIcon, CloudIcon, ImageIcon, LockIcon, SmartphoneIcon, TrashIcon } from "../ui/icons";

export interface PendingPhoto {
  // Bare base64 JPEG picked but not yet saved — it is only written to
  // storage when the product form is submitted (so cancelling leaves no
  // orphan files behind).
  base64: string;
}

interface Props {
  nama: string;
  // Currently saved reference on the product ("" = none).
  savedRef: string;
  pending: PendingPhoto | null;
  removed: boolean;
  onPick: (p: PendingPhoto) => void;
  onRemove: () => void;
}

// Photo picker inside the product form. Locked (with the reason) unless the
// paid plan and the Android app are both active.
export function ProductPhotoField({ nama, savedRef, pending, removed, onPick, onRemove }: Props) {
  const access = usePhotoAccess();
  const { settings, accessToken } = useSettings();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const savedUrl = useProductPhotoUrl(access.allowed && !removed ? savedRef : "", accessToken);

  if (!access.allowed) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3.5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[var(--border-soft)] text-[var(--text-faint)]">
          <LockIcon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text)]">Foto produk</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">{access.reason ? blockReasonText(access.reason) : ""}</p>
        </div>
      </div>
    );
  }

  async function handlePick(source: PhotoSource) {
    if (busy) return;
    setBusy(true);
    try {
      onPick({ base64: await pickPhoto(source) });
    } catch (err) {
      if (!(err instanceof PhotoCancelledError)) show(describeError(err).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const previewSrc = pending ? `data:image/jpeg;base64,${pending.base64}` : removed ? null : savedUrl;
  const hasPhoto = !!previewSrc || (!!savedRef && !removed);
  const where = settings.fotoStorage === "drive" ? "Google Drive" : "memori internal";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="flex items-center gap-3.5">
        <div className="relative h-24 w-24 flex-none overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border-soft)]">
          {previewSrc ? (
            <img src={previewSrc} alt={`Foto ${nama || "produk"}`} className="h-full w-full object-cover" />
          ) : (
            <ProductThumb produk={{ nama: nama || "Produk" }} className="h-full w-full text-xl" />
          )}
          {pending && <span className="absolute inset-x-0 bottom-0 bg-[var(--brand-500)] py-0.5 text-center text-[10px] font-bold text-white">Baru</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[var(--text)]">Foto produk</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            {settings.fotoStorage === "drive" ? <CloudIcon size={13} /> : <SmartphoneIcon size={13} />}
            Disimpan di {where}
          </p>
          <Link to="/admin/pengaturan" className="text-xs font-semibold text-[var(--brand-600)] underline-offset-2 hover:underline">
            Ubah tempat penyimpanan
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePick("camera")}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--brand-500)] text-sm font-semibold text-white disabled:opacity-60"
        >
          <CameraIcon size={17} /> Ambil Foto
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handlePick("gallery")}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--text)] disabled:opacity-60"
        >
          <ImageIcon size={17} /> Dari Galeri
        </button>
      </div>
      {hasPhoto && (
        <button
          type="button"
          onClick={onRemove}
          className="flex min-h-[40px] items-center justify-center gap-2 rounded-xl text-sm font-semibold text-[var(--danger)] hover:bg-[var(--error-bg)]"
        >
          <TrashIcon size={15} /> Hapus foto
        </button>
      )}
      {busy && <p className="text-center text-xs text-[var(--text-secondary)]">Memproses foto...</p>}
    </div>
  );
}
