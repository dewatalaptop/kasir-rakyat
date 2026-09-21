// State + logic for the in-app tutorial: the first-run tour, the "Panduan Awal"
// checklist and the dismissible page tips. Kept on THIS device only (localStorage)
// — a tutorial you already saw should not depend on the network, and a second
// phone showing it once more is harmless.
import { readStored, writeStored } from "./session";

export const GUIDE_KEY = "kasirRakyat.guide";

export type StepKey = "produk" | "jual" | "printer" | "keamanan";

export interface GuideState {
  // checklist steps the user has actually done in the app
  marked: StepKey[];
  // the checklist was hidden by the user
  checklistHidden: boolean;
  // the tour was finished or skipped at least once
  tourSeen: boolean;
  // page tips the user closed
  tipsClosed: string[];
}

export const EMPTY_GUIDE: GuideState = { marked: [], checklistHidden: false, tourSeen: false, tipsClosed: [] };

function parse(raw: string | null): GuideState {
  if (!raw) return EMPTY_GUIDE;
  try {
    const v = JSON.parse(raw) as Partial<GuideState>;
    return {
      marked: Array.isArray(v.marked) ? (v.marked.filter((k) => typeof k === "string") as StepKey[]) : [],
      checklistHidden: !!v.checklistHidden,
      tourSeen: !!v.tourSeen,
      tipsClosed: Array.isArray(v.tipsClosed) ? v.tipsClosed.filter((k) => typeof k === "string") : [],
    };
  } catch {
    return EMPTY_GUIDE;
  }
}

// useSyncExternalStore needs a referentially stable snapshot while nothing changed.
let cachedRaw: string | null | undefined;
let cached: GuideState = EMPTY_GUIDE;

export function getGuide(): GuideState {
  const raw = readStored(GUIDE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

const listeners = new Set<() => void>();
export function subscribeGuide(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function update(patch: (g: GuideState) => GuideState): void {
  writeStored(GUIDE_KEY, JSON.stringify(patch(getGuide())));
  listeners.forEach((l) => l());
}

export function markStep(key: StepKey): void {
  if (getGuide().marked.includes(key)) return;
  update((g) => ({ ...g, marked: [...g.marked, key] }));
}
export function setChecklistHidden(hidden: boolean): void {
  update((g) => ({ ...g, checklistHidden: hidden }));
}
export function setTourSeen(seen: boolean): void {
  update((g) => ({ ...g, tourSeen: seen }));
}
export function closeTip(key: string): void {
  if (getGuide().tipsClosed.includes(key)) return;
  update((g) => ({ ...g, tipsClosed: [...g.tipsClosed, key] }));
}

// The tour is started on demand ("Ulangi tur") as well as on first run, so its
// on/off lives in a tiny in-memory store of its own.
let tourRunning = false;
const tourListeners = new Set<() => void>();
export const tourStore = {
  get: () => tourRunning,
  subscribe(l: () => void) {
    tourListeners.add(l);
    return () => tourListeners.delete(l);
  },
  set(on: boolean) {
    if (tourRunning === on) return;
    tourRunning = on;
    tourListeners.forEach((l) => l());
  },
};

// --- checklist ------------------------------------------------------------

export interface QuickStartStep {
  key: StepKey;
  title: string;
  hint: string;
  to: string;
  done: boolean;
  optional: boolean;
}

export interface QuickStart {
  steps: QuickStartStep[];
  done: number;
  total: number;
  percent: number;
  allDone: boolean;
  next: QuickStartStep | null;
}

// `keamanan` is derived from the real state (a password exists) rather than
// remembered, so it can never say "done" for a password that was removed.
export function computeQuickStart(input: { marked: StepKey[]; hasOwnerPassword: boolean }): QuickStart {
  const marked = new Set(input.marked);
  const steps: QuickStartStep[] = [
    { key: "produk", title: "Isi daftar produk & harga", hint: "Tambah produk jualanmu (atau ubah contoh yang ada).", to: "/admin/produk", done: marked.has("produk"), optional: false },
    { key: "jual", title: "Coba satu penjualan", hint: "Ketuk produk, lanjut bayar, lihat struknya.", to: "/kasir", done: marked.has("jual"), optional: false },
    { key: "printer", title: "Sambungkan printer struk", hint: "Bluetooth, RawBT, atau cetak dari browser. Boleh dilewati.", to: "/admin/pengaturan/printer", done: marked.has("printer"), optional: true },
    { key: "keamanan", title: "Kunci menu pemilik dengan password", hint: "Perlu kalau ada karyawan yang memakai kasir.", to: "/admin/pengaturan", done: input.hasOwnerPassword, optional: true },
  ];
  const done = steps.filter((s) => s.done).length;
  return {
    steps,
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100),
    allDone: done === steps.length,
    next: steps.find((s) => !s.done && !s.optional) ?? steps.find((s) => !s.done) ?? null,
  };
}
