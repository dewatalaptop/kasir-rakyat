# Kasir Rakyat

Aplikasi kasir (POS) untuk resto, warung, dan toko kecil — Studio product
(Rp50.000/bulan). Ringan, fleksibel, dan tidak butuh biaya database
tambahan: setiap toko menyambungkan akun Google-nya sendiri, dan seluruh
data (produk, kategori, transaksi) tersimpan di Google Sheets milik toko
itu sendiri.

## Arsitektur singkat

- **Frontend**: React 18 + Vite + TypeScript + Tailwind, React Router.
- **Auth**: Firebase Auth (Google Sign-In, popup only) — akun Google
  digunakan untuk identitas kasir, bukan pemilik data.
- **Database**: Google Sheets API (`drive.file` scope — aplikasi hanya
  bisa mengakses spreadsheet yang dibuatnya sendiri). Lihat
  `src/lib/sheets.ts` (starter) dan `src/lib/sheetsStore.ts` (data layer).
  Tab `Transaksi` **append-only, satu baris per transaksi** — tidak pernah
  di-update/dihapus in place, karena Google Sheets tidak punya locking dan
  beberapa kasir bisa menulis bersamaan. Pembatalan = baris baru dengan
  `status: dibatalkan`, bukan edit baris asli.
- **Cetak struk**: RawBT (Android, via URL scheme `rawbt://print?...`)
  sebagai default, `@media print` browser sebagai fallback universal.
  Bluetooth-LE/ESC-POS native belum didukung — direncanakan untuk versi
  Android (Capacitor) mendatang.
- **Stok**: `stokTampilan` per produk murni informasi manual (badge "sisa
  X"), tidak ada pengurangan stok otomatis atau pencegahan oversell — di
  luar cakupan versi ini.
- **Akses Admin vs Kasir**: `/kasir/*` dan `/bantuan` tidak butuh password
  tambahan — hanya login Google. `/admin/*` (Produk, Kategori, Transaksi,
  Laporan, Pengaturan, Akun) dijaga `AdminAuthGuard`
  (`src/components/auth/AdminAuthGuard.tsx`) dengan password terpisah
  (hash SHA-256, tersimpan di Pengaturan, diubah kapan saja lewat
  Pengaturan > Keamanan). Ini pemisah untuk kasir yang memakai perangkat
  sama dengan akun Google pemilik, **bukan** pengganti keamanan
  server-side — aplikasi ini tidak punya backend sendiri, jadi tidak
  tahan terhadap pengguna yang benar-benar teknis.
- **Gratis vs Berbayar**: status langganan dicek nyata lewat
  `checkStudioLicense` (Cloud Function di project `ai-app-builder-7bf8e`,
  lihat `src/lib/license.ts`) terhadap catatan pembayaran Studio asli —
  bukan sesuatu yang bisa diubah sendiri dari aplikasi ini. Batasan versi
  gratis ada di `src/lib/limits.ts` (maks 20 produk aktif, laporan 7
  hari, watermark di struk).

## Setup

```bash
npm install
npm run dev   # tidak ada secret frontend — Firebase config sudah inline di src/firebase.ts
```

## Deploy

Hosting site `kasir-rakyat-demo` di project Firebase bersama
`ai-app-builder-7bf8e` (lihat `.firebaserc`/`firebase.json`).

```bash
npm run build
firebase deploy --only hosting:kasir-rakyat-demo
```

Domain baru **tidak otomatis** masuk daftar authorized domains Firebase
Auth — harus di-patch manual lewat Identity Toolkit admin API sebelum
Google Sign-In bekerja di domain barunya (lihat catatan di
`ai-app-builder/templates/google-sheets-db/README.md`).
