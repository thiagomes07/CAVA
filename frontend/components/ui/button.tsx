import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-sm font-bold uppercase tracking-widest text-xs transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-obsidian/20 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-obsidian text-porcelain hover:shadow-premium active:scale-[0.98]',
      secondary: 'bg-porcelain border border-slate-200 text-slate-600 hover:border-obsidian hover:text-obsidian active:scale-[0.98]',
      destructive: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-[0.98]',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-50 active:bg-slate-100',
    };

    const sizes = {
      sm: 'px-4 py-2 text-[10px]',
      md: 'px-6 py-3 text-xs',
      lg: 'px-8 py-4 text-xs',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };