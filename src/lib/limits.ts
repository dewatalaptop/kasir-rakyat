import type { PlanStatus } from "./license";

export interface PlanLimits {
  maxProduk: number;
  laporanDayOptions: number[];
  receiptWatermark: boolean;
}

const GRATIS: PlanLimits = {
  maxProduk: 20,
  laporanDayOptions: [7],
  receiptWatermark: true,
};

const BERBAYAR: PlanLimits = {
  maxProduk: Infinity,
  laporanDayOptions: [7, 30, 90],
  receiptWatermark: false,
};

export function limitsFor(plan: PlanStatus): PlanLimits {
  return plan === "berbayar" ? BERBAYAR : GRATIS;
}
