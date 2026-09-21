import type { Pengaturan, Transaksi } from "../types";
import { WIDTH_58MM, WIDTH_80MM, buildReceiptSections, toPrinterText } from "./receipt";

// Standard ESC/POS control bytes — the command set virtually every thermal
// receipt printer (58mm and 80mm alike) understands out of the box.
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export const CMD = {
  init: [ESC, 0x40],
  alignLeft: [ESC, 0x61, 0],
  alignCenter: [ESC, 0x61, 1],
  boldOn: [ESC, 0x45, 1],
  boldOff: [ESC, 0x45, 0],
  // GS ! 0x11 = double width AND double height (so name lines wrap at half width)
  doubleOn: [GS, 0x21, 0x11],
  doubleOff: [GS, 0x21, 0x00],
  feed: (lines: number) => [ESC, 0x64, lines],
  // GS V 66 n = feed then partial cut — the variant 58/80mm printers respond to;
  // full-cut-only models simply cut.
  cut: [GS, 0x56, 66, 3],
} as const;

export type PaperWidthKey = "58" | "80";

export const PAPER_WIDTHS: Record<PaperWidthKey, { label: string; chars: number }> = {
  "58": { label: "58mm (kertas kecil)", chars: WIDTH_58MM },
  "80": { label: "80mm (kertas besar)", chars: WIDTH_80MM },
};

// Text -> single-byte. Everything is already reduced to printable ASCII by
// toPrinterText (thermal printers boot into CP437), '?' is the last-resort
// fallback for anything that slipped through.
function textBytes(s: string): number[] {
  const bytes: number[] = [];
  for (const ch of toPrinterText(s)) {
    const code = ch.charCodeAt(0);
    bytes.push(code < 256 ? code : 0x3f);
  }
  bytes.push(LF);
  return bytes;
}

// Raw ESC/POS for one receipt: big bold business name, the body from the same
// layout the on-screen/RawBT receipt uses (so all three outputs always agree),
// then feed + partial cut.
export function buildReceiptBytes(t: Transaksi, p: Pengaturan, opts: { paperWidth: PaperWidthKey; watermark?: boolean }): Uint8Array {
  const width = PAPER_WIDTHS[opts.paperWidth].chars;
  const { name, rest } = buildReceiptSections(t, p, !!opts.watermark, width, Math.floor(width / 2));
  const out: number[] = [...CMD.init];
  out.push(...CMD.alignCenter, ...CMD.boldOn, ...CMD.doubleOn);
  for (const line of name) out.push(...textBytes(line));
  out.push(...CMD.doubleOff, ...CMD.boldOff, ...CMD.alignLeft);
  for (const line of rest) out.push(...textBytes(line));
  out.push(...CMD.feed(4), ...CMD.cut);
  return Uint8Array.from(out);
}

// A short self-test page (no sale data) for "Tes cetak" — proves the link,
// the paper width and the character set before a real customer is waiting.
export function buildTestPageBytes(businessName: string, paperWidth: PaperWidthKey): Uint8Array {
  const width = PAPER_WIDTHS[paperWidth].chars;
  const out: number[] = [...CMD.init, ...CMD.alignCenter, ...CMD.boldOn];
  out.push(...textBytes("TES PRINTER"), ...CMD.boldOff);
  out.push(...textBytes(businessName || "Kasir Rakyat"));
  out.push(...CMD.alignLeft);
  out.push(...textBytes("-".repeat(width)));
  out.push(...textBytes(`Kertas ${paperWidth}mm = ${width} kolom`));
  out.push(...textBytes("0123456789".repeat(Math.ceil(width / 10)).slice(0, width)));
  out.push(...textBytes("Jika baris angka di atas utuh dan tidak terpotong, printer sudah benar."));
  out.push(...textBytes("-".repeat(width)));
  out.push(...CMD.feed(4), ...CMD.cut);
  return Uint8Array.from(out);
}

// BLE writes are limited to the negotiated MTU minus 3 bytes of ATT header.
export function chunkBytes(bytes: Uint8Array, size: number): Uint8Array[] {
  if (size < 1) throw new Error("chunk size must be >= 1");
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.slice(i, i + size));
  return chunks;
}

// ---- Decoder: what a printer would actually put on paper -------------------
// Used by tests (and available for debugging): walks the byte stream, drops
// control sequences, and returns the printed lines plus whether it ends in a cut.
export interface DecodedPrint {
  lines: string[];
  cut: boolean;
  initialised: boolean;
  boldLines: string[];
}

export function decodeEscPos(bytes: Uint8Array): DecodedPrint {
  const lines: string[] = [];
  const boldLines: string[] = [];
  let cur = "";
  let bold = false;
  let cut = false;
  let initialised = false;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === ESC) {
      const c = bytes[i + 1];
      if (c === 0x40) {
        initialised = true;
        i += 1;
      } else if (c === 0x61) i += 2;
      else if (c === 0x45) {
        bold = bytes[i + 2] === 1;
        i += 2;
      } else if (c === 0x64) i += 2;
      else i += 1;
    } else if (b === GS) {
      const c = bytes[i + 1];
      if (c === 0x21) i += 2;
      else if (c === 0x56) {
        cut = true;
        i += bytes[i + 2] === 66 ? 3 : 2;
      } else i += 1;
    } else if (b === LF) {
      lines.push(cur);
      if (bold) boldLines.push(cur);
      cur = "";
    } else {
      cur += String.fromCharCode(b);
    }
  }
  if (cur) lines.push(cur);
  return { lines, cut, initialised, boldLines };
}
