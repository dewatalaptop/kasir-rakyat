import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { CartLineItem } from "../../components/cart/CartLineItem";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { CartIcon } from "../../components/ui/icons";
import { formatRupiah } from "../../lib/format";
import { computeTotals } from "../../lib/cart";
import { getBusinessType } from "../../lib/businessType";

export function CartPage() {
  const { state, dispatch } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const businessType = getBusinessType(settings.businessType);
  const totals = computeTotals(state.lines, settings.taxPercent, settings.serviceChargePercent);

  if (state.lines.length === 0) {
    return (
      <div className="p-4">
        <h1 className="mb-2 font-display text-lg font-bold text-[var(--text)]">Keranjang</h1>
        <EmptyState icon={<CartIcon size={32} />} title="Keranjang kosong" description="Ketuk produk di tab Kasir untuk mulai." />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4">
      <h1 className="mb-2 font-display text-lg font-bold text-[var(--text)]">Keranjang</h1>
      <div>
        {state.lines.map((line) => (
          <CartLineItem
            key={line.produkId}
            line={line}
            onSetQty={(qty) => dispatch({ type: "setQty", produkId: line.produkId, qty })}
            onRemove={() => dispatch({ type: "remove", produkId: line.produkId })}
          />
        ))}
      </div>
      {businessType.mejaLabel && (
        <input
          value={state.meja}
          onChange={(e) => dispatch({ type: "setMeja", meja: e.target.value })}
          placeholder={`${businessType.mejaLabel} (opsional)`}
          className="shape-card mt-3 border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
      )}
      <div className="mt-4 flex flex-col gap-1 text-sm">
        <div className="flex justify-between text-[var(--text-secondary)]">
          <span>Subtotal</span>
          <span className="font-tabular">{formatRupiah(totals.subtotal)}</span>
        </div>
        {totals.pajak > 0 && (
          <div className="flex justify-between text-[var(--text-secondary)]">
            <span>Pajak</span>
            <span className="font-tabular">{formatRupiah(totals.pajak)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between font-display text-base font-bold text-[var(--text)]">
          <span>Total</span>
          <span className="font-tabular">{formatRupiah(totals.total)}</span>
        </div>
      </div>
      <Button onClick={() => navigate("/kasir/bayar")} fullWidth className="mt-4">
        Lanjut Bayar
      </Button>
    </div>
  );
}
