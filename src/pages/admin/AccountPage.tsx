import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../context/SettingsContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LogoutIcon } from "../../components/ui/icons";
import { signOutUser } from "../../lib/auth";
import { formatDate } from "../../lib/format";

export function AccountPage() {
  const { user } = useAuth();
  const { plan, planExpiresAt, planLoading } = useSettings();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-lg font-bold text-[var(--text)]">Akun</h1>
      <Card className="flex items-center gap-3">
        {user?.photoURL && <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" />}
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{user?.displayName ?? "-"}</p>
          <p className="text-xs text-[var(--text-secondary)]">{user?.email}</p>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text)]">Status Langganan</p>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              plan === "berbayar" ? "bg-[var(--success-bg)] text-[var(--success-text)]" : "bg-[var(--border-soft)] text-[var(--text-secondary)]"
            }`}
          >
            {planLoading ? "Memeriksa..." : plan === "berbayar" ? "Berbayar" : "Gratis"}
          </span>
        </div>
        {plan === "berbayar" && planExpiresAt && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Aktif sampai {formatDate(planExpiresAt)}</p>
        )}
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Versi berbayar: Rp50.000/bulan — tanpa batas produk, laporan hingga 90 hari, tanpa watermark di struk.
          Pembayaran dan perpanjangan dikelola langsung oleh penyedia aplikasi, bukan lewat halaman ini — hubungi
          kami untuk upgrade.
        </p>
      </Card>
      <Button
        onClick={async () => {
          await signOutUser();
          navigate("/login");
        }}
        variant="danger"
        fullWidth
        icon={<LogoutIcon size={18} />}
      >
        Keluar
      </Button>
    </div>
  );
}
