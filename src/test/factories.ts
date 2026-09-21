import type { CartLine, Pengaturan, Produk, Transaksi } from "../types";

export const baseSettings = (over: Partial<Pengaturan> = {}): Pengaturan => ({
  businessName: "Warung Contoh",
  businessType: "warung",
  address: "Jl. Mawar No. 1, Salatiga",
  phone: "0812-3456-7890",
  accentHue: 28,
  mejaEnabled: false,
  taxPercent: 0,
  serviceChargePercent: 0,
  receiptFooterText: "Terima kasih!",
  printerPref: "rawbt",
  fotoStorage: "internal",
  onboardingCompleted: true,
  sheetCreatedAt: "",
  adminPasswordHash: "",
  ...over,
});

let seq = 0;
export const line = (nama: string, harga: number, qty = 1): CartLine => ({ produkId: `p${++seq}`, nama, harga, qty });

export const produk = (nama: string, harga: number, over: Partial<Produk> = {}): Produk => ({
  id: `prod-${++seq}`,
  nama,
  kategoriId: "k1",
  harga,
  deskripsi: "",
  status: "aktif",
  stokTampilan: null,
  urutan: 0,
  iconKey: "package",
  foto: "",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  ...over,
});

export const trx = (over: Partial<Transaksi> = {}): Transaksi => ({
  id: `t-${++seq}`,
  tanggalWaktu: new Date().toISOString(),
  kasirEmail: "owner@toko.id",
  kasirNama: "Dewi",
  meja: "",
  items: [line("Nasi Goreng", 15000, 2)],
  jumlahItem: 2,
  subtotal: 30000,
  diskon: 0,
  pajak: 0,
  total: 30000,
  metodeBayar: "tunai",
  uangDiterima: 50000,
  kembalian: 20000,
  catatan: "",
  status: "selesai",
  idTransaksiAsal: null,
  ...over,
});

export const voidOf = (t: Transaksi): Transaksi => ({
  ...t,
  id: `void-${t.id}`,
  status: "dibatalkan",
  idTransaksiAsal: t.id,
});
