import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { STUDIO_PRODUCT_ID } from "./license";

// Self-service upgrade: the owner asks to upgrade from inside the app, gets a
// bank-transfer amount with a unique code on the end, transfers manually, and the
// app provider approves it in their dashboard (which flips the license on).
// See ai-app-builder/functions/src/index.ts (getStudioOffer & friends).

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// The top-level account fields mirror accounts[0] (older servers only send those).
export interface BankInfo extends BankAccount {
  accounts?: BankAccount[];
  whatsapp: string;
  note: string;
}

// Every account the buyer may pay into; the first is the primary.
export function bankAccounts(bank: BankInfo): BankAccount[] {
  return bank.accounts && bank.accounts.length > 0 ? bank.accounts : [bank];
}

export interface PendingTransfer {
  id: string;
  baseAmount: number;
  uniqueCode: number;
  totalAmount: number;
  createdAt: string | null;
}

export interface UpgradeOffer {
  product: { id: string; brandName: string; priceIdr: number; billingCycle: "sekali-bayar" | "bulanan" | "tahunan"; purchasable: boolean };
  bank: BankInfo | null;
  license: { active: boolean; expiresAt: string | null };
  pending: PendingTransfer | null;
}

const getOfferFn = httpsCallable<{ productId: string }, UpgradeOffer>(functions, "getStudioOffer");
const requestFn = httpsCallable<{ productId: string }, PendingTransfer & { reused: boolean }>(functions, "requestStudioUpgrade");
const cancelFn = httpsCallable<{ paymentRequestId: string }, { ok: true }>(functions, "cancelMyStudioUpgrade");

export async function fetchOffer(): Promise<UpgradeOffer> {
  return (await getOfferFn({ productId: STUDIO_PRODUCT_ID })).data;
}

export async function requestUpgrade(): Promise<PendingTransfer> {
  return (await requestFn({ productId: STUDIO_PRODUCT_ID })).data;
}

export async function cancelUpgrade(paymentRequestId: string): Promise<void> {
  await cancelFn({ paymentRequestId });
}

// Firebase callable errors arrive as "functions/failed-precondition" etc. with
// the server's Indonesian message in .message — show that, not the code.
export function upgradeErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "";
  if (/unauthenticated|Not signed in/i.test(message)) return "Sesi login berakhir — masuk lagi dulu.";
  if (/network|unavailable|internal|Failed to fetch/i.test(message)) return "Tidak bisa terhubung ke server pembayaran. Periksa internet lalu coba lagi.";
  return message || "Terjadi kesalahan. Coba lagi.";
}

export function billingLabel(cycle: UpgradeOffer["product"]["billingCycle"]): string {
  return cycle === "bulanan" ? "/bulan" : cycle === "tahunan" ? "/tahun" : " (sekali bayar)";
}

// Days until a license expires (rounded up), null when it never expires.
export function daysLeft(expiresAt: string | null, now = Date.now()): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - now) / 86_400_000);
}

// Show the renew button from a week out — early renewals extend from the current
// expiry (server side), so nothing is lost by paying ahead.
export const RENEW_WINDOW_DAYS = 7;
export function canRenew(license: UpgradeOffer["license"], now = Date.now()): boolean {
  if (!license.active) return false;
  const left = daysLeft(license.expiresAt, now);
  return left !== null && left <= RENEW_WINDOW_DAYS;
}
