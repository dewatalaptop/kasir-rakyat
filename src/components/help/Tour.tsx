import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccess } from "../../context/AccessContext";
import { useSettings } from "../../context/SettingsContext";
import { useGuide, useTourRunning } from "../../hooks/useGuide";
import { setTourSeen, tourStore } from "../../lib/guide";
import { Button } from "../ui/Button";
import { BrandMark } from "../ui/icons";

export interface TourStep {
  id: string;
  // CSS selector of the thing to point at. If nothing visible matches (e.g. the
  // cart bar on a phone with an empty cart) the step is shown centered instead.
  target?: string;
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  { id: "cari", target: '[data-tour="search"]', title: "Cari produk", body: "Ketik sebagian nama untuk menemukan produk dalam sekejap — berguna saat daftar produkmu sudah panjang." },
  { id: "kategori", target: '[data-tour="chips"]', title: "Saring per kategori", body: "Ketuk kategori untuk menampilkan hanya kelompok itu. “Semua” menampilkan semuanya." },
  { id: "produk", target: '[data-tour="product"]', title: "Ketuk produk untuk menjual", body: "Satu ketukan memasukkan produk ke transaksi; ketuk lagi untuk menambah jumlahnya. Angka kecil di kartu menunjukkan jumlah di keranjang." },
  {
    id: "keranjang",
    target: '[data-tour="cart"]',
    title: "Keranjang & pembayaran",
    body: "Di sinilah transaksi berjalan. Cek jumlahnya, lalu tekan “Lanjut Bayar”, pilih tunai / QRIS / transfer, dan konfirmasi. Struk langsung siap dicetak atau dibagikan.",
  },
  {
    id: "menu",
    target: '[data-tour="nav"]',
    title: "Menu",
    body: "Riwayat penjualan hari ini ada di sini. Sebagai pemilik kamu juga mengelola Produk, Laporan, Kasir & Izin, dan Pengaturan dari menu ini. Semua ada di “Bantuan”.",
  },
  { id: "selesai", title: "Selesai — selamat berjualan!", body: "Panduan Awal (daftar langkah pertama) dan tur ini selalu bisa dibuka lagi lewat menu Bantuan. Ada yang membingungkan? Cari topiknya di sana." },
];

const PAD = 6;

// First visible element matching the selector (both a desktop sidebar and a phone
// tab bar exist in the DOM; only one is displayed). checkVisibility() also sees an
// element hidden through an ancestor; getClientRects() covers older WebViews.
export function findVisible(selector: string | undefined, root: ParentNode = document): HTMLElement | null {
  if (!selector) return null;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
    const shown = typeof el.checkVisibility === "function" ? el.checkVisibility() : el.getClientRects().length > 0;
    if (shown) return el;
  }
  return null;
}

// Mounted once inside the cashier layout. Offers the tour the first time an owner
// or cashier lands on the Kasir screen on this device, and runs it on demand
// (Bantuan > "Ulangi tur").
export function TourHost() {
  const running = useTourRunning();
  const { tourSeen } = useGuide();
  const { pathname } = useLocation();
  const { accessReady } = useAccess();
  const { settings, loading } = useSettings();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const offerWelcome = !running && !tourSeen && !welcomeDismissed && !loading && accessReady && settings.onboardingCompleted && pathname === "/kasir";

  if (running) return <TourRun />;
  if (offerWelcome) {
    return (
      <Welcome
        onStart={() => tourStore.set(true)}
        onLater={() => {
          setWelcomeDismissed(true);
          setTourSeen(true);
        }}
      />
    );
  }
  return null;
}

function Welcome({ onStart, onLater }: { onStart: () => void; onLater: () => void }) {
  const startRef = useRef<HTMLButtonElement>(null);
  useEffect(() => startRef.current?.focus(), []);
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-6 text-center shadow-2xl">
        <div className="mb-3 flex justify-center">
          <BrandMark size={52} />
        </div>
        <h2 id="welcome-title" className="font-display text-xl font-extrabold text-[var(--text)]">
          Selamat datang di Kasir Rakyat!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Mau tur singkat (sekitar 1 menit) untuk mengenal cara berjualan? Kamu bisa melewatinya dan membukanya lagi kapan saja lewat menu <b>Bantuan</b>.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            ref={startRef}
            type="button"
            onClick={onStart}
            className="min-h-[48px] rounded-xl bg-[var(--brand-500)] px-4 text-sm font-bold text-white active:bg-[var(--brand-600)]"
          >
            Mulai Tur
          </button>
          <button type="button" onClick={onLater} className="min-h-[48px] rounded-xl px-4 text-sm font-semibold text-[var(--text-secondary)]">
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}

