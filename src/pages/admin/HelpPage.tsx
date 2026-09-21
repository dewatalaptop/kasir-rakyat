import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { topicsFor } from "../../components/help/helpContent";
import { QuickStartCard } from "../../components/help/QuickStartCard";
import { Button } from "../../components/ui/Button";
import { ChevronDownIcon, SearchIcon } from "../../components/ui/icons";
import { useAccess } from "../../context/AccessContext";
import { tourStore } from "../../lib/guide";

// Mounted at the shared, ungated /bantuan route (see App.tsx's access
// boundary comment) — reachable from both Kasir "Lainnya" and the Admin
// drawer, so it needs its own minimal header rather than relying on
// AdminLayout's chrome.
export function HelpPage() {
  const navigate = useNavigate();
  const { isOwner } = useAccess();
  const topics = useMemo(() => topicsFor(isOwner), [isOwner]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = q ? topics.filter((t) => `${t.title} ${t.summary} ${t.body} ${(t.steps ?? []).join(" ")}`.toLowerCase().includes(q)) : topics;

  function startTour() {
    tourStore.set(true);
    navigate("/kasir");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <button type="button" onClick={() => navigate(-1)} className="-ml-1 flex min-h-[44px] items-center self-start px-1 text-sm font-medium text-[var(--text-secondary)]">
          ← Kembali
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold text-[var(--text)]">Bantuan & Tutorial</h1>
          <p className="text-xs text-[var(--text-secondary)]">Jawaban singkat untuk hal yang paling sering ditanyakan. Ketuk judul untuk membuka.</p>
        </div>

        <div className="shape-card card-shadow flex flex-wrap items-center gap-3 border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text)]">Tur singkat aplikasi</p>
            <p className="text-xs text-[var(--text-secondary)]">Ditunjukkan langsung di layar Kasir — sekitar 1 menit.</p>
          </div>
          <Button onClick={startTour} variant="soft">
            Mulai / Ulangi Tur
          </Button>
        </div>

        <div className="shape-card card-shadow flex flex-wrap items-center gap-3 border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--text)]">Ada yang tidak berjalan?</p>
            <p className="text-xs text-[var(--text-secondary)]">Kirim laporan singkat — langsung sampai ke tim pengembang, tanpa data pribadi.</p>
          </div>
          <Button onClick={() => window.BugReporter?.openDialog()} variant="soft">
            Laporkan Masalah
          </Button>
        </div>

        <QuickStartCard alwaysShow />

        <label className="relative">
          <SearchIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari bantuan (mis. printer, password, kasir)"
            aria-label="Cari bantuan"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--brand-400)]"
          />
        </label>

        <div className="flex flex-col gap-2">
          {shown.length === 0 && <p className="py-6 text-center text-sm text-[var(--text-secondary)]">Tidak ada topik yang cocok. Coba kata lain.</p>}
          {shown.map((topic) => {
            const open = openKey === topic.key || (q.length > 0 && shown.length === 1);
            return (
              <div key={topic.key} className="shape-card border border-[var(--border)] bg-[var(--surface)]">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenKey(open ? null : topic.key)}
                  className="flex w-full items-center justify-between gap-3 p-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--text)]">{topic.title}</span>
                    {!open && <span className="block text-xs text-[var(--text-secondary)]">{topic.summary}</span>}
                  </span>
                  <ChevronDownIcon size={16} className={`flex-none transition ${open ? "rotate-180" : ""}`} />
                </button>
                {open && (
                  <div className="flex flex-col gap-3 px-3 pb-3">
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{topic.body}</p>
                    {topic.steps && (
                      <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-[var(--text)]">
                        {topic.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    )}
                    {topic.action && isOwner && (
                      <Button variant="soft" onClick={() => navigate(topic.action!.to)} className="self-start">
                        {topic.action.label}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
