import type { Pengaturan, Transaksi } from "../types";
import { PAYMENT_METHOD_LABEL } from "../types";
import { formatDateTime, formatRupiah } from "./format";

// Characters per line at the printer's default font: 58mm paper ≈ 32, 80mm ≈ 48.
export const WIDTH_58MM = 32;
export const WIDTH_80MM = 48;

// Short, human-readable receipt number derived from the transaction id.
export function receiptNumber(t: Transaksi): string {
  return `#${t.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

// The sheet stores subtotal / diskon / pajak / total but not the service
// charge, so derive it: total = subtotal - diskon + pajak + service.
export function serviceChargeOf(t: Transaksi): number {
  return Math.max(0, t.total - (t.subtotal - t.diskon) - t.pajak);
}

// Thermal printers default to CP437/Latin-1: anything outside printable ASCII
// prints as "?" or garbage. Intl's currency format uses a NON-BREAKING SPACE
// ("Rp 15.000") and owners type things like "—", "✓", "é" in names/footers, so
// every receipt line goes through this before it reaches a printer.
export function toPrinterText(input: string): string {
  const map: Record<string, string> = {
    " ": " ",
    "–": "-",
    "—": "-",
    "−": "-",
    "×": "x",
    "·": "-",
    "•": "*",
    "‘": "'",
    "’": "'",
    "“": '"',
    "”": '"',
    "…": "...",
  };
  let out = "";
  for (const ch of input) {
    if (map[ch] !== undefined) out += map[ch];
    else if (ch === "\n" || (ch >= " " && ch <= "~")) out += ch;
    else {
      // strip accents (é → e); drop what has no ASCII form (emoji, symbols)
      const base = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (base.length && base >= " " && base <= "~") out += base;
    }
  }
  return out;
}

function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return " ".repeat(pad) + text;
}

function sep(width: number, char = "-"): string {
  return char.repeat(width);
}

function twoCol(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  return space > 0 ? left + " ".repeat(space) + right : left.slice(0, Math.max(0, width - right.length - 1)) + " " + right;
}

// Word-wraps to `width`, hard-splitting any single word longer than a line
// (a product name like "Supercali..." must not overflow the paper).
function wrapLine(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  const push = (s: string) => {
    if (s) lines.push(s);
  };
  for (const raw of text.split(" ")) {
    let word = raw;
    while (word.length > width) {
      if (current) {
        push(current);
        current = "";
      }
      push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!word) continue;
    if ((current ? current.length + 1 : 0) + word.length > width) {
      push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  push(current);
  return lines;
}

// The receipt split into the business-name block (which the ESC/POS printer
// renders big and bold) and everything below it. `nameWidth` is the wrap width
// for the name: half the paper width when the printer doubles character width.
export interface ReceiptSections {
  name: string[];
  rest: string[];
}

export function buildReceiptSections(t: Transaksi, p: Pengaturan, watermark = false, width = WIDTH_58MM, nameWidth = width): ReceiptSections {
  const W = width;
  const money = (n: number) => toPrinterText(formatRupiah(n));
  const name = wrapLine(toPrinterText(p.businessName || "Kasir Rakyat"), nameWidth);

  const rest: string[] = [];
  if (p.address) wrapLine(toPrinterText(p.address), W).forEach((l) => rest.push(center(l, W)));
  if (p.phone) rest.push(center(toPrinterText(p.phone), W));
  rest.push(sep(W));
  rest.push(twoCol("No.", receiptNumber(t), W));
  rest.push(toPrinterText(formatDateTime(t.tanggalWaktu)));
  rest.push(...wrapLine(toPrinterText(`Kasir: ${t.kasirNama || t.kasirEmail}`), W));
  if (t.meja) rest.push(...wrapLine(toPrinterText(`Meja : ${t.meja}`), W));
  rest.push(sep(W));
  for (const item of t.items) {
    wrapLine(toPrinterText(item.nama), W).forEach((l) => rest.push(l));
    rest.push(twoCol(`  ${item.qty} x ${money(item.harga)}`, money(item.harga * item.qty), W));
  }
  rest.push(sep(W));
  rest.push(twoCol("Subtotal", money(t.subtotal), W));
  if (t.diskon > 0) rest.push(twoCol("Diskon", `-${money(t.diskon)}`, W));
  if (t.pajak > 0) rest.push(twoCol("Pajak", money(t.pajak), W));
  const service = serviceChargeOf(t);
  if (service > 0) rest.push(twoCol("Service", money(service), W));
  rest.push(sep(W));
  rest.push(twoCol("TOTAL", money(t.total), W));
  rest.push(twoCol("Bayar", toPrinterText(PAYMENT_METHOD_LABEL[t.metodeBayar]), W));
  if (t.uangDiterima !== null) rest.push(twoCol("Diterima", money(t.uangDiterima), W));
  if (t.kembalian !== null) rest.push(twoCol("Kembali", money(t.kembalian), W));
  rest.push(sep(W));
  if (p.receiptFooterText) wrapLine(toPrinterText(p.receiptFooterText), W).forEach((l) => rest.push(center(l, W)));
  if (watermark) wrapLine("Dibuat dengan Kasir Rakyat (gratis)", W).forEach((l) => rest.push(center(l, W)));
  return { name, rest };
}

// Monospace receipt text — used by the RawBT intent URL and the copy-to-clipboard
// fallback (the native Bluetooth printer uses buildReceiptSections + ESC/POS
// styling instead). `watermark` is the free-plan receipt line (see
// src/lib/limits.ts). `width` is characters per line (32 for 58mm, 48 for 80mm).
export function buildReceiptText(t: Transaksi, p: Pengaturan, watermark = false, width = WIDTH_58MM): string {
  const { name, rest } = buildReceiptSections(t, p, watermark, width);
  return [...name.map((l) => center(l, width)), ...rest, "", ""].join("\n");
}
