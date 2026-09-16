import type { CartLine, Kategori, PaymentMethod, Pengaturan, Produk, Transaksi } from "../types";

// One tab per "table". Header row is written once at spreadsheet creation
// (see sheetsStore.ensureAppSpreadsheet) and never touched again — column
// ORDER here must match that header order exactly, since row<->object
// mapping below is positional (A1 ranges), not by header lookup.
export const SHEET_TABS = {
  pengaturan: "Pengaturan",
  produk: "Produk",
  kategori: "Kategori",
  transaksi: "Transaksi",
} as const;

export const HEADERS = {
  pengaturan: ["key", "value", "updated_at"],
  produk: [
    "id",
    "nama",
    "kategori_id",
    "harga",
    "deskripsi",
    "status",
    "stok_tampilan",
    "urutan",
    "icon_key",
    "created_at",
    "updated_at",
  ],
  kategori: ["id", "nama", "urutan", "warna_tag", "created_at"],
  transaksi: [
    "id",
    "tanggal_waktu",
    "kasir_email",
    "kasir_nama",
    "meja",
    "items_json",
    "jumlah_item",
    "subtotal",
    "diskon",
    "pajak",
    "total",
    "metode_bayar",
    "uang_diterima",
    "kembalian",
    "catatan",
    "status",
    "id_transaksi_asal",
  ],
} as const;

// data-row ranges (row 1 is the header, real data starts at row 2 and
// grows downward — Sheets has no fixed row count, so no upper bound here).
export function dataRange(tab: string): string {
  const col = String.fromCharCode(65 + (HEADERS as Record<string, readonly string[]>)[tabKeyFor(tab)].length - 1);
  return `${tab}!A2:${col}`;
}

function tabKeyFor(tab: string): keyof typeof HEADERS {
  const entry = Object.entries(SHEET_TABS).find(([, v]) => v === tab);
  if (!entry) throw new Error(`Unknown sheet tab: ${tab}`);
  return entry[0] as keyof typeof HEADERS;
}

function cell(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

export function produkToRow(p: Produk): (string | number)[] {
  return [
    p.id,
    p.nama,
    p.kategoriId,
    p.harga,
    p.deskripsi,
    p.status,
    cell(p.stokTampilan),
    p.urutan,
    p.iconKey,
    p.createdAt,
    p.updatedAt,
  ];
}

export function rowToProduk(row: string[]): Produk {
  const [id, nama, kategoriId, harga, deskripsi, status, stok, urutan, iconKey, createdAt, updatedAt] = row;
  return {
    id,
    nama,
    kategoriId,
    harga: Number(harga) || 0,
    deskripsi: deskripsi ?? "",
    status: status === "nonaktif" ? "nonaktif" : "aktif",
    stokTampilan: stok === "" || stok === undefined ? null : Number(stok),
    urutan: Number(urutan) || 0,
    iconKey: iconKey ?? "package",
    createdAt: createdAt ?? "",
    updatedAt: updatedAt ?? "",
  };
}

export function kategoriToRow(k: Kategori): (string | number)[] {
  return [k.id, k.nama, k.urutan, k.warnaTag, k.createdAt];
}

export function rowToKategori(row: string[]): Kategori {
  const [id, nama, urutan, warnaTag, createdAt] = row;
  return { id, nama, urutan: Number(urutan) || 0, warnaTag: warnaTag ?? "brand", createdAt: createdAt ?? "" };
}

export function transaksiToRow(t: Transaksi): (string | number)[] {
  return [
    t.id,
    t.tanggalWaktu,
    t.kasirEmail,
    t.kasirNama,
    t.meja,
    JSON.stringify(t.items),
    t.jumlahItem,
    t.subtotal,
    t.diskon,
    t.pajak,
    t.total,
    t.metodeBayar,
    cell(t.uangDiterima),
    cell(t.kembalian),
    t.catatan,
    t.status,
    cell(t.idTransaksiAsal),
  ];
}

export function rowToTransaksi(row: string[]): Transaksi {
  const [
    id,
    tanggalWaktu,
    kasirEmail,
    kasirNama,
    meja,
    itemsJson,
    jumlahItem,
    subtotal,
    diskon,
    pajak,
    total,
    metodeBayar,
    uangDiterima,
    kembalian,
    catatan,
    status,
    idTransaksiAsal,
  ] = row;
  let items: CartLine[] = [];
  try {
    items = JSON.parse(itemsJson || "[]");
  } catch {
    items = [];
  }
  return {
    id,
    tanggalWaktu,
    kasirEmail,
    kasirNama,
    meja: meja ?? "",
    items,
    jumlahItem: Number(jumlahItem) || 0,
    subtotal: Number(subtotal) || 0,
    diskon: Number(diskon) || 0,
    pajak: Number(pajak) || 0,
    total: Number(total) || 0,
    metodeBayar: (metodeBayar as PaymentMethod) || "tunai",
    uangDiterima: uangDiterima === "" || uangDiterima === undefined ? null : Number(uangDiterima),
    kembalian: kembalian === "" || kembalian === undefined ? null : Number(kembalian),
    catatan: catatan ?? "",
    status: status === "dibatalkan" ? "dibatalkan" : "selesai",
    idTransaksiAsal: idTransaksiAsal || null,
  };
}

// Sheets' `valueInputOption=USER_ENTERED` (used by appendRow/updateRow)
// semantically parses a written "true"/"false" string as a real boolean
// cell — reading it back returns the canonical "TRUE"/"FALSE" (uppercase),
// not the literal lowercase string that was written. An exact-case
// comparison here would silently always evaluate false (found live: this
// broke onboarding_completed forever, causing an infinite redirect loop
// back to /onboarding even after it "succeeded"). Compare case-insensitively.
function isTrue(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

export function settingsRowsToObject(rows: string[][]): Partial<Pengaturan> {
  const map: Record<string, string> = {};
  for (const [key, value] of rows) map[key] = value;
  const out: Partial<Pengaturan> = {};
  if (map.business_name !== undefined) out.businessName = map.business_name;
  if (map.business_type !== undefined) out.businessType = map.business_type as Pengaturan["businessType"];
  if (map.address !== undefined) out.address = map.address;
  if (map.phone !== undefined) out.phone = map.phone;
  if (map.accent_hue !== undefined) out.accentHue = Number(map.accent_hue) || 28;
  if (map.meja_enabled !== undefined) out.mejaEnabled = isTrue(map.meja_enabled);
  if (map.tax_percent !== undefined) out.taxPercent = Number(map.tax_percent) || 0;
  if (map.service_charge_percent !== undefined) out.serviceChargePercent = Number(map.service_charge_percent) || 0;
  if (map.receipt_footer_text !== undefined) out.receiptFooterText = map.receipt_footer_text;
  if (map.printer_pref !== undefined) out.printerPref = map.printer_pref as Pengaturan["printerPref"];
  if (map.onboarding_completed !== undefined) out.onboardingCompleted = isTrue(map.onboarding_completed);
  if (map.sheet_created_at !== undefined) out.sheetCreatedAt = map.sheet_created_at;
  if (map.admin_password_hash !== undefined) out.adminPasswordHash = map.admin_password_hash;
  return out;
}
