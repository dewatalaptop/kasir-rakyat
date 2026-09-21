export interface HelpTopic {
  key: string;
  title: string;
  // One-line answer shown collapsed, so people can scan the list.
  summary: string;
  // Longer explanation (plain paragraph).
  body: string;
  // Numbered how-to steps, when the topic is a procedure.
  steps?: string[];
  // Only relevant to the owner (hidden for cashiers, who can't open those screens).
  ownerOnly?: boolean;
  // Where to do it, shown as a button.
  action?: { label: string; to: string };
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    key: "mulai",
    title: "Mulai cepat: 5 menit pertama",
    summary: "Urutan paling singkat dari nol sampai penjualan pertama.",
    body: "Kamu tidak perlu mengatur semuanya sekaligus. Cukup empat hal ini; sisanya bisa nanti.",
    steps: [
      "Buka Produk dan ubah contoh produk menjadi produk jualanmu (nama, kategori, harga).",
      "Kembali ke layar Kasir, ketuk produk untuk memasukkannya ke keranjang.",
      "Tekan Lanjut Bayar, pilih tunai / QRIS / transfer, lalu Konfirmasi Diterima.",
      "Struk muncul — cetak, bagikan, atau tutup. Selesai: penjualan pertamamu sudah tercatat di Google Sheets-mu.",
    ],
    action: { label: "Buka Produk", to: "/admin/produk" },
    ownerOnly: true,
  },
  {
    key: "kasir",
    title: "Cara menjual",
    summary: "Ketuk produk → Lanjut Bayar → Konfirmasi Diterima.",
    body: "Ketuk produk untuk menambah ke keranjang (ketuk lagi untuk menambah jumlah). Ubah jumlah atau hapus baris di keranjang, atur meja/catatan bila usahamu memakainya, lalu Lanjut Bayar. Untuk tunai, masukkan uang yang diterima dan kembaliannya dihitung otomatis.",
    steps: ["Ketuk produk di layar Kasir.", "Buka keranjang, cek jumlah.", "Lanjut Bayar → pilih metode.", "Konfirmasi Diterima → struk."],
  },
  {
    key: "produk",
    title: "Produk, kategori & foto",
    summary: "Nonaktifkan produk, jangan hapus — riwayat lama tetap utuh.",
    body: "Tambah produk lewat Produk > Tambah: isi nama, kategori, dan harga. Produk yang sedang tidak dijual sebaiknya dinonaktifkan (bukan dihapus) supaya laporan dan riwayat lama tetap benar. Foto produk tersedia di versi berbayar pada aplikasi Android; simpan di memori aplikasi atau di Google Drive-mu (Pengaturan > Penyimpanan foto). Versi gratis dibatasi 20 produk aktif.",
    ownerOnly: true,
    action: { label: "Kelola Produk", to: "/admin/produk" },
  },
  {
    key: "printer",
    title: "Mencetak struk (printer thermal)",
    summary: "Bluetooth langsung, lewat RawBT, atau cetak dari browser.",
    body: "Ada tiga cara. (1) Bluetooth langsung — hanya di aplikasi Android: Pengaturan > Pengaturan Printer > Cari printer, pilih, lalu Cetak Halaman Tes; struk bisa tercetak otomatis setelah tiap penjualan. Printer harus bertipe Bluetooth LE; printer Bluetooth klasik pakai cara (2). (2) RawBT — pasang aplikasi RawBT di HP, lalu struk dikirim ke sana. (3) Cetak dari Browser — cadangan, memakai dialog cetak biasa. Pilih lebar kertas 58 mm atau 80 mm sesuai printermu.",
    ownerOnly: true,
    action: { label: "Buka Pengaturan Printer", to: "/admin/pengaturan/printer" },
  },
  {
    key: "kasir-izin",
    title: "Kasir & izin karyawan",
    summary: "Daftarkan karyawan, beri PIN, batasi apa yang boleh mereka buka.",
    body: "Di Kasir & Izin kamu mendaftarkan orang yang bertugas. Tiap orang punya PIN sendiri dan peran: Kasir (hanya berjualan), Supervisor (+ riwayat & pembatalan), Manajer (+ laporan & produk); izin bisa disesuaikan. Setiap transaksi tercatat atas nama kasir yang bertugas. Pengaturan, Kasir & Izin, dan Akun & Langganan selalu khusus pemilik. Versi gratis: maksimal 2 kasir aktif. Ini pembatas untuk register bersama, bukan keamanan tingkat bank.",
    steps: ["Buka Kasir & Izin > Tambah.", "Bila diminta, buat password pemilik dulu (sekali saja).", "Isi nama, pilih peran, buat PIN 4–6 angka.", "Berikan PIN ke karyawan; ganti kasir lewat tombol profil di pojok kanan atas."],
    ownerOnly: true,
    action: { label: "Buka Kasir & Izin", to: "/admin/kasir" },
  },
  {
    key: "password",
    title: "Password pemilik (tanpa username)",
    summary: "Tidak ada username. Belum perlu kalau kamu berjualan sendiri.",
    body: "Selama belum ada karyawan, kamu otomatis menjadi pemilik dan semua menu terbuka — tidak ada password atau username yang diminta. Begitu kamu mendaftarkan kasir, aplikasi meminta kamu membuat password pemilik agar karyawan tidak ikut membuka Pengaturan. Kamu bisa mengubah, mengunci, atau menghapusnya (bila tidak ada kasir aktif) di Pengaturan > Keamanan. Lupa password? Buka file Google Sheets usahamu (akun Google yang sama), tab Pengaturan, kosongkan isi baris admin_password_hash, lalu buat password baru.",
    ownerOnly: true,
    action: { label: "Buka Keamanan", to: "/admin/pengaturan" },
  },
  {
    key: "langganan",
    title: "Langganan & kode unik",
    summary: "Upgrade dengan transfer; nominal berakhiran kode unik supaya otomatis dikenali.",
    body: "Di Akun & Langganan pilih paket, lalu aplikasi menampilkan nominal transfer yang berakhiran kode unik (mis. Rp50.347) beserta rekening tujuan. Transfer PERSIS sesuai nominal itu — kode unik itulah yang membuat pembayaranmu dikenali. Setelah pembayaran dikonfirmasi, aplikasi berganti ke versi berbayar sendiri (halaman ini memeriksa otomatis). Salah nominal atau berubah pikiran? Batalkan permintaan lalu buat ulang. Perpanjangan ditawarkan di 7 hari terakhir dan menambah dari tanggal berakhir.",
    ownerOnly: true,
    action: { label: "Buka Akun & Langganan", to: "/admin/akun" },
  },
  {
    key: "transaksi",
    title: "Riwayat & pembatalan",
    summary: "Pembatalan menambah catatan baru; riwayat asli tidak dihapus.",
    body: "Semua transaksi tercatat otomatis. Untuk membatalkan, buka detail transaksi dan tekan Batalkan — ini menambah baris pembatalan, riwayat asli tetap ada, dan omzet di dasbor serta laporan tidak lagi menghitungnya. Transaksi yang sama tidak bisa dibatalkan dua kali. Hanya pemilik, atau kasir yang diberi izin, yang bisa membatalkan.",
  },
  {
    key: "sheets",
    title: "Google Sheets & koneksi",
    summary: "Data ada di Google Sheets milikmu; sesi Google habis ±1 jam.",
    body: "Semua data tersimpan di Google Sheets milikmu sendiri, gratis dan aman — aplikasi ini hanya bisa mengakses file yang dibuatnya sendiri. Google membatasi izin akses sekitar 1 jam, jadi sesekali muncul kotak “Sambungkan Ulang” di atas layar — ketuk, pilih akun Google yang sama, selesai.",
  },
  {
    key: "offline",
    title: "Tidak ada internet?",
    summary: "Tetap berjualan; transaksi terkirim otomatis saat tersambung.",
    body: "Kalau internet atau sesi Google terputus, transaksi baru tetap tersimpan di perangkat dan terkirim otomatis begitu tersambung lagi — jangan tutup transaksi dua kali. Status berbayar tetap dikenali sampai 72 jam tanpa internet (tidak melewati tanggal berakhir).",
  },
];

export function topicsFor(isOwner: boolean): HelpTopic[] {
  return HELP_TOPICS.filter((t) => isOwner || !t.ownerOnly);
}
