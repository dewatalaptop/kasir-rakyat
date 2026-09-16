import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AdminDrawer } from "./AdminDrawer";
import { MenuIcon, HomeIcon } from "../ui/icons";

export function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
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
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-500)] hover:bg-[var(--brand-50)]"
        >
          <HomeIcon size={22} />
        </button>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
