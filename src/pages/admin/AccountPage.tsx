import { useCallback, useEffect, useRef, useState } from "react";
import { PageTip } from "../../components/help/PageTip";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSettings } from "../../context/SettingsContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";
import { CheckIcon, LogoutIcon } from "../../components/ui/icons";
import { signOutUser } from "../../lib/auth";
import { formatDate, formatRupiah } from "../../lib/format";
import { bankAccounts, billingLabel, cancelUpgrade, canRenew, daysLeft, fetchOffer, requestUpgrade, upgradeErrorMessage, type UpgradeOffer } from "../../lib/upgrade";

const BENEFITS = [
  "Produk tanpa batas (gratis: 20 produk aktif)",
  "Laporan 30 dan 90 hari (gratis: 7 hari)",
  "Kasir tanpa batas (gratis: 2 kasir)",
  "Struk tanpa tulisan “Dibuat dengan Kasir Rakyat”",
  "Foto produk di aplikasi Android",
];

// Polling interval while a transfer is pending (faster under test so the "approved" path is exercised quickly).
const POLL_MS = import.meta.env.MODE === "test" ? 250 : 8000;

export function AccountPage() {
  const { user } = useAuth();
  const { plan, planExpiresAt, planLoading } = useSettings();
  const navigate = useNavigate();

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Akun & Langganan</h1>
      <PageTip id="akun-kode-unik" title="Cara upgrade">
        Pilih paket, lalu transfer sesuai nominal yang tampil — angka terakhirnya adalah kode unik yang membuat pembayaranmu dikenali. Aplikasi berganti ke versi berbayar sendiri setelah dikonfirmasi.
      </PageTip>
      <Card className="flex items-center gap-3">
        {user?.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-full" />}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text)]">{user?.displayName ?? "-"}</p>
          <p className="truncate text-xs text-[var(--text-secondary)]">{user?.email}</p>
        </div>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${
            plan === "berbayar" ? "bg-[var(--success-bg)] text-[var(--success-text)]" : "bg-[var(--border-soft)] text-[var(--text-secondary)]"
          }`}
        >
          {planLoading ? "Memeriksa..." : plan === "berbayar" ? "Berbayar" : "Gratis"}
        </span>
      </Card>

      <SubscriptionCard planExpiresAt={planExpiresAt} />

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

// Tail three digits of the amount are the unique code the provider matches
// against the bank statement — make them impossible to miss.
function TransferAmount({ total }: { total: number }) {
  const s = total.toLocaleString("id-ID");
  return (
    <span className="font-tabular text-3xl font-extrabold text-[var(--text)]">
      Rp{s.slice(0, -3)}
      <span className="rounded-md bg-[var(--warning-bg)] px-1 text-[var(--warning-text)]">{s.slice(-3)}</span>
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — the number is on screen */
        }
      }}
      className="min-h-[36px] rounded-lg border border-[var(--border)] px-3 text-xs font-bold text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
    >
      {copied ? "Tersalin ✓" : label}
    </button>
  );
}

function SubscriptionCard({ planExpiresAt }: { planExpiresAt: string | null }) {
  const { refreshPlan } = useSettings();
  const { user } = useAuth();
  const { show } = useToast();
  const [offer, setOffer] = useState<UpgradeOffer | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const wasPending = useRef(false);

  const load = useCallback(async () => {
    try {
      const o = await fetchOffer();
      setOffer(o);
      setLoadError("");
      return o;
    } catch (err) {
      setLoadError(upgradeErrorMessage(err));
      return null;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // While a transfer is pending, ask the server every few seconds (only while
  // this tab is visible) so the moment the provider approves it the app flips
  // to paid — no manual refresh, no re-login.
  const hasPending = !!offer?.pending;
  useEffect(() => {
    if (!hasPending) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      await load();
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [hasPending, load]);

  // pending -> gone + license active  ==  payment approved
  useEffect(() => {
    if (!offer) return;
    if (wasPending.current && !offer.pending && offer.license.active) {
      void refreshPlan();
      show("Pembayaran diterima — versi berbayar aktif. Terima kasih! 🎉", "success");
    }
    wasPending.current = !!offer.pending;
  }, [offer, refreshPlan, show]);

  async function handleRequest() {
    setBusy(true);
    try {
      await requestUpgrade();
      await load();
    } catch (err) {
      show(upgradeErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!offer?.pending) return;
    setBusy(true);
    try {
      // a withdrawn request is NOT a payment: don't let the "pending -> gone while
      // active" detector below announce one (matters for renewals)
      wasPending.current = false;
      await cancelUpgrade(offer.pending.id);
      await load();
    } catch (err) {
      show(upgradeErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  if (!offer) {
    return (
      <Card>
        <p className="mb-2 text-sm font-bold text-[var(--text)]">Langganan</p>
        {loadError ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-xs text-[var(--error-text)]">
              {loadError}
            </p>
            <Button onClick={() => void load()} variant="ghost" shape="pill">
              Coba lagi
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Spinner size={16} /> Memuat info langganan...
          </div>
        )}
      </Card>
    );
  }

  const { product, bank, license, pending } = offer;
  const left = daysLeft(license.expiresAt);
  const price = `${formatRupiah(product.priceIdr)}${billingLabel(product.billingCycle)}`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[var(--text)]">Langganan {product.brandName}</p>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{price}</span>
      </div>

      {license.active && (
        <p className="rounded-xl bg-[var(--success-bg)] px-3 py-2 text-xs font-semibold text-[var(--success-text)]">
          Versi berbayar aktif
          {(license.expiresAt ?? planExpiresAt) && ` sampai ${formatDate((license.expiresAt ?? planExpiresAt)!)}`}
          {left !== null && left <= 7 && ` (${left} hari lagi)`}
        </p>
      )}

      {pending ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--brand-200)] bg-[var(--brand-50)] p-4">
          <div>
            <p className="text-xs font-bold text-[var(--brand-700)]">Transfer TEPAT sejumlah</p>
            <TransferAmount total={pending.totalAmount} />
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              = harga {formatRupiah(pending.baseAmount)} + kode unik <b>{String(pending.uniqueCode).padStart(3, "0")}</b>. Kode itu yang membuat kami tahu transfer ini darimu — jangan dibulatkan.
            </p>
            <div className="mt-2">
              <CopyButton value={String(pending.totalAmount)} label="Salin nominal" />
            </div>
          </div>

          {bank ? (
            <div className="rounded-xl bg-[var(--surface)] p-3 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-faint)]">
                {bankAccounts(bank).length > 1 ? "Ke salah satu rekening ini" : "Ke rekening"}
              </p>
              {bankAccounts(bank).map((acc, i) => (
                <div key={acc.accountNumber} className={i > 0 ? "mt-3 border-t border-[var(--border-soft)] pt-3" : "mt-1"}>
                  <p className="font-bold text-[var(--text)]">{acc.bankName}</p>
                  <p className="font-tabular text-lg font-extrabold tracking-wide text-[var(--text)]">{acc.accountNumber}</p>
                  <p className="text-xs text-[var(--text-secondary)]">a.n. {acc.accountName}</p>
                  <div className="mt-1.5">
                    <CopyButton value={acc.accountNumber.replace(/\D/g, "")} label={bankAccounts(bank).length > 1 ? `Salin no. ${acc.bankName}` : "Salin no. rekening"} />
                  </div>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-2">
                {bank.whatsapp && (
                  <a
                    href={`https://wa.me/${bank.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo, saya sudah transfer ${formatRupiah(pending.totalAmount)} untuk ${product.brandName} (${user?.email ?? ""}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[36px] items-center rounded-lg bg-[#25D366] px-3 text-xs font-bold text-white"
                  >
                    Kirim bukti via WhatsApp
                  </a>
                )}
              </div>
              {bank.note && <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{bank.note}</p>}
            </div>
          ) : (
            <p className="text-xs text-[var(--warning-text)]">Rekening tujuan belum diatur — hubungi penyedia aplikasi.</p>
          )}

          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Spinner size={14} /> Menunggu pembayaran — halaman ini otomatis berubah begitu transfermu dikonfirmasi.
          </div>
          <Button onClick={handleCancel} disabled={busy} variant="ghost" shape="pill" className="self-start text-xs">
            Batalkan permintaan ini
          </Button>
        </div>
      ) : (
        <>
          {!license.active && (
            <ul className="flex flex-col gap-1.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <CheckIcon size={14} className="mt-0.5 flex-none text-[var(--brand-500)]" />
                  {b}
                </li>
              ))}
            </ul>
          )}
          {!product.purchasable ? (
            <p className="text-xs text-[var(--text-secondary)]">Pembelian belum dibuka. Hubungi penyedia aplikasi.</p>
          ) : !bank ? (
            <p className="text-xs text-[var(--warning-text)]">Pembayaran dari dalam aplikasi belum aktif (rekening belum diatur). Hubungi penyedia aplikasi.</p>
          ) : license.active && !canRenew(license) ? (
            <p className="text-xs text-[var(--text-secondary)]">Perpanjangan bisa dilakukan mulai 7 hari sebelum masa aktif habis.</p>
          ) : (
            <Button onClick={handleRequest} disabled={busy} fullWidth>
              {busy ? "Membuat tagihan..." : license.active ? `Perpanjang — ${price}` : `Upgrade — ${price}`}
            </Button>
          )}
          <p className="text-[11px] text-[var(--text-faint)]">
            Pembayaran lewat transfer bank manual: kamu mendapat nominal dengan kode unik, transfer, lalu akses aktif setelah kami mengonfirmasi (biasanya beberapa menit di jam kerja).
          </p>
        </>
      )}
    </Card>
  );
}
