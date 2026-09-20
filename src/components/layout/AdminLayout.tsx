import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AdminDrawer } from "./AdminDrawer";
import { SideNav } from "./SideNav";
import { MenuIcon, StoreIcon } from "../ui/icons";

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SideNav />
      <div className="lg:pl-64">
        {/* Phone/tablet header + drawer; on lg+ the sidebar replaces both. */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text)] hover:bg-[var(--border-soft)]"
          >
            <MenuIcon size={22} />
          </button>
          <span className="font-display text-base font-bold text-[var(--text)]">Kasir Rakyat — Admin</span>
          <button
            type="button"
            onClick={() => navigate("/kasir")}
            aria-label="Ke mode kasir"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-600)] hover:bg-[var(--brand-50)]"
          >
            <StoreIcon size={22} />
          </button>
        </header>
        <main className="mx-auto max-w-5xl p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
