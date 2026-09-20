import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { cartItemCount, computeTotals } from "../../lib/cart";
import { getBusinessType } from "../../lib/businessType";
import { Button } from "../ui/Button";
import { CartIcon, CreditCardIcon, TrashIcon } from "../ui/icons";
import { CartLineItem } from "./CartLineItem";
import { CartTotals } from "./CartTotals";

// The "Transaksi" side panel of the desktop cashier screen (xl+). The phone
// flow keeps its own full-screen /kasir/keranjang page.
export function CartPanel() {
  const { state, dispatch } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const businessType = getBusinessType(settings.businessType);
  const totals = computeTotals(state.lines, settings.taxPercent, settings.serviceChargePercent);
  const count = cartItemCount(state.lines);
  const [confirmClear, setConfirmClear] = useState(false);

  // Two-tap "Kosongkan": the first tap arms it for 3s, the second clears —
  // wiping a filled cart by one stray tap would lose a customer's order.
  useEffect(() => {
    if (!confirmClear) return;
    const id = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(id);
  }, [confirmClear]);

  const empty = state.lines.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col bg-[var(--surface)]">
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-extrabold text-[var(--text)]">Transaksi</h2>
          {count > 0 && (
            <span className="rounded-full bg-[var(--brand-100)] px-2 py-0.5 text-xs font-extrabold text-[var(--brand-700)]">{count} item</span>
          )}
        </div>
        {businessType.mejaLabel && (
          <input
            value={state.meja}
            onChange={(e) => dispatch({ type: "setMeja", meja: e.target.value })}
            placeholder={businessType.mejaLabel}
            aria-label={businessType.mejaLabel}
            className="h-9 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-center text-sm font-semibold outline-none focus:border-[var(--brand-400)]"
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 pb-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-50)] text-[var(--brand-500)]">
              <CartIcon size={30} />
            </span>
            <p className="font-display text-sm font-bold text-[var(--text)]">Belum ada item</p>
            <p className="max-w-[14rem] text-xs text-[var(--text-secondary)]">Ketuk produk di sebelah kiri untuk menambahkannya ke transaksi.</p>
          </div>
        ) : (
          state.lines.map((line) => (
            <CartLineItem
              key={line.produkId}
              line={line}
              onSetQty={(qty) => dispatch({ type: "setQty", produkId: line.produkId, qty })}
              onRemove={() => dispatch({ type: "remove", produkId: line.produkId })}
            />
          ))
        )}
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-5 pt-4">
        <CartTotals totals={totals} taxPercent={settings.taxPercent} serviceChargePercent={settings.serviceChargePercent} />
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-2.5">
          <Button
            variant="ghost"
            disabled={empty}
            onClick={() => {
              if (!confirmClear) return setConfirmClear(true);
              dispatch({ type: "clear" });
              setConfirmClear(false);
            }}
            icon={<TrashIcon size={16} />}
            className={confirmClear ? "!border-[var(--danger)] !text-[var(--danger)]" : ""}
          >
            {confirmClear ? "Yakin?" : "Kosongkan"}
          </Button>
          <Button disabled={empty} onClick={() => navigate("/kasir/bayar")} icon={<CreditCardIcon size={18} />} className="text-base">
            Bayar
          </Button>
        </div>
      </div>
    </section>
  );
}
