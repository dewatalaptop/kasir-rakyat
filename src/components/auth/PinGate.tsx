import { useEffect, useState } from "react";
import { useAccess } from "../../context/AccessContext";
import { useSettings } from "../../context/SettingsContext";
import { ROLE_LABEL, PIN_MAX, PIN_MIN } from "../../lib/permissions";
import type { KasirProfil } from "../../types";
import { BrandMark, CloseIcon } from "../ui/icons";
import { OwnerUnlockForm } from "./OwnerUnlockForm";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// Shown over the cashier screens whenever kasir are registered and nobody has
// identified yet. Pick your name, enter your PIN. The owner can bypass with the
// admin password.
export function PinGate() {
  const { kasirList } = useAccess();
  const { settings } = useSettings();
  const [picked, setPicked] = useState<KasirProfil | null>(null);
  const [ownerMode, setOwnerMode] = useState(false);
  const active = kasirList.filter((k) => k.aktif);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[var(--sidebar-bg)] px-4 py-8">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-6 shadow-2xl">
        <div className="mb-5 flex flex-col items-center text-center">
          <BrandMark size={48} />
          <h1 className="mt-3 font-display text-lg font-extrabold text-[var(--text)]">{settings.businessName || "Kasir Rakyat"}</h1>
          <p className="text-xs text-[var(--text-secondary)]">
            {ownerMode ? "Masukkan password admin" : picked ? `Halo, ${picked.nama} — masukkan PIN` : "Siapa yang bertugas?"}
          </p>
        </div>

        {ownerMode ? (
          <div className="flex flex-col gap-3">
            <OwnerUnlockForm />
            <button type="button" onClick={() => setOwnerMode(false)} className="min-h-[44px] text-sm font-semibold text-[var(--text-secondary)]">
              Kembali
            </button>
          </div>
        ) : picked ? (
          <PinPad profile={picked} onBack={() => setPicked(null)} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {active.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setPicked(k)}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 transition active:scale-[0.97]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-100)] text-base font-extrabold text-[var(--brand-700)]">
                    {k.nama.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="max-w-full truncate text-sm font-bold text-[var(--text)]">{k.nama}</span>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{ROLE_LABEL[k.role]}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setOwnerMode(true)} className="mt-4 min-h-[44px] w-full text-sm font-semibold text-[var(--brand-600)]">
              Masuk sebagai pemilik
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PinPad({ profile, onBack }: { profile: KasirProfil; onBack: () => void }) {
  const { loginKasir } = useAccess();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockedFor, setLockedFor] = useState(0);

  // Count the lock-out down so the message doesn't go stale.
  useEffect(() => {
    if (lockedFor <= 0) return;
    const id = setInterval(() => setLockedFor((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockedFor]);

  async function submit(value: string) {
    if (busy || value.length < PIN_MIN || lockedFor > 0) return;
    setBusy(true);
    setError("");
    const res = await loginKasir(profile.id, value);
    setBusy(false);
    if (res.ok) return; // gate unmounts itself
    setPin("");
    if (res.reason === "terkunci") {
      setLockedFor(res.retryInSec);
      setError("Terlalu banyak percobaan salah.");
    } else if (res.reason === "salah") {
      setError(`PIN salah. Sisa percobaan: ${res.attemptsLeft}`);
    } else {
      setError("Profil tidak ditemukan.");
    }
  }

  const press = (d: string) => {
    if (lockedFor > 0) return;
    setError("");
    setPin((p) => (p.length < PIN_MAX ? p + d : p));
  };

  return (
    <div
      className="flex flex-col items-center gap-4"
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
        else if (e.key === "Enter") void submit(pin);
      }}
      tabIndex={0}
    >
      <div className="flex h-6 items-center gap-2.5" aria-label={`${pin.length} digit dimasukkan`}>
        {Array.from({ length: PIN_MAX }).map((_, i) => (
          <span key={i} className={`h-3 w-3 rounded-full ${i < pin.length ? "bg-[var(--brand-500)]" : "bg-[var(--border)]"}`} />
        ))}
      </div>
      <p role="alert" className="min-h-[1.25rem] text-center text-xs font-semibold text-[var(--error-text)]">
        {lockedFor > 0 ? `${error} Coba lagi dalam ${lockedFor} dtk.` : error}
      </p>
      <div className="grid w-full max-w-[16rem] grid-cols-3 gap-2.5">
        {KEYS.map((k) => (
          <PadKey key={k} onClick={() => press(k)}>
            {k}
          </PadKey>
        ))}
        <PadKey onClick={onBack} muted aria-label="Ganti kasir">
          <CloseIcon size={18} />
        </PadKey>
        <PadKey onClick={() => press("0")}>0</PadKey>
        <PadKey onClick={() => setPin((p) => p.slice(0, -1))} muted aria-label="Hapus">
          ⌫
        </PadKey>
      </div>
      <button
        type="button"
        disabled={busy || pin.length < PIN_MIN || lockedFor > 0}
        onClick={() => submit(pin)}
        className="min-h-[48px] w-full rounded-xl bg-[var(--brand-500)] text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Memeriksa..." : "Masuk"}
      </button>
    </div>
  );
}

function PadKey({ children, onClick, muted = false, ...rest }: { children: React.ReactNode; onClick: () => void; muted?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className={`flex h-14 items-center justify-center rounded-2xl text-xl font-bold transition active:scale-95 ${
        muted ? "bg-transparent text-[var(--text-secondary)]" : "border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
