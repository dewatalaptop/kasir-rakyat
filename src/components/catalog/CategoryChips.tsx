import type { Kategori } from "../../types";

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
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`flex-none rounded-full px-4 py-1.5 text-xs font-semibold transition ${
          active === null ? "bg-[var(--brand-500)] text-white" : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]"
        }`}
      >
        Semua
      </button>
      {kategori.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => onChange(k.id)}
          className={`flex-none rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            active === k.id ? "bg-[var(--brand-500)] text-white" : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border border-[var(--border)]"
          }`}
        >
          {k.nama}
        </button>
      ))}
    </div>
  );
}
