import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Shape = "notch" | "pill" | "rounded";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  shape?: Shape;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)] disabled:bg-[var(--brand-300)]",
  secondary: "bg-[var(--accent-500)] text-white hover:bg-[var(--accent-600)] disabled:bg-[var(--accent-100)]",
  ghost: "bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border-soft)]",
  danger: "bg-[var(--danger)] text-white hover:opacity-90",
};

const SHAPE_CLASS: Record<Shape, string> = {
  notch: "shape-notch rounded-none px-6 py-3",
  pill: "rounded-full px-4 py-2",
  rounded: "shape-card px-4 py-2.5",
};

export function Button({ variant = "primary", shape = "notch", fullWidth, icon, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${SHAPE_CLASS[shape]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
