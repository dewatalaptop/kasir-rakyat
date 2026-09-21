import { NavLink } from "react-router-dom";
import { CartIcon, GridIcon, ReceiptIcon, StoreIcon } from "../ui/icons";
import { useCart } from "../../context/CartContext";
import { cartItemCount } from "../../lib/cart";

const TABS = [
  { to: "/kasir", label: "Kasir", icon: StoreIcon, end: true },
  { to: "/kasir/keranjang", label: "Keranjang", icon: CartIcon },
  { to: "/kasir/riwayat", label: "Riwayat", icon: ReceiptIcon },
  { to: "/kasir/lainnya", label: "Menu", icon: GridIcon },
];

// Bottom-tab nav for phones/tablets (hidden at lg+, where the sidebar takes
// over): the cashier flow has few, frequent destinations, so a bottom bar
// keeps them one thumb-tap away. Admin's many destinations live in the
// "Menu" tab and the admin drawer instead.
export function BottomTabBar() {
  const { state } = useCart();
  const count = cartItemCount(state.lines);

  return (
    <nav data-tour="nav" className="pb-safe fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--surface)] shadow-[0_-4px_16px_rgba(16,40,28,0.06)] lg:hidden">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          data-tour={tab.to === "/kasir/keranjang" ? "cart" : undefined}
          className={({ isActive }) =>
            `relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition ${
              isActive ? "text-[var(--brand-600)]" : "text-[var(--text-faint)]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-[var(--brand-500)]" />}
              <tab.icon size={22} />
              {tab.label}
              {tab.to === "/kasir/keranjang" && count > 0 && (
                <span className="absolute right-1/2 top-1 flex h-4 min-w-[16px] translate-x-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
