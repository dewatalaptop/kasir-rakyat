import type { KasirProfil, KasirRole, Permission } from "../types";

// Function restrictions for the people who work the register. The owner (whoever
// unlocks the admin password) can do everything; a registered kasir gets only
// what their profile allows.
//
//   riwayat   — see EVERY cashier's transactions (Admin > Transaksi, and all of
//               today's history). Without it a kasir only sees their own sales.
//   batalkan  — void a completed transaction.
//   laporan   — Dashboard and Laporan (revenue, best sellers).
//   produk    — add/edit products and categories.
//
// Pengaturan, Kasir (this feature), Akun/Langganan, Printer and Sheets
// connection are ALWAYS owner-only — they are not permissions you can grant.
export const ALL_PERMISSIONS: Permission[] = ["riwayat", "batalkan", "laporan", "produk"];

export const PERMISSION_LABEL: Record<Permission, string> = {
  riwayat: "Lihat semua riwayat transaksi",
  batalkan: "Batalkan transaksi",
  laporan: "Lihat laporan & dashboard",
  produk: "Kelola produk & kategori",
};

export const ROLE_LABEL: Record<KasirRole, string> = {
  kasir: "Kasir",
  supervisor: "Supervisor",
  manajer: "Manajer",
};

export const ROLE_DESCRIPTION: Record<KasirRole, string> = {
  kasir: "Hanya berjualan dan melihat transaksinya sendiri hari ini.",
  supervisor: "Kasir + melihat semua riwayat dan membatalkan transaksi.",
  manajer: "Semua izin: laporan, produk, riwayat, pembatalan (tanpa pengaturan & langganan).",
};

export const ROLE_PRESETS: Record<KasirRole, Permission[]> = {
  kasir: [],
  supervisor: ["riwayat", "batalkan"],
  manajer: [...ALL_PERMISSIONS],
};

// What a page/action needs: a specific permission, "owner" (never grantable),
// or "any-admin" (has at least one admin-area permission).
export type Requirement = Permission | "owner" | "any-admin";

export function hasAnyAdminPermission(profile: KasirProfil | null): boolean {
  return !!profile && profile.izin.length > 0;
}

export function canAccess(req: Requirement, opts: { isOwner: boolean; profile: KasirProfil | null }): boolean {
  if (opts.isOwner) return true;
  if (req === "owner") return false;
  if (!opts.profile || !opts.profile.aktif) return false;
  if (req === "any-admin") return hasAnyAdminPermission(opts.profile);
  return opts.profile.izin.includes(req);
}

// --- PIN ---------------------------------------------------------------------

export const PIN_MIN = 4;
export const PIN_MAX = 6;

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN},${PIN_MAX}}$`).test(pin);
}

// SHA-256 over "<profile id>:<pin>" — salted per profile so two cashiers with
// the same PIN don't share a hash. This is a deterrent for a shared register,
// not real security: the sheet is readable by anyone with the owner's Google
// account, and a 4-6 digit PIN is trivially brute-forceable offline (see README).
export async function hashPin(pin: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(pin: string, profile: Pick<KasirProfil, "id" | "pinHash">): Promise<boolean> {
  return (await hashPin(pin, profile.id)) === profile.pinHash;
}

// --- Brute-force throttle ----------------------------------------------------
// 5 wrong PINs in a row lock that profile for 30s, doubling per further miss up
// to 5 minutes. State is passed in/out so it is trivially testable.
export interface ThrottleState {
  failures: number;
  lockedUntil: number; // epoch ms, 0 = not locked
}

export const EMPTY_THROTTLE: ThrottleState = { failures: 0, lockedUntil: 0 };
const FREE_ATTEMPTS = 5;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 300_000;

export function lockRemainingMs(s: ThrottleState, now: number): number {
  return Math.max(0, s.lockedUntil - now);
}

export function recordFailure(s: ThrottleState, now: number): ThrottleState {
  const failures = s.failures + 1;
  if (failures < FREE_ATTEMPTS) return { failures, lockedUntil: 0 };
  const over = failures - FREE_ATTEMPTS;
  const lockMs = Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** over);
  return { failures, lockedUntil: now + lockMs };
}

export function recordSuccess(): ThrottleState {
  return EMPTY_THROTTLE;
}

// Names must be unique (case-insensitive): the transaction sheet attributes a
// sale by cashier NAME.
export function isNameTaken(name: string, list: KasirProfil[], exceptId?: string): boolean {
  const n = name.trim().toLowerCase();
  return list.some((k) => k.id !== exceptId && k.nama.trim().toLowerCase() === n);
}
