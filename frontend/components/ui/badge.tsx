import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import type { BatchStatus } from "@/lib/types";

export type BadgeVariant =
  | BatchStatus
  | "success"
  | "warning"
  | "info"
  | "default"
  | "secondary"
  | "outline"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = ({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border";

  const variants: Record<BadgeVariant, string> = {
    DISPONIVEL: "bg-emerald-50 text-emerald-700 border-emerald-200",
    RESERVADO: "bg-blue-50 text-blue-700 border-blue-200",
    VENDIDO: "bg-slate-100 text-slate-600 border-slate-200",
    INATIVO: "bg-rose-50 text-rose-600 border-rose-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    default: "bg-slate-100 text-slate-600 border-slate-200",
    secondary: "bg-slate-100 text-slate-600 border-slate-200",
    outline: "bg-transparent text-slate-600 border-slate-300",
    danger: "bg-rose-50 text-rose-600 border-rose-200",
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = "Badge";

export { Badge };
