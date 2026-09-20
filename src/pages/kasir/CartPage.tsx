import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useSettings } from "../../context/SettingsContext";
import { CartLineItem } from "../../components/cart/CartLineItem";
import { CartPanel } from "../../components/cart/CartPanel";
import { CartTotals } from "../../components/cart/CartTotals";
import { TopBar } from "../../components/layout/TopBar";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { CartIcon, CreditCardIcon } from "../../components/ui/icons";
import { computeTotals } from "../../lib/cart";
import { getBusinessType } from "../../lib/businessType";

// Phone/tablet cart screen. On xl+ the same cart lives in the side panel of
// the Kasir screen, so this route just renders that panel full-width there.
export function CartPage() {
  const { state, dispatch } = useCart();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const businessType = getBusinessType(settings.businessType);
  const totals = computeTotals(state.lines, settings.taxPercent, settings.serviceChargePercent);

  if (state.lines.length === 0) {
    return (
      <div>
        <TopBar title="Keranjang" />
        <div className="px-4">
          <EmptyState
            icon={<CartIcon size={32} />}
            title="Keranjang kosong"
            description="Ketuk produk di tab Kasir untuk mulai."
            action={<Button onClick={() => navigate("/kasir")}>Pilih Produk</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="xl:hidden">
        <TopBar title="Keranjang" subtitle={`${state.lines.length} produk`} />
        <div className="flex flex-col gap-3 px-4 pb-32 pt-2">
          <div className="shape-card card-shadow border border-[var(--border)] bg-[var(--surface)] px-4">
            {state.lines.map((line) => (
              <CartLineItem
                key={line.produkId}
                roomy
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
              className="min-h-[48px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--brand-400)]"
            />
          )}
          <div className="shape-card card-shadow border border-[var(--border)] bg-[var(--surface)] p-4">
            <CartTotals totals={totals} taxPercent={settings.taxPercent} serviceChargePercent={settings.serviceChargePercent} />
          </div>
        </div>
        <div className="pb-safe fixed inset-x-0 bottom-[3.75rem] z-30 border-t border-[var(--border)] bg-[var(--surface)] px-4 pt-3 lg:bottom-0 lg:left-64">
          <Button onClick={() => navigate("/kasir/bayar")} fullWidth icon={<CreditCardIcon size={18} />} className="mb-2 text-base">
            Lanjut Bayar
          </Button>
        </div>
      </div>
      <div className="hidden h-screen xl:block">
        <CartPanel />
      </div>
    </div>
  );
}
