import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAccess } from "../../context/AccessContext";
import type { Requirement } from "../../lib/permissions";
import { Button } from "../ui/Button";
import { LockIcon } from "../ui/icons";
import { OwnerUnlockForm } from "./OwnerUnlockForm";

// Wraps an admin page: renders it when the current person (owner, or the
// signed-in kasir) may open it, otherwise an explanatory dead end that offers
// the owner password instead of a blank screen.
export function RequirePermission({ need, children }: { need: Requirement; children: ReactNode }) {
  const { can } = useAccess();
  if (can(need)) return <>{children}</>;
  return <AccessDenied ownerOnly={need === "owner"} />;
}

function AccessDenied({ ownerOnly }: { ownerOnly: boolean }) {
  const { activeKasir } = useAccess();
  const navigate = useNavigate();
  const [showOwner, setShowOwner] = useState(false);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--warning-bg)] text-[var(--warning-text)]">
        <LockIcon size={26} />
      </span>
      <h1 className="font-display text-lg font-extrabold text-[var(--text)]">Akses dibatasi</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        {ownerOnly ? "Halaman ini khusus pemilik usaha." : `Akun ${activeKasir?.nama ?? "ini"} tidak punya izin untuk membuka halaman ini.`} Minta pemilik untuk
        mengubah izin, atau masuk sebagai pemilik.
      </p>
      {showOwner ? (
        <div className="w-full">
          <OwnerUnlockForm />
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          <Button onClick={() => setShowOwner(true)} variant="soft" fullWidth>
            Masuk sebagai pemilik
          </Button>
          <Button onClick={() => navigate("/kasir")} variant="ghost" fullWidth>
            Kembali ke Kasir
          </Button>
        </div>
      )}
    </div>
  );
}
