import type { Pengaturan, Transaksi } from "../types";
import { PAYMENT_METHOD_LABEL } from "../types";
import { formatDateTime, formatRupiah } from "./format";

const WIDTH = 32;

function center(text: string): string {
  if (text.length >= WIDTH) return text.slice(0, WIDTH);
  const pad = Math.floor((WIDTH - text.length) / 2);
  return " ".repeat(pad) + text;
}

function sep(char = "-"): string {
  return char.repeat(WIDTH);
}

function twoCol(left: string, right: string): string {
  const space = WIDTH - left.length - right.length;
  return space > 0 ? left + " ".repeat(space) + right : left.slice(0, WIDTH - right.length - 1) + " " + right;
}

function wrapLine(text: string): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > WIDTH) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Plain 32-column monospace receipt text — used by both the RawBT intent
// URL and the copy-to-clipboard fallback in printing.ts.
export function buildReceiptText(t: Transaksi, p: Pengaturan): string {
  const lines: string[] = [];
  lines.push(center(p.businessName || "Kasir Rakyat"));
  if (p.address) wrapLine(p.address).forEach((l) => lines.push(center(l)));
  if (p.phone) lines.push(center(p.phone));
  lines.push(sep());
  lines.push(`${formatDateTime(t.tanggalWaktu)}`);
  lines.push(`Kasir: ${t.kasirNama || t.kasirEmail}`);
  if (t.meja) lines.push(`Meja : ${t.meja}`);
  lines.push(sep());
  for (const item of t.items) {
    wrapLine(item.nama).forEach((l) => lines.push(l));
    lines.push(twoCol(`  ${item.qty} x ${formatRupiah(item.harga)}`, formatRupiah(item.harga * item.qty)));
  }
  lines.push(sep());
  lines.push(twoCol("Subtotal", formatRupiah(t.subtotal)));
  if (t.diskon > 0) lines.push(twoCol("Diskon", `-${formatRupiah(t.diskon)}`));
  if (t.pajak > 0) lines.push(twoCol("Pajak", formatRupiah(t.pajak)));
  lines.push(sep());
  lines.push(twoCol("TOTAL", formatRupiah(t.total)));
  lines.push(twoCol("Bayar", PAYMENT_METHOD_LABEL[t.metodeBayar]));
  if (t.uangDiterima !== null) lines.push(twoCol("Diterima", formatRupiah(t.uangDiterima)));
  if (t.kembalian !== null) lines.push(twoCol("Kembali", formatRupiah(t.kembalian)));
  lines.push(sep());
  if (p.receiptFooterText) wrapLine(p.receiptFooterText).forEach((l) => lines.push(center(l)));
  lines.push("");
  lines.push("");
  return lines.join("\n");
}
