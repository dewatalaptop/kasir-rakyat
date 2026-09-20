import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Shape = "notch" | "pill" | "rounded";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  shape?: Shape;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-[var(--brand-500)] text-white shadow-sm hover:bg-[var(--brand-600)] disabled:bg-[var(--brand-300)]",
  secondary: "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] disabled:bg-[var(--accent-100)]",
  soft: "bg-[var(--brand-50)] text-[var(--brand-700)] border border-[var(--brand-100)] hover:bg-[var(--brand-100)]",
  ghost: "bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border-soft)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

// "notch" is the historical name for the primary-CTA shape; it is now just a
// generously rounded rectangle (see .shape-notch in index.css) — kept so
// existing call sites keep working.
const SHAPE_CLASS: Record<Shape, string> = {
  notch: "rounded-xl px-6 py-3",
  pill: "rounded-full px-4 py-2",
  rounded: "rounded-xl px-4 py-2.5",
};

export function Button({ variant = "primary", shape = "notch", fullWidth, icon, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${SHAPE_CLASS[shape]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
