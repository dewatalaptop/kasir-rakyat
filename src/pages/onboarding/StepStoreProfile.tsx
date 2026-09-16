import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { useSettings } from "../../context/SettingsContext";
import type { BusinessTypeKey } from "../../types";
import { getBusinessType } from "../../lib/businessType";

export function StepStoreProfile({ businessType, onNext }: { businessType: BusinessTypeKey; onNext: () => void }) {
  const { updateSettings } = useSettings();
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const bt = getBusinessType(businessType);
      await updateSettings({
        business_name: businessName.trim(),
        business_type: businessType,
        address: address.trim(),
        phone: phone.trim(),
        accent_hue: String(bt.defaultAccentHue),
        meja_enabled: String(bt.mejaLabel !== null),
      });
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil toko.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-center font-display text-xl font-bold text-[var(--text)]">Profil toko</h2>
      <input
        autoFocus
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
        placeholder="Nama usaha (mis. Warung Bu Sri)"
        className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Alamat (opsional)"
        className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Nomor telepon (opsional)"
        className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
      />
      {error && <p className="text-xs text-[var(--error-text)]">{error}</p>}
      <Button type="submit" disabled={busy || !businessName.trim()} fullWidth>
        {busy ? "Menyimpan..." : "Lanjut"}
      </Button>
    </form>
  );
}
