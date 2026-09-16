import type { PaymentMethod } from "../../types";
import { PAYMENT_METHOD_LABEL } from "../../types";
import { CreditCardIcon } from "../ui/icons";

const METHODS: PaymentMethod[] = ["tunai", "qris-manual", "transfer-manual", "lainnya"];

// Plain selectable options the cashier picks and confirms was received —
// never a "pay now" button implying real gateway processing (there is no
// gateway integration by design).
export function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod | null; onChange: (m: PaymentMethod) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {METHODS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition ${
            value === m ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]"
          }`}
        >
          <CreditCardIcon size={16} />
          {PAYMENT_METHOD_LABEL[m]}
        </button>
      ))}
    </div>
  );
}
