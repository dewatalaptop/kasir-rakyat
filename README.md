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
  hari, watermark di struk, tanpa foto produk).
- **Foto produk** (khusus versi berbayar/prabayar **dan** aplikasi Android —
  keduanya wajib, lihat `src/lib/features.ts`): kamera/galeri lewat
  `@capacitor/camera`, foto dikecilkan ke JPEG ≤640px lalu disimpan di
  tempat pilihan Admin (Pengaturan > Foto Produk): **memori internal
  aplikasi** (`@capacitor/filesystem`, `Directory.Data` — privat, offline,
  tidak tampil di HP kasir lain) atau **Google Drive toko** (folder
  "Kasir Rakyat - Foto Produk", scope `drive.file` yang sama dengan Sheets,
  tampil di semua HP kasir dan di-cache ke memori internal). Sheets hanya
  menyimpan referensi di kolom `foto` (`internal:<file>` / `drive:<id>`),
  bukan gambarnya. Di web/versi gratis fitur terkunci dengan penjelasan.
  Untuk mencoba UI Android di browser saat `npm run dev`:
  `localStorage["kasirRakyat.devPlatform"]="android"` (hanya berlaku di dev
  build).

## Kasir & Izin (banyak kasir dengan batasan fungsi)

Pemilik (login Google + password admin) mendaftarkan kasir di **Admin > Kasir & Izin**:
nama, peran (Kasir / Supervisor / Manajer) atau izin kustom, dan PIN 4-6 angka. Setelah
ada kasir aktif, layar Kasir meminta pilih nama + PIN, dan setiap transaksi tercatat atas
nama kasir itu. Izin yang bisa diberikan: lihat semua riwayat, batalkan transaksi, lihat
laporan/dashboard, kelola produk & kategori. Pengaturan, Kasir & Izin, Printer, koneksi
Sheets, dan Langganan **selalu khusus pemilik**. Versi gratis maks. 2 kasir aktif.

- Profil tersimpan di tab `Kasir` Google Sheets pemilik (dibuat otomatis untuk sheet lama);
  PIN hanya disimpan sebagai hash SHA-256 bergaram per profil.
- 5 PIN salah berturut-turut mengunci profil itu 30 dtk (berlipat, maks. 5 menit).
- **Batas yang jujur**: ini pembatas untuk register bersama, bukan keamanan tingkat bank.
  Semua kasir memakai sesi Google pemilik di perangkat itu, dan PIN 4-6 angka bisa ditebak
  offline oleh orang teknis yang membaca Sheet. Cocok untuk warung/resto/toko, bukan untuk
  melindungi dari karyawan yang berniat jahat dan paham teknis.

## Printer thermal

Tiga cara cetak (Admin > Pengaturan > Printer): **Bluetooth langsung** (aplikasi Android,
printer Bluetooth LE, ESC/POS 58/80mm, cetak otomatis opsional), **RawBT** (printer
Bluetooth klasik), dan **cetak browser**. Struk selalu ASCII aman-printer (tanpa NBSP/emoji),
kata panjang dipotong, dan baris Service ikut tercetak. Printer Bluetooth *klasik* (SPP)
tidak bisa dijangkau lewat BLE — pakai RawBT untuk itu. Diuji terhadap printer ESC/POS
virtual; **belum diuji pada printer fisik**.

## Langganan berbayar (transfer manual + kode unik)

Akun & Langganan > Upgrade membuat permintaan: harga + kode unik 1-999 (mis. Rp50.123).
Pemilik aplikasi melihatnya di dashboard App Builder tab **Pembayaran** dan menyetujuinya
dengan dua ketukan; lisensi aktif seketika dan aplikasi mendeteksinya sendiri. Hasil
konfirmasi server yang terakhir dipakai sampai 72 jam bila server tak terjangkau (tidak
pernah melewati masa berlakunya). Backend: `getStudioOffer`, `requestStudioUpgrade`,
`cancelMyStudioUpgrade` di ai-app-builder.

## Pengujian

`npm test` menjalankan 116 uji: logika murni + integrasi seluruh aplikasi terhadap Sheets,
Cloud Functions, dan printer BLE tiruan (empat jenis usaha, peran & izin kasir, kunci PIN,
pembatalan transaksi, antrean offline, printer, alur upgrade, gating fitur berbayar).

## Aplikasi Android (APK)

Cangkang native tipis (Capacitor) yang memuat web app live
(`capacitor.config.json` > `server.url`), jadi perubahan JS/CSS cukup
di-deploy ulang. APK perlu dibangun ulang + diinstal ulang hanya bila ada
perubahan **native** (plugin, `capacitor.config.json`, Gradle).

- Bangun via GitHub Actions: **Actions > Build Android APK > Run workflow**
  (`.github/workflows/build-apk.yml`); APK debug terbit di Release
  `android-latest`.
- Login Google memakai plugin native (`src/lib/nativeGoogle.ts`) karena
  WebView tidak bisa menampilkan layar persetujuan Google. Token
  Drive/Sheets ikut diminta pada sign-in yang sama.
- `android/debug.keystore` dipakai bersama `retail-pos`; SHA-1-nya sudah
  didaftarkan ke app Android Firebase `com.aiappbuilder.kasirrakyat`
  (`android/app/google-services.json`). Jangan ganti keystore tanpa
  mendaftarkan SHA-1 baru.
- Ikon & splash: sumber di `assets/` (SVG + PNG). Ubah lalu jalankan
  `npx @capacitor/assets generate --android --assetPath assets` (perlu
  `sharp`, terpasang otomatis oleh npx) dan bangun ulang APK; ikon web/PWA
  ada di `public/icons/`.
- Belum diuji di perangkat asli (tidak ada Android SDK/Java di mesin
  pengembang): uji sign-in Google, ambil foto kamera/galeri, dan simpan ke
  memori internal + Google Drive pada build pertama.

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
