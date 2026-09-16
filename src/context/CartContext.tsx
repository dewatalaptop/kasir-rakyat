import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { cartReducer, emptyCart, type CartAction, type CartState } from "../lib/cart";

interface CartContextValue {
  state: CartState;
  dispatch: Dispatch<CartAction>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>;
}