interface Placement {
  spot: { top: number; left: number; width: number; height: number } | null;
  card: { top: number; left: number; width: number };
}

function place(target: HTMLElement | null, cardHeight: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(340, vw - 24);
  if (!target) return { spot: null, card: { top: Math.max(12, (vh - cardHeight) / 2), left: (vw - width) / 2, width } };
  const r = target.getBoundingClientRect();
  const spot = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
  // A tall, narrow target (the sidebar, the cart panel): put the card beside it.
  if (spot.height > vh * 0.6 && spot.width < vw * 0.45) {
    const top = Math.min(Math.max(12, vh / 2 - cardHeight / 2), vh - cardHeight - 12);
    const right = spot.left + spot.width + 12;
    if (right + width <= vw - 8) return { spot, card: { top, left: right, width } };
    const leftSide = spot.left - width - 12;
    if (leftSide >= 8) return { spot, card: { top, left: leftSide, width } };
  }
  const below = spot.top + spot.height + 12;
  const above = spot.top - cardHeight - 12;
  let top: number;
  if (below + cardHeight <= vh - 8) top = below;
  else if (above >= 8) top = above;
  else top = Math.max(8, vh - cardHeight - 12); // huge target (e.g. the whole cart panel): dock at the bottom
  const left = Math.min(Math.max(12, spot.left + spot.width / 2 - width / 2), vw - width - 12);
  return { spot, card: { top, left, width } };
}

function TourRun() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  // The steps point at the catalog screen.
  useEffect(() => {
    if (pathname !== "/kasir") navigate("/kasir");
  }, [pathname, navigate]);

  function finish() {
    setTourSeen(true);
    tourStore.set(false);
  }

  useLayoutEffect(() => {
    if (pathname !== "/kasir") return;
    const target = findVisible(step.target);
    target?.scrollIntoView?.({ block: "center", inline: "nearest" });
    const measure = () => setPlacement(place(findVisible(step.target), cardRef.current?.offsetHeight ?? 190));
    measure();
    // re-measure after the scroll settles, and when the viewport changes
    const t = setTimeout(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => nextRef.current?.focus(), [index]);

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={`Tur: ${step.title}`}>
      {/* swallows taps so nothing behind the tour is triggered by accident */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {placement?.spot ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl transition-all duration-200"
          style={{ ...placement.spot, boxShadow: "0 0 0 9999px rgba(10, 28, 20, 0.58), 0 0 0 3px var(--brand-400)" }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(10,28,20,0.58)]" />
      )}
      <div
        ref={cardRef}
        className="absolute rounded-2xl bg-[var(--surface)] p-4 shadow-2xl"
        style={placement ? { top: placement.card.top, left: placement.card.left, width: placement.card.width } : { top: 80, left: 12, right: 12 }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-600)]">
          Langkah {index + 1} dari {TOUR_STEPS.length}
        </p>
        <h2 className="mt-0.5 font-display text-base font-extrabold text-[var(--text)]">{step.title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{step.body}</p>
        <div className="mt-3 flex items-center gap-2">
          {!last && (
            <button type="button" onClick={finish} className="min-h-[44px] px-2 text-xs font-semibold text-[var(--text-faint)]">
              Lewati
            </button>
          )}
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex(index - 1)}>
              Kembali
            </Button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={() => (last ? finish() : setIndex(index + 1))}
            className="min-h-[44px] rounded-xl bg-[var(--brand-500)] px-5 text-sm font-bold text-white active:bg-[var(--brand-600)]"
          >
            {last ? "Selesai" : "Lanjut"}
          </button>
        </div>
      </div>
    </div>
  );
}
