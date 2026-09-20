import { useNavigate } from "react-router-dom";
import { formatRupiah } from "../../lib/format";
import { cartItemCount, cartSubtotal } from "../../lib/cart";
import { useCart } from "../../context/CartContext";
import { CartIcon } from "../ui/icons";

// Floating "open cart" bar for screens without the side panel (< xl).
export function CartSummaryBar() {
  const { state } = useCart();
  const navigate = useNavigate();
  const count = cartItemCount(state.lines);
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/kasir/keranjang")}
      className="fixed inset-x-4 bottom-[4.75rem] z-30 flex min-h-[52px] items-center justify-between rounded-2xl bg-[var(--brand-500)] px-4 py-3 text-white shadow-lg active:bg-[var(--brand-600)] lg:bottom-6 lg:left-auto lg:right-6 lg:w-96 xl:hidden"
    >
      <span className="flex items-center gap-2.5 text-sm font-bold">
        <span className="relative">
          <CartIcon size={22} />
          <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-[var(--brand-700)]">
            {count}
          </span>
        </span>
        Lihat keranjang
      </span>
      <span className="font-tabular text-sm font-extrabold">{formatRupiah(cartSubtotal(state.lines))}</span>
    </button>
  );
}
