import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { BrandMark, GoogleIcon } from "../components/ui/icons";
import { signIn } from "../lib/auth";
import { DEFAULT_PROMO_BACKGROUNDS } from "../assets/promoBackgrounds";

export function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn();
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk dengan Google.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--sidebar-bg)] px-5">
      <img src={DEFAULT_PROMO_BACKGROUNDS[0].url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--sidebar-bg) 85%, transparent), color-mix(in srgb, var(--sidebar-bg) 70%, transparent), var(--sidebar-bg))" }} />
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[var(--surface)] p-7 text-center shadow-2xl">
        <BrandMark size={56} className="mx-auto" />
        <h1 className="mt-4 font-display text-2xl font-extrabold text-[var(--text)]">Kasir Rakyat</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Aplikasi kasir untuk resto, warung, dan toko — ringan, fleksibel, data tetap di akun Google-mu sendiri.</p>
        <Button onClick={handleSignIn} disabled={busy} fullWidth variant="ghost" className="mt-6" icon={<GoogleIcon size={18} />}>
          {busy ? "Menghubungkan..." : "Masuk dengan Google"}
        </Button>
        {error && <p className="mt-3 text-xs text-[var(--error-text)]">{error}</p>}
        <p className="mt-4 text-[11px] text-[var(--text-faint)]">
          Keamanan tinggi: aplikasi ini hanya mengakses file yang dibuatnya sendiri di Google Drive-mu, bukan seluruh Drive-mu.
        </p>
      </div>
    </div>
  );
}
