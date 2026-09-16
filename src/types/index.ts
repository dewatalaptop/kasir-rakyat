export type BusinessTypeKey = "resto" | "warung" | "toko" | "lainnya";

export interface Produk {
  id: string;
  nama: string;
  kategoriId: string;
  harga: number;
  deskripsi: string;
  status: "aktif" | "nonaktif";
  stokTampilan: number | null;
  urutan: number;
  iconKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface Kategori {
  id: string;
  nama: string;
  urutan: number;
  warnaTag: string;
  createdAt: string;
}

export type PaymentMethod = "tunai" | "qris-manual" | "transfer-manual" | "lainnya";

export interface CartLine {
  produkId: string;
  nama: string;
  harga: number;
  qty: number;
}

export interface Transaksi {
  id: string;
  tanggalWaktu: string;
  kasirEmail: string;
  kasirNama: string;
  meja: string;
  items: CartLine[];
  jumlahItem: number;
  subtotal: number;
  diskon: number;
  pajak: number;
  total: number;
  metodeBayar: PaymentMethod;
  uangDiterima: number | null;
  kembalian: number | null;
  catatan: string;
  status: "selesai" | "dibatalkan";
  idTransaksiAsal: string | null;
}

export interface Pengaturan {
  businessName: string;
  businessType: BusinessTypeKey;
  address: string;
  phone: string;
  accentHue: number;
  mejaEnabled: boolean;
  taxPercent: number;
  serviceChargePercent: number;
  receiptFooterText: string;
  printerPref: "rawbt" | "browser";
  onboardingCompleted: boolean;
  sheetCreatedAt: string;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  "qris-manual": "QRIS (manual)",
  "transfer-manual": "Transfer (manual)",
  lainnya: "Lainnya",
};
