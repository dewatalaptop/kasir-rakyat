import { useNavigate } from "react-router-dom";
import { formatRupiah } from "../../lib/format";
import { cartItemCount, cartSubtotal } from "../../lib/cart";
import { useCart } from "../../context/CartContext";

export function CartSummaryBar() {
  const { state } = useCart();
  const navigate = useNavigate();
  const count = cartItemCount(state.lines);
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={() => navigate("/kasir/keranjang")}
      className="shape-notch fixed inset-x-4 bottom-20 z-30 flex items-center justify-between bg-[var(--brand-500)] px-5 py-3.5 text-white shadow-lg"
    >
      <span className="text-sm font-semibold">{count} item di keranjang</span>
      <span className="font-tabular text-sm font-bold">{formatRupiah(cartSubtotal(state.lines))}</span>
    </button>
  );
}
