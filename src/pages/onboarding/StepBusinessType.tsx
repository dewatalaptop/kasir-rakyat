import { BUSINESS_TYPES } from "../../lib/businessType";
import type { BusinessTypeKey } from "../../types";
import { CoffeeIcon, GridIcon, StoreIcon, UtensilsIcon } from "../../components/ui/icons";
import { Button } from "../../components/ui/Button";

const ICONS: Record<string, typeof StoreIcon> = { utensils: UtensilsIcon, coffee: CoffeeIcon, store: StoreIcon, grid: GridIcon };

export function StepBusinessType({
  value,
  onChange,
  onNext,
}: {
  value: BusinessTypeKey;
  onChange: (v: BusinessTypeKey) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center font-display text-xl font-bold text-[var(--text)]">Jenis usaha kamu apa?</h2>
      <div className="grid grid-cols-2 gap-3">
        {BUSINESS_TYPES.map((bt) => {
          const Icon = ICONS[bt.icon] ?? GridIcon;
          const active = value === bt.key;
          return (
            <button
              key={bt.key}
              type="button"
              onClick={() => onChange(bt.key)}
              className={`shape-card flex flex-col items-center gap-2 border p-4 text-sm font-semibold transition ${
                active ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
              }`}
            >
              <Icon size={26} />
              {bt.label}
            </button>
          );
        })}
      </div>
      <Button onClick={onNext} fullWidth>
        Lanjut
      </Button>
    </div>
  );
}
