import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { BUSINESS_TYPES } from "../../lib/businessType";
import { useAccess } from "../../context/AccessContext";
import { clearAdminUnlocked, hashPassword } from "../../lib/adminAuth";
import { OwnerPasswordForm, OWNER_PASSWORD_MIN } from "../../components/auth/OwnerPasswordForm";
import { PhotoStorageCard } from "../../components/admin/PhotoStorageCard";

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { show } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    businessType: settings.businessType,
    taxPercent: settings.taxPercent,
    serviceChargePercent: settings.serviceChargePercent,
    receiptFooterText: settings.receiptFooterText,
  });
  const [busy, setBusy] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const bt = BUSINESS_TYPES.find((b) => b.key === form.businessType);
      await updateSettings({
        business_name: form.businessName,
        address: form.address,
        phone: form.phone,
        business_type: form.businessType,
        meja_enabled: String(bt?.mejaLabel !== null),
        tax_percent: String(form.taxPercent),
        service_charge_percent: String(form.serviceChargePercent),
        receipt_footer_text: form.receiptFooterText,
      });
      show("Pengaturan disimpan.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menyimpan pengaturan.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Pengaturan</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <label className="text-xs font-medium text-[var(--text-secondary)]">Nama Usaha</label>
        <input
          value={form.businessName}
          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
          className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <label className="text-xs font-medium text-[var(--text-secondary)]">Jenis Usaha</label>
        <select
          value={form.businessType}
          onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value as typeof f.businessType }))}
          className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        >
          {BUSINESS_TYPES.map((bt) => (
            <option key={bt.key} value={bt.key}>
              {bt.label}
            </option>
          ))}
        </select>
        <label className="text-xs font-medium text-[var(--text-secondary)]">Alamat</label>
        <input
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <label className="text-xs font-medium text-[var(--text-secondary)]">Telepon</label>
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Pajak (%)</label>
            <input
              type="number"
              min={0}
              value={form.taxPercent}
              onChange={(e) => setForm((f) => ({ ...f, taxPercent: Number(e.target.value) || 0 }))}
              className="font-tabular shape-card mt-1 w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Service Charge (%)</label>
            <input
              type="number"
              min={0}
              value={form.serviceChargePercent}
              onChange={(e) => setForm((f) => ({ ...f, serviceChargePercent: Number(e.target.value) || 0 }))}
              className="font-tabular shape-card mt-1 w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
            />
          </div>
        </div>
        <label className="text-xs font-medium text-[var(--text-secondary)]">Teks Footer Struk</label>
        <textarea
          value={form.receiptFooterText}
          onChange={(e) => setForm((f) => ({ ...f, receiptFooterText: e.target.value }))}
          rows={2}
          className="shape-card resize-none border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm"
        />
        <Button type="submit" disabled={busy} fullWidth>
          {busy ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </form>
      <PhotoStorageCard />
      <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3">
        <Button onClick={() => navigate("/admin/pengaturan/sheets")} variant="ghost" fullWidth>
          Koneksi Google Sheets
        </Button>
        <Button onClick={() => navigate("/admin/pengaturan/printer")} variant="ghost" fullWidth>
          Pengaturan Printer
        </Button>
      </div>
      <SecurityCard />
    </div>
  );
}

function SecurityCard() {
  const { settings, updateSettings } = useSettings();
  const { hasOwnerPassword, kasirList } = useAccess();
  const { show } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const hasActiveKasir = kasirList.some((k) => k.aktif);

  async function checkCurrent(): Promise<boolean> {
    if ((await hashPassword(current)) === settings.adminPasswordHash) return true;
    show("Password saat ini salah.", "error");
    return false;
  }

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < OWNER_PASSWORD_MIN) {
      show(`Password baru minimal ${OWNER_PASSWORD_MIN} karakter.`, "error");
      return;
    }
    if (next !== confirm) {
      show("Konfirmasi password baru tidak cocok.", "error");
      return;
    }
    setBusy(true);
    try {
      if (!(await checkCurrent())) return;
      await updateSettings({ admin_password_hash: await hashPassword(next) });
      setCurrent("");
      setNext("");
      setConfirm("");
      show("Password pemilik diperbarui.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal mengubah password.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      if (!(await checkCurrent())) return;
      await updateSettings({ admin_password_hash: "" });
      setCurrent("");
      show("Password pemilik dihapus. Menu pemilik terbuka tanpa password.", "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menghapus password.", "error");
    } finally {
      setBusy(false);
    }
  }

  const input = "shape-card border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm";

  if (!hasOwnerPassword) {
    return (
      <section className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3" aria-label="Keamanan">
        <h2 className="font-display text-sm font-bold text-[var(--text)]">Keamanan</h2>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          Saat ini <b>belum ada password</b>: siapa pun yang memegang perangkat ini otomatis menjadi pemilik dan bisa membuka semua menu. Itu aman kalau kamu berjualan sendiri.
          Kalau ada karyawan yang memakai kasir, buat password pemilik supaya mereka hanya bisa berjualan.
        </p>
        <OwnerPasswordForm />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-3" aria-label="Keamanan">
      <h2 className="font-display text-sm font-bold text-[var(--text)]">Keamanan</h2>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        Password pemilik memisahkan mode Kasir dari menu Admin. Tidak ada username — cukup password ini.
      </p>
      <Button variant="ghost" fullWidth onClick={() => { clearAdminUnlocked(); }}>
        Kunci sekarang
      </Button>
      <form onSubmit={handleChange} className="flex flex-col gap-2">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Password saat ini" autoComplete="current-password" aria-label="Password saat ini" className={input} />
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Password baru" autoComplete="new-password" aria-label="Password baru" className={input} />
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ulangi password baru" autoComplete="new-password" aria-label="Ulangi password baru" className={input} />
        <Button type="submit" disabled={busy || !current || !next || !confirm} variant="secondary" fullWidth>
          {busy ? "Menyimpan..." : "Ubah Password Pemilik"}
        </Button>
      </form>
      {hasActiveKasir ? (
        <p className="text-[11px] text-[var(--text-faint)]">Password tidak bisa dihapus selama masih ada kasir aktif — nonaktifkan semua kasir dulu.</p>
      ) : (
        <button
          type="button"
          onClick={handleRemove}
          disabled={busy || !current}
          className="self-start text-xs font-bold text-[var(--error-text)] disabled:opacity-40"
        >
          Hapus password (isi password saat ini di atas)
        </button>
      )}
    </section>
  );
}
