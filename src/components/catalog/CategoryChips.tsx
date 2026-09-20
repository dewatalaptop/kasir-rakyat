import type { Kategori } from "../../types";

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] flex-none rounded-xl px-4 text-[13px] font-bold transition ${
        active
          ? "bg-[var(--brand-500)] text-white shadow-sm"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--brand-300)] hover:text-[var(--brand-700)]"
      }`}
    >
      {label}
    </button>
  );
}

export function CategoryChips({
  kategori,
  active,
  onChange,
}: {
  kategori: Kategori[];
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2 lg:px-6">
      <Chip active={active === null} label="Semua" onClick={() => onChange(null)} />
      {kategori.map((k) => (
        <Chip key={k.id} active={active === k.id} label={k.nama} onClick={() => onChange(k.id)} />
      ))}
    </div>
  );
}
