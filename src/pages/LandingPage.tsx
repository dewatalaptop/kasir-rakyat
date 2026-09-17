import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import {
  CartIcon,
  CheckIcon,
  ChartIcon,
  CoffeeIcon,
  GoogleIcon,
  LockIcon,
  PrinterIcon,
  StoreIcon,
  UtensilsIcon,
} from "../components/ui/icons";
import { DEFAULT_PROMO_BACKGROUNDS } from "../assets/promoBackgrounds";
import { formatRupiah } from "../lib/format";

const FEATURES = [
  {
    icon: CartIcon,
    title: "Data Milik Kamu Sendiri",
    body: "Produk, kategori, dan setiap transaksi tersimpan di Google Sheets akun Google-mu — gratis, bukan server kami. Kamu bisa buka, salin, atau ekspor kapan saja lewat Google Sheets langsung.",
  },
  {
    icon: PrinterIcon,
    title: "Cetak Struk Fleksibel",
    body: "Pakai RawBT ke printer thermal Bluetooth, atau cetak langsung dari browser tanpa aplikasi tambahan — tinggal pilih mana yang cocok di tokomu.",
  },
  {
    icon: LockIcon,
    title: "Password Admin Terpisah",
    body: "Kasir sehari-hari tidak bisa masuk ke Produk, Laporan, atau Pengaturan — hanya kamu yang tahu password admin, bisa diganti kapan saja.",
  },
  {
    icon: ChartIcon,
    title: "Laporan Real-Time",
    body: "Omzet hari ini, produk terlaris, riwayat transaksi — semua terlihat langsung tanpa perlu hitung manual.",
  },
];

const BUSINESS_KINDS = [
  { icon: UtensilsIcon, label: "Restoran / Rumah Makan" },
  { icon: CoffeeIcon, label: "Warung / Kedai Kopi" },
  { icon: StoreIcon, label: "Toko / Kelontong" },
];

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/90 px-5 py-3 backdrop-blur">
        <span className="font-display text-lg font-extrabold text-[var(--brand-600)]">Kasir Rakyat</span>
        <Button onClick={() => navigate("/login")} shape="pill" variant="ghost" className="text-xs">
          Masuk
        </Button>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={DEFAULT_PROMO_BACKGROUNDS[0].url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-700)]/85 via-[var(--brand-700)]/70 to-[var(--bg)]" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5 px-5 py-20 text-center">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
            Kasir untuk resto &middot; warung &middot; toko
          </span>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            Kasir yang secepat pelangganmu ngantre
          </h1>
          <p className="max-w-lg text-sm text-white/90 sm:text-base">
            Catat transaksi, cetak struk, dan pantau omzet dari HP atau komputer mana pun — tanpa biaya database
            tambahan, karena datamu tersimpan di Google Sheets akunmu sendiri.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate("/login")} icon={<GoogleIcon size={18} />} className="shadow-lg">
              Coba Gratis Sekarang
            </Button>
            <Button onClick={() => document.getElementById("harga")?.scrollIntoView({ behavior: "smooth" })} variant="ghost" shape="pill">
              Lihat Harga
            </Button>
          </div>
          <p className="text-xs text-white/70">Gratis untuk mulai &middot; tanpa kartu kredit &middot; siap pakai dalam 5 menit</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-5 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-[var(--text)]">Kenapa Kasir Rakyat</h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="shape-card border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-50)] text-[var(--brand-600)]">
                <f.icon size={20} />
              </div>
              <h3 className="mb-1 text-sm font-bold text-[var(--text)]">{f.title}</h3>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-[var(--surface)] py-16">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-center font-display text-2xl font-bold text-[var(--text)]">Cocok untuk Usaha Apa Saja</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-[var(--text-secondary)]">
            Satu aplikasi, disesuaikan istilah dan kategori produk sesuai jenis usahamu saat pertama kali pakai.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {BUSINESS_KINDS.map((b) => (
              <div key={b.label} className="shape-card flex flex-col items-center gap-2 border border-[var(--border)] bg-[var(--bg)] p-6 text-center">
                <b.icon size={28} />
                <span className="text-sm font-semibold text-[var(--text)]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="harga" className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-[var(--text)]">Harga Jujur, Tanpa Kejutan</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-[var(--text-secondary)]">
          Mulai gratis. Upgrade kapan saja usahamu butuh lebih.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="shape-card border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">Gratis</p>
            <p className="mt-1 font-tabular font-display text-3xl font-extrabold text-[var(--text)]">Rp0</p>
            <ul className="mt-5 flex flex-col gap-2.5 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--accent-500)]" />
                Sampai 20 produk aktif
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--accent-500)]" />
                Laporan 7 hari terakhir
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--accent-500)]" />
                Semua fitur kasir &amp; cetak struk
              </li>
              <li className="flex items-start gap-2 text-[var(--text-faint)]">
                <CheckIcon size={16} className="mt-0.5 shrink-0" />
                Struk berlogo kecil "versi gratis"
              </li>
            </ul>
          </div>
          <div className="shape-card border-2 border-[var(--brand-500)] bg-[var(--surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-600)]">Berbayar</p>
            <p className="mt-1 font-tabular font-display text-3xl font-extrabold text-[var(--text)]">
              {formatRupiah(50000)}<span className="text-sm font-medium text-[var(--text-faint)]">/bulan</span>
            </p>
            <ul className="mt-5 flex flex-col gap-2.5 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--brand-600)]" />
                Produk tanpa batas
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--brand-600)]" />
                Laporan sampai 90 hari
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--brand-600)]" />
                Semua fitur kasir &amp; cetak struk
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--brand-600)]" />
                Struk tanpa watermark
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-[var(--text-faint)]">
          Pembayaran manual (transfer/QRIS), diaktifkan langsung oleh kami setelah konfirmasi — hubungi kami untuk upgrade.
        </p>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)] py-16">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-5 text-center">
          <h2 className="font-display text-2xl font-bold text-[var(--text)]">Mulai dalam 5 Menit</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Masuk dengan Google, hubungkan Sheets, dan katalogmu siap dipakai kasir hari ini juga.
          </p>
          <Button onClick={() => navigate("/login")} icon={<GoogleIcon size={18} />}>
            Coba Gratis Sekarang
          </Button>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-xs text-[var(--text-faint)]">Kasir Rakyat &middot; sebuah produk Nuvora</footer>
    </div>
  );
}
