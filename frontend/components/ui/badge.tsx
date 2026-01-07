import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import type { BatchStatus } from '@/lib/types';

export type BadgeVariant = BatchStatus | 'success' | 'warning' | 'info' | 'default';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold';

  const variants: Record<BadgeVariant, string> = {
    DISPONIVEL: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    RESERVADO: 'bg-blue-50 text-blue-700 border border-blue-200',
    VENDIDO: 'bg-slate-100 text-slate-600 border border-slate-200',
    INATIVO: 'bg-rose-50 text-rose-600 border border-rose-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    default: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

export { Badge };