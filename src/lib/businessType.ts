import type { BusinessTypeKey } from "../types";

export interface BusinessTypeConfig {
  key: BusinessTypeKey;
  label: string;
  icon: string;
  mejaLabel: string | null;
  defaultKategori: string[];
  defaultAccentHue: number;
}

// One settings choice, not a separate codepath per vertical — every
// business type shares the same catalog+cart+checkout flow underneath.
// This only adjusts terminology, starter categories, and an accent hue.
export const BUSINESS_TYPES: BusinessTypeConfig[] = [
  {
    key: "resto",
    label: "Restoran / Rumah Makan",
    icon: "utensils",
    mejaLabel: "Meja",
    defaultKategori: ["Makanan Utama", "Minuman", "Camilan", "Paket Hemat"],
    defaultAccentHue: 28,
  },
  {
    key: "warung",
    label: "Warung / Kedai Kopi",
    icon: "coffee",
    mejaLabel: "Meja",
    defaultKategori: ["Makanan", "Minuman", "Rokok & Lainnya"],
    defaultAccentHue: 28,
  },
  {
    key: "toko",
    label: "Toko / Kelontong",
    icon: "store",
    mejaLabel: null,
    defaultKategori: ["Sembako", "Minuman", "Kebutuhan Rumah", "Lainnya"],
    defaultAccentHue: 28,
  },
  {
    key: "lainnya",
    label: "Lainnya",
    icon: "grid",
    mejaLabel: null,
    defaultKategori: ["Produk"],
    defaultAccentHue: 28,
  },
];

export function getBusinessType(key: BusinessTypeKey): BusinessTypeConfig {
  return BUSINESS_TYPES.find((b) => b.key === key) ?? BUSINESS_TYPES[3];
}
