import { NavLink } from "react-router-dom";
import { CartIcon, HomeIcon, ListIcon, ReceiptIcon } from "../ui/icons";
import { useCart } from "../../context/CartContext";
import { cartItemCount } from "../../lib/cart";

const TABS = [
  { to: "/kasir", label: "Kasir", icon: HomeIcon, end: true },
  { to: "/kasir/keranjang", label: "Keranjang", icon: CartIcon },
  { to: "/kasir/riwayat", label: "Riwayat", icon: ReceiptIcon },
  { to: "/kasir/lainnya", label: "Lainnya", icon: ListIcon },
];

// Bottom-tab nav: the cashier flow has few, frequent destinations — the
// "native app" pattern this ecosystem's own prior POS build confirmed
// works well for that shape (vs. the admin side's hamburger drawer, which
// has too many destinations for a bottom bar).
export function BottomTabBar() {
  const { state } = useCart();
  const count = cartItemCount(state.lines);

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--surface)]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `relative flex h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive ? "text-[var(--brand-500)]" : "text-[var(--text-faint)]"
            }`
          }
        >
          <tab.icon size={22} />
          {tab.label}
          {tab.to === "/kasir/keranjang" && count > 0 && (
            <span className="absolute right-4 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
