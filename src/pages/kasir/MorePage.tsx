import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../context/SettingsContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { HelpIcon, LogoutIcon, SettingsIcon } from "../../components/ui/icons";
import { signOutUser } from "../../lib/auth";

export function MorePage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4">
      <Card className="flex items-center gap-3">
        {user?.photoURL && <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" />}
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{user?.displayName ?? user?.email}</p>
          <p className="text-xs text-[var(--text-secondary)]">{settings.businessName || "Belum diatur"}</p>
        </div>
      </Card>
      <Button onClick={() => navigate("/admin")} variant="ghost" fullWidth icon={<SettingsIcon size={18} />}>
        Buka Mode Admin
      </Button>
      <Button onClick={() => navigate("/admin/bantuan")} variant="ghost" fullWidth icon={<HelpIcon size={18} />}>
        Bantuan
      </Button>
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
