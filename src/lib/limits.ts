import type { PlanStatus } from "./license";

export interface PlanLimits {
  maxProduk: number;
  laporanDayOptions: number[];
  receiptWatermark: boolean;
  // Product photos — a paid-plan feature (and additionally Android-app-only,
  // see features.ts::productPhotoAccess).
  productPhotos: boolean;
}

const GRATIS: PlanLimits = {
  maxProduk: 20,
  laporanDayOptions: [7],
  receiptWatermark: true,
  productPhotos: false,
};

const BERBAYAR: PlanLimits = {
  maxProduk: Infinity,
  laporanDayOptions: [7, 30, 90],
  receiptWatermark: false,
  productPhotos: true,
};

export function limitsFor(plan: PlanStatus): PlanLimits {
  return plan === "berbayar" ? BERBAYAR : GRATIS;
}
