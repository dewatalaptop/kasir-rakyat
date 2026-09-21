import { Outlet } from "react-router-dom";
import { BottomTabBar } from "./BottomTabBar";
import { SideNav } from "./SideNav";
import { PinGate } from "../auth/PinGate";
import { useAccess } from "../../context/AccessContext";
import { TourHost } from "../help/Tour";

// lg+: dark-green sidebar on the left, page content on the right.
// below lg: full-width content + bottom tab bar.
export function CashierLayout() {
  const { needsPin } = useAccess();
  if (needsPin) return <PinGate />;
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SideNav />
      <div className="pb-20 lg:pb-0 lg:pl-64">
        <Outlet />
      </div>
      <BottomTabBar />
      <TourHost />
    </div>
  );
}
