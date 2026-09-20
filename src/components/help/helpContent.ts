export interface HelpTopic {
  key: string;
  title: string;
  body: string;
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    key: "kasir",
    title: "Cara Menjual (Kasir)",
    body: "Ketuk produk untuk menambah ke keranjang. Buka tab Keranjang untuk ubah jumlah, lalu tekan 'Lanjut Bayar'. Pilih metode pembayaran, konfirmasi diterima, lalu cetak struk.",
  },
  {
    key: "produk",
    title: "Mengelola Produk",
    body: "Buka menu Produk > Tambah untuk menambah item baru. Isi nama, kategori, dan harga. Nonaktifkan produk (bukan hapus) kalau sedang tidak dijual, supaya riwayat transaksi lama tetap utuh.",
  },
  {
    key: "transaksi",
    title: "Riwayat & Pembatalan",
    body: "Semua transaksi tercatat otomatis. Untuk membatalkan, buka detail transaksi dan tekan 'Batalkan' — ini mencatat baris pembatalan baru, riwayat asli tidak dihapus.",
  },
  {
    key: "sheets",
    title: "Tentang Google Sheets",
    body: "Semua data tersimpan di Google Sheets milikmu sendiri, gratis dan aman — aplikasi ini hanya bisa mengakses file yang dibuatnya sendiri. Google membatasi izin akses sekitar 1 jam, jadi sesekali muncul kotak “Sambungkan Ulang” di bagian atas layar — ketuk, pilih akun Google yang sama, selesai. Selama belum tersambung, transaksi baru tetap tersimpan di perangkat dan terkirim otomatis setelah tersambung. Bisa juga lewat Pengaturan > Koneksi Google Sheets.",
  },
  {
    key: "printer",
    title: "Mencetak Struk",
    body: "Pasang aplikasi RawBT di HP untuk mencetak ke printer thermal Bluetooth secara otomatis. Tanpa RawBT, gunakan 'Cetak dari Browser' sebagai cadangan.",
  },
];
