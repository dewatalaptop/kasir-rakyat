import type { Pengaturan, Transaksi } from "../../types";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { formatDateTime, formatRupiah } from "../../lib/format";

// Scoped for @media print via the #receipt id (see index.css) — the
// universal browser/desktop print fallback needing no app at all.
export function ReceiptView({ t, p }: { t: Transaksi; p: Pengaturan }) {
  return (
    <div id="receipt" className="font-tabular mx-auto max-w-xs bg-white p-4 text-[13px] text-black">
      <p className="text-center font-display text-base font-extrabold">{p.businessName || "Kasir Rakyat"}</p>
      {p.address && <p className="text-center text-[11px]">{p.address}</p>}
      {p.phone && <p className="text-center text-[11px]">{p.phone}</p>}
      <div className="my-2 border-t border-dashed border-black" />
      <p>{formatDateTime(t.tanggalWaktu)}</p>
      <p>Kasir: {t.kasirNama}</p>
      {t.meja && <p>Meja: {t.meja}</p>}
      <div className="my-2 border-t border-dashed border-black" />
      {t.items.map((item) => (
        <div key={item.produkId} className="mb-1">
          <p>{item.nama}</p>
          <div className="flex justify-between">
            <span>
              {item.qty} x {formatRupiah(item.harga)}
            </span>
            <span>{formatRupiah(item.harga * item.qty)}</span>
          </div>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatRupiah(t.subtotal)}</span>
      </div>
      {t.pajak > 0 && (
        <div className="flex justify-between">
          <span>Pajak</span>
          <span>{formatRupiah(t.pajak)}</span>
        </div>
      )}
      <div className="my-2 border-t border-dashed border-black" />
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{formatRupiah(t.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>Bayar</span>
        <span>{PAYMENT_METHOD_LABEL[t.metodeBayar]}</span>
      </div>
      {t.uangDiterima !== null && (
        <div className="flex justify-between">
          <span>Diterima</span>
          <span>{formatRupiah(t.uangDiterima)}</span>
        </div>
      )}
      {t.kembalian !== null && (
        <div className="flex justify-between">
          <span>Kembali</span>
          <span>{formatRupiah(t.kembalian)}</span>
        </div>
      )}
      <div className="my-2 border-t border-dashed border-black" />
      {p.receiptFooterText && <p className="text-center text-[11px]">{p.receiptFooterText}</p>}
    </div>
  );
}
