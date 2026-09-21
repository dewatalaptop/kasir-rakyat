import { useState } from "react";
import { useAccess } from "../../context/AccessContext";
import { useSettings } from "../../context/SettingsContext";
import { limitsFor } from "../../lib/limits";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABEL,
  PIN_MAX,
  PIN_MIN,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  ROLE_PRESETS,
  hashPin,
  isNameTaken,
  isValidPin,
} from "../../lib/permissions";
import type { KasirProfil, KasirRole, Permission } from "../../types";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Sheet } from "../../components/ui/Sheet";
import { OwnerPasswordForm } from "../../components/auth/OwnerPasswordForm";
import { useToast } from "../../components/ui/Toast";
import { PlusIcon, EditIcon, UsersIcon } from "../../components/ui/icons";

const ROLES: KasirRole[] = ["kasir", "supervisor", "manajer"];

const sameSet = (a: Permission[], b: Permission[]) => a.length === b.length && a.every((x) => b.includes(x));

// Show "Kustom" when the ticked permissions no longer match the chosen preset.
function roleLabelFor(k: Pick<KasirProfil, "role" | "izin">): string {
  return sameSet(k.izin, ROLE_PRESETS[k.role]) ? ROLE_LABEL[k.role] : "Kustom";
}

export function KasirPage() {
  const { kasirList, kasirLoaded, saveKasirProfil, hasOwnerPassword } = useAccess();
  const { plan } = useSettings();
  const { show } = useToast();
  const [editing, setEditing] = useState<KasirProfil | "baru" | null>(null);
  const [needPassword, setNeedPassword] = useState(false);

  const max = limitsFor(plan).maxKasir;
  const activeCount = kasirList.filter((k) => k.aktif).length;
  const atLimit = activeCount >= max;

  function handleAdd() {
    if (atLimit) {
      show(`Batas ${max} kasir aktif untuk versi gratis. Nonaktifkan salah satu atau upgrade ke versi berbayar.`, "error");
      return;
    }
    // The owner password is what keeps a cashier out of Pengaturan/Kasir/Akun. Without
    // one, registering the first cashier would leave those menus open to them.
    if (!hasOwnerPassword) {
      setNeedPassword(true);
      return;
    }
    setEditing("baru");
  }

  async function toggleActive(k: KasirProfil) {
    if (!k.aktif && atLimit) {
      show(`Batas ${max} kasir aktif untuk versi gratis. Upgrade untuk menambah kasir.`, "error");
      return;
    }
    try {
      await saveKasirProfil({ ...k, aktif: !k.aktif, updatedAt: new Date().toISOString() });
      show(k.aktif ? `${k.nama} dinonaktifkan.` : `${k.nama} diaktifkan.`, "success");
    } catch (err) {
      show(err instanceof Error ? err.message : "Gagal menyimpan.", "error");
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Kasir & Izin</h1>
          <p className="text-xs text-[var(--text-secondary)]">Daftarkan orang yang bertugas di kasir dan batasi apa yang boleh mereka lakukan.</p>
        </div>
        <Button onClick={handleAdd} shape="pill" icon={<PlusIcon size={16} />} className={atLimit ? "opacity-60" : ""}>
          Tambah
        </Button>
      </div>

      {Number.isFinite(max) && (
        <p className="text-xs text-[var(--text-faint)]">
          {activeCount}/{max} kasir aktif (versi gratis){atLimit && " — batas tercapai"}
        </p>
      )}

      <Card className="text-xs leading-relaxed text-[var(--text-secondary)]">
        <p className="mb-1 font-bold text-[var(--text)]">Cara kerjanya</p>
        Setelah ada kasir terdaftar, layar Kasir meminta <b>pilih nama + PIN</b> sebelum berjualan, dan setiap transaksi tercatat atas nama kasir itu. Kasir hanya melihat menu
        yang diizinkan. Pengaturan, Kasir & Izin, dan Langganan <b>selalu khusus pemilik</b> (password pemilik). PIN adalah pembatas untuk register bersama, bukan keamanan
        tingkat bank — data tetap tersimpan di Google Sheets milikmu.
      </Card>

      {!kasirLoaded && kasirList.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Memuat...</p>
      ) : kasirList.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={32} />}
          title="Belum ada kasir terdaftar"
          description="Selama belum ada, siapa pun yang memegang perangkat ini bisa berjualan tanpa PIN. Kalau kamu berjualan sendiri, tidak perlu mendaftarkan kasir."
          action={<Button onClick={handleAdd}>Tambah Kasir Pertama</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {kasirList.map((k) => (
            <Card key={k.id} className={`flex items-center gap-3 ${k.aktif ? "" : "opacity-60"}`}>
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--brand-100)] text-base font-extrabold text-[var(--brand-700)]">
                {k.nama.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                  <span className="truncate">{k.nama}</span>
                  <span className="rounded-full bg-[var(--border-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)]">{roleLabelFor(k)}</span>
                  {!k.aktif && <span className="rounded-full bg-[var(--error-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--error-text)]">Nonaktif</span>}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                  {k.izin.length === 0 ? "Hanya berjualan" : k.izin.map((p) => PERMISSION_LABEL[p]).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={k.aktif}
                aria-label={`${k.aktif ? "Nonaktifkan" : "Aktifkan"} ${k.nama}`}
                onClick={() => toggleActive(k)}
                className={`relative h-7 w-12 flex-none rounded-full transition ${k.aktif ? "bg-[var(--brand-500)]" : "bg-[var(--border)]"}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${k.aktif ? "left-[1.375rem]" : "left-0.5"}`} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(k)}
                aria-label={`Ubah ${k.nama}`}
                className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--border-soft)]"
              >
                <EditIcon size={17} />
              </button>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={needPassword} onClose={() => setNeedPassword(false)} title="Buat password pemilik dulu">
        <p className="mb-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Sebelum mendaftarkan kasir, kunci menu pemilik dengan password — supaya kasir hanya bisa berjualan dan tidak ikut membuka Pengaturan, Kasir & Izin, atau Langganan.
          Password ini hanya kamu yang tahu; kasir memakai PIN mereka sendiri.
        </p>
        <OwnerPasswordForm
          submitLabel="Simpan & Lanjut Tambah Kasir"
          onDone={() => {
            setNeedPassword(false);
            setEditing("baru");
          }}
        />
      </Sheet>

      <KasirFormSheet
        editing={editing}
        list={kasirList}
        onClose={() => setEditing(null)}
        onSave={async (k) => {
          await saveKasirProfil(k);
          setEditing(null);
          show(`${k.nama} disimpan.`, "success");
        }}
      />
    </div>
  );
}

function KasirFormSheet({
  editing,
  list,
  onClose,
  onSave,
}: {
  editing: KasirProfil | "baru" | null;
  list: KasirProfil[];
  onClose: () => void;
  onSave: (k: KasirProfil) => Promise<void>;
}) {
  // Re-mount the form per target so its state always starts from that profile.
  const key = editing === null ? "closed" : editing === "baru" ? "baru" : editing.id;
  return (
    <Sheet open={editing !== null} onClose={onClose} title={editing === "baru" ? "Tambah Kasir" : "Ubah Kasir"}>
      {editing !== null && <KasirForm key={key} editing={editing} list={list} onSave={onSave} />}
    </Sheet>
  );
}

function KasirForm({ editing, list, onSave }: { editing: KasirProfil | "baru"; list: KasirProfil[]; onSave: (k: KasirProfil) => Promise<void> }) {
  const existing = editing === "baru" ? null : editing;
  const [nama, setNama] = useState(existing?.nama ?? "");
  const [role, setRole] = useState<KasirRole>(existing?.role ?? "kasir");
  const [izin, setIzin] = useState<Permission[]>(existing?.izin ?? []);
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function pickRole(r: KasirRole) {
    setRole(r);
    setIzin([...ROLE_PRESETS[r]]);
  }

  function toggle(p: Permission) {
    setIzin((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = nama.trim();
    if (!name) return setError("Nama wajib diisi.");
    if (isNameTaken(name, list, existing?.id)) return setError("Nama ini sudah dipakai kasir lain — pakai nama yang berbeda.");
    if (!existing && !pin) return setError("PIN wajib diisi untuk kasir baru.");
    if (pin && !isValidPin(pin)) return setError(`PIN harus ${PIN_MIN}-${PIN_MAX} angka.`);
    setBusy(true);
    try {
      const id = existing?.id ?? crypto.randomUUID();
      const now = new Date().toISOString();
      await onSave({
        id,
        nama: name,
        pinHash: pin ? await hashPin(pin, id) : (existing?.pinHash ?? ""),
        role,
        izin: ALL_PERMISSIONS.filter((p) => izin.includes(p)),
        aktif: existing?.aktif ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan kasir.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "min-h-[48px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--brand-400)]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-[var(--text-secondary)]">Nama</span>
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Dewi" className={inputClass} autoFocus />
      </label>

      <div>
        <span className="text-xs font-bold text-[var(--text-secondary)]">Peran</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => pickRole(r)}
              className={`min-h-[44px] rounded-xl border text-sm font-bold ${
                role === r ? "border-[var(--brand-400)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[var(--border)] text-[var(--text-secondary)]"
              }`}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">{ROLE_DESCRIPTION[role]}</p>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-xs font-bold text-[var(--text-secondary)]">Izin (bisa disesuaikan)</legend>
        {ALL_PERMISSIONS.map((p) => (
          <label key={p} className="flex min-h-[44px] items-center gap-3 rounded-xl border border-[var(--border)] px-3 text-sm text-[var(--text)]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--brand-500)]" checked={izin.includes(p)} onChange={() => toggle(p)} />
            {PERMISSION_LABEL[p]}
          </label>
        ))}
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold text-[var(--text-secondary)]">{existing ? "PIN baru (kosongkan bila tidak diganti)" : `PIN (${PIN_MIN}-${PIN_MAX} angka)`}</span>
        <div className="relative">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX))}
            type={showPin ? "text" : "password"}
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
            className={`${inputClass} font-tabular pr-16 tracking-widest`}
          />
          <button type="button" onClick={() => setShowPin((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--brand-600)]">
            {showPin ? "Sembunyi" : "Lihat"}
          </button>
        </div>
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-[var(--error-bg)] px-3 py-2 text-xs text-[var(--error-text)]">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} fullWidth>
        {busy ? "Menyimpan..." : "Simpan"}
      </Button>
    </form>
  );
}
