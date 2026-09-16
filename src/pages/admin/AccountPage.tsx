import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LogoutIcon } from "../../components/ui/icons";
import { signOutUser } from "../../lib/auth";

export function AccountPage() {
  const { user } = useAuth();
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
        <p className="text-sm font-semibold text-[var(--text)]">Langganan Kasir Rakyat</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Rp50.000/bulan. Pembayaran dan perpanjangan dikelola langsung oleh penyedia aplikasi, bukan lewat halaman ini.
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
