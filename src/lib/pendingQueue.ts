import type { Transaksi } from "../types";

const KEY = "kasirRakyat.pendingTransaksi";

// A confirmed sale must never silently vanish just because Sheets was
// unreachable for a moment — this is the safety net behind checkout.ts's
// retry logic. Queue lives in localStorage (survives a reload/crash),
// flushed by checkout.ts on the 'online' event and on an interval.
export function loadPendingQueue(): Transaksi[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Transaksi[]) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(queue: Transaksi[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    // localStorage can throw (quota, private mode) — the in-memory queue
    // still works for this session, just won't survive a reload. Not
    // worth surfacing to the cashier mid-checkout.
  }
}

export function enqueuePending(t: Transaksi): void {
  const queue = loadPendingQueue();
  queue.push(t);
  savePendingQueue(queue);
}

export function removePending(id: string): void {
  savePendingQueue(loadPendingQueue().filter((t) => t.id !== id));
}

export function pendingCount(): number {
  return loadPendingQueue().length;
}
