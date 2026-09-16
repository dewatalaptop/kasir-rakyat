import { Outlet } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";

export function CashierLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20">
      <Outlet />
      <BottomTabBar />
    </div>
  );
}
