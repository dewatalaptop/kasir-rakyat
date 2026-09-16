import type { CartLine, Produk } from "../types";

export interface CartState {
  lines: CartLine[];
  meja: string;
  catatan: string;
}

export type CartAction =
  | { type: "add"; produk: Produk }
  | { type: "setQty"; produkId: string; qty: number }
  | { type: "remove"; produkId: string }
  | { type: "setMeja"; meja: string }
  | { type: "setCatatan"; catatan: string }
  | { type: "clear" };

export const emptyCart: CartState = { lines: [], meja: "", catatan: "" };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      // Delta computed inside the updater, not from a captured `state`
      // closure — fast repeated taps on the same product must each see
      // the previous tap's result, not race on a stale read (a real bug
      // found and fixed in a sibling POS app's qty stepper).
      const existing = state.lines.find((l) => l.produkId === action.produk.id);
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) => (l.produkId === action.produk.id ? { ...l, qty: l.qty + 1 } : l)),
        };
      }
      return {
        ...state,
        lines: [...state.lines, { produkId: action.produk.id, nama: action.produk.nama, harga: action.produk.harga, qty: 1 }],
      };
    }
    case "setQty": {
      if (action.qty <= 0) {
        return { ...state, lines: state.lines.filter((l) => l.produkId !== action.produkId) };
      }
      return { ...state, lines: state.lines.map((l) => (l.produkId === action.produkId ? { ...l, qty: action.qty } : l)) };
    }
    case "remove":
      return { ...state, lines: state.lines.filter((l) => l.produkId !== action.produkId) };
    case "setMeja":
      return { ...state, meja: action.meja };
    case "setCatatan":
      return { ...state, catatan: action.catatan };
    case "clear":
      return emptyCart;
    default:
      return state;
  }
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.harga * l.qty, 0);
}

export function cartItemCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

export interface CartTotals {
  subtotal: number;
  pajak: number;
  serviceCharge: number;
  total: number;
}

export function computeTotals(lines: CartLine[], taxPercent: number, serviceChargePercent: number, diskon = 0): CartTotals {
  const subtotal = cartSubtotal(lines);
  const afterDiskon = Math.max(0, subtotal - diskon);
  const pajak = Math.round((afterDiskon * taxPercent) / 100);
  const serviceCharge = Math.round((afterDiskon * serviceChargePercent) / 100);
  return { subtotal, pajak, serviceCharge, total: afterDiskon + pajak + serviceCharge };
}
