import { useSettings } from "../../context/SettingsContext";
import { usePhotoAccess } from "../../hooks/usePhotoAccess";
import { useProductPhotoUrl } from "../../hooks/useProductPhoto";

const TONES: [string, string][] = [
  ["#dcf5e6", "#108048"],
  ["#dce9fd", "#2558b8"],
  ["#ebe4fb", "#6a3fcb"],
  ["#ffe9cf", "#a35a06"],
  ["#fde5e3", "#a12f26"],
  ["#dcf1f1", "#0f766e"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(nama: string): string {
  const words = nama.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

// Product picture: the photo when the paid-Android photo feature is active and
// the product has one available on this device, otherwise a colored initials
// tile (stable per product name) — the grid always looks intentional.
export function ProductThumb({ produk, className = "" }: { produk: { nama: string; foto?: string }; className?: string }) {
  const { accessToken } = useSettings();
  const { allowed } = usePhotoAccess();
  const url = useProductPhotoUrl(allowed ? (produk.foto ?? "") : "", accessToken);
  if (url) return <img src={url} alt={produk.nama} className={`object-cover ${className}`} loading="lazy" />;
  const [bg, fg] = TONES[hash(produk.nama) % TONES.length];
  return (
    <div className={`flex items-center justify-center font-display font-extrabold ${className}`} style={{ background: bg, color: fg }} aria-hidden>
      <span className="text-[1.6em] leading-none tracking-tight">{initials(produk.nama)}</span>
    </div>
  );
}
