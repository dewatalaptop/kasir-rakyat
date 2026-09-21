import type { Pengaturan, Transaksi } from "../../types";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { formatDateTime, formatRupiah } from "../../lib/format";
import { receiptNumber, serviceChargeOf } from "../../lib/receipt";
import { BrandMark } from "../ui/icons";

function Row({ left, right, strong = false }: { left: string; right: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "text-sm font-extrabold" : ""}`}>
      <span>{left}</span>
      <span className="font-tabular">{right}</span>
    </div>
  );
}

// Scoped for @media print via the #receipt id (see index.css) — the
// universal browser/desktop print fallback needing no app at all.
export function ReceiptView({ t, p, watermark = false }: { t: Transaksi; p: Pengaturan; watermark?: boolean }) {
  return (
    <div id="receipt" className="mx-auto w-full max-w-xs rounded-md bg-white p-5 text-[12.5px] leading-snug text-black shadow-[0_6px_24px_rgba(16,40,28,0.14)]">
      <div className="mb-2 flex flex-col items-center gap-1 text-center">
        <BrandMark size={34} className="print:hidden" />
        <p className="font-display text-base font-extrabold leading-tight">{p.businessName || "Kasir Rakyat"}</p>
        {p.address && <p className="text-[11px] text-gray-700">{p.address}</p>}
        {p.phone && <p className="text-[11px] text-gray-700">{p.phone}</p>}
      </div>
      <div className="my-2 border-t border-dashed border-gray-400" />
      <div className="flex flex-col gap-0.5 text-[11.5px]">
        <Row left="No. Transaksi" right={receiptNumber(t)} />
        <Row left="Tanggal" right={formatDateTime(t.tanggalWaktu)} />
        <Row left="Kasir" right={t.kasirNama} />
        {t.meja && <Row left="Meja" right={t.meja} />}
      </div>
      <div className="my-2 border-t border-dashed border-gray-400" />
      {t.items.map((item) => (
        <div key={item.produkId} className="mb-1.5">
          <p className="font-semibold">{item.nama}</p>
          <Row left={`${item.qty} x ${formatRupiah(item.harga)}`} right={formatRupiah(item.harga * item.qty)} />
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-gray-400" />
      <Row left="Subtotal" right={formatRupiah(t.subtotal)} />
      {t.diskon > 0 && <Row left="Diskon" right={`-${formatRupiah(t.diskon)}`} />}
      {t.pajak > 0 && <Row left="Pajak" right={formatRupiah(t.pajak)} />}
      {serviceChargeOf(t) > 0 && <Row left="Service" right={formatRupiah(serviceChargeOf(t))} />}
      <div className="my-2 border-t border-dashed border-gray-400" />
      <Row left="TOTAL" right={formatRupiah(t.total)} strong />
      <Row left="Bayar" right={PAYMENT_METHOD_LABEL[t.metodeBayar]} />
      {t.uangDiterima !== null && <Row left="Diterima" right={formatRupiah(t.uangDiterima)} />}
      {t.kembalian !== null && <Row left="Kembali" right={formatRupiah(t.kembalian)} />}
      <div className="my-2 border-t border-dashed border-gray-400" />
      {p.receiptFooterText && <p className="text-center text-[11px] font-medium">{p.receiptFooterText}</p>}
      {watermark && <p className="mt-1 text-center text-[10px] text-gray-500">Dibuat dengan Kasir Rakyat (gratis)</p>}
    </div>
  );
}
