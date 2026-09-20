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
  // Reference to a product photo, "" when none. Format: "internal:<filename>"
  // (private app storage on this device) or "drive:<fileId>" (Google Drive
  // file created by this app). Only meaningful on the paid Android app —
  // see src/lib/features.ts and src/lib/productPhotos.ts.
  foto: string;
  createdAt: string;
  updatedAt: string;
}

export type FotoStorage = "internal" | "drive";

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
  // UI-only: product photo reference so the cart can show a thumbnail. It is
  // stripped before a transaction is saved (see checkout.buildTransaksi) —
  // photo refs must never end up in the Transaksi sheet history.
  foto?: string;
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
  // Where NEW product photos are saved: this device's private app memory, or
  // the store's own Google Drive (visible on every cashier phone).
  fotoStorage: FotoStorage;
  onboardingCompleted: boolean;
  sheetCreatedAt: string;
  // SHA-256 hex hash, never the plaintext password itself — empty/absent
  // means no admin password has been set up yet (see AdminAuthGuard).
  adminPasswordHash: string;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  tunai: "Tunai",
  "qris-manual": "QRIS (manual)",
  "transfer-manual": "Transfer (manual)",
  lainnya: "Lainnya",
};
