# 📁 Dump Completo do Repositório

## `.\app\globals.css`:

```
﻿@import "tailwindcss";

:root {
  /* Cores da Identidade CAVA */
  --color-obsidian: #121212;
  --color-obsidian-hover: #0F0F0F;
  --color-porcelain: #FFFFFF;
  --color-mineral: #F9F9FB;
  --color-off-white: #FAFAFA;

  /* Variáveis de fontes */
  --font-sans: var(--font-inter);
  --font-serif: var(--font-playfair);
  --font-mono: var(--font-jetbrains);

  /* Background padrão */
  --background: var(--color-mineral);
  --foreground: var(--color-obsidian);
}

@theme inline {
  /* Cores customizadas */
  --color-obsidian: var(--color-obsidian);
  --color-obsidian-hover: var(--color-obsidian-hover);
  --color-porcelain: var(--color-porcelain);
  --color-mineral: var(--color-mineral);
  --color-off-white: var(--color-off-white);

  /* Fontes */
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --font-mono: var(--font-mono);

  /* Letter spacing customizado */
  --letter-spacing-widest: 0.15em;

  /* Sombras premium */
  --shadow-premium: 0 4px 24px rgba(0, 0, 0, 0.08);
  --shadow-premium-lg: 0 8px 40px rgba(0, 0, 0, 0.12);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), sans-serif;
}

/* Utilitários customizados */
.shadow-premium {
  box-shadow: var(--shadow-premium);
}

.shadow-premium-lg {
  box-shadow: var(--shadow-premium-lg);
}

.tracking-widest {
  letter-spacing: var(--letter-spacing-widest);
}
```

---

## `.\app\page.tsx`:

```
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
```

---

## `.\components\ui\badge.tsx`:

```
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import type { BatchStatus } from '@/lib/types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BatchStatus | 'default';
}

const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold';

  const variants = {
    DISPONIVEL: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    RESERVADO: 'bg-blue-50 text-blue-700 border border-blue-200',
    VENDIDO: 'bg-slate-100 text-slate-600 border border-slate-200',
    INATIVO: 'bg-rose-50 text-rose-600 border border-rose-200',
    default: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

export { Badge };
```

---

## `.\components\ui\button.tsx`:

```
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
```

---

## `.\components\ui\card.tsx`:

```
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'elevated' | 'glass';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-porcelain border border-slate-100',
      flat: 'bg-mineral border-0',
      elevated: 'bg-porcelain border border-slate-100 shadow-premium hover:shadow-premium-lg transition-shadow duration-200',
      glass: 'bg-white/95 backdrop-blur-md border border-white/20',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-sm p-8',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 mb-6', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-serif text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-500', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-6 border-t border-slate-100', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

---

## `.\components\ui\dropdown.tsx`:

```
import { forwardRef, type HTMLAttributes, type ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  trigger: ReactNode;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ className, trigger, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={dropdownRef} className={cn('relative inline-block', className)} {...props}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-between w-full"
        >
          {trigger}
        </button>
        {isOpen && (
          <div
            ref={ref}
            className={cn(
              'absolute z-50 mt-2 min-w-[200px] rounded-sm border border-slate-200',
              'bg-white shadow-premium-lg animate-in fade-in-0 zoom-in-95 duration-100',
              'py-1'
            )}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

const DropdownItem = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'w-full px-4 py-2 text-left text-sm transition-colors duration-150',
        'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
        className
      )}
      {...props}
    />
  )
);

DropdownItem.displayName = 'DropdownItem';

const DropdownSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('my-1 h-px bg-slate-100', className)}
      {...props}
    />
  )
);

DropdownSeparator.displayName = 'DropdownSeparator';

export { Dropdown, DropdownItem, DropdownSeparator };
```

---

## `.\components\ui\input.tsx`:

```
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block uppercase tracking-widest text-[10px] font-semibold mb-2',
              error ? 'text-rose-600' : 'text-slate-500'
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border rounded-sm px-4 py-3 text-sm transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
            error
              ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 bg-white focus:border-obsidian',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

---

## `.\components\ui\label.tsx`:

```
import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block uppercase tracking-widest text-[10px] font-semibold mb-2',
        error ? 'text-rose-600' : 'text-slate-500',
        className
      )}
      {...props}
    />
  )
);

Label.displayName = 'Label';

export { Label };
```

---

## `.\components\ui\modal.tsx`:

```
import { forwardRef, type HTMLAttributes, type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onClose, children, ...props }, ref) => {
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={ref}
          className={cn(
            'relative bg-porcelain rounded-xl shadow-premium-lg',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-10 pb-6', className)}
      {...props}
    />
  )
);

ModalHeader.displayName = 'ModalHeader';

const ModalTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('font-serif text-3xl font-semibold', className)}
      {...props}
    />
  )
);

ModalTitle.displayName = 'ModalTitle';

const ModalDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('mt-2 text-sm text-slate-600', className)}
      {...props}
    />
  )
);

ModalDescription.displayName = 'ModalDescription';

const ModalContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-10 pb-6', className)}
      {...props}
    />
  )
);

ModalContent.displayName = 'ModalContent';

const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-end gap-3 px-10 py-6 border-t border-slate-100', className)}
      {...props}
    />
  )
);

ModalFooter.displayName = 'ModalFooter';

interface ModalCloseProps extends HTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(
  ({ className, onClose, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 transition-opacity',
        'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-obsidian/20',
        'disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      <X className="h-5 w-5 text-slate-500" />
      <span className="sr-only">Fechar</span>
    </button>
  )
);

ModalClose.displayName = 'ModalClose';

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ModalClose,
};
```

---

## `.\components\ui\select.tsx`:

```
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block uppercase tracking-widest text-[10px] font-semibold mb-2',
              error ? 'text-rose-600' : 'text-slate-500'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full border rounded-sm px-4 py-3 pr-10 text-sm transition-all duration-200',
              'appearance-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
              'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
              error
                ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
                : 'border-slate-200 bg-white focus:border-obsidian',
              className
            )}
            {...props}
          >
            {children || (
              <>
                <option value="">Selecione...</option>
                {options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
```

---

## `.\components\ui\separator.tsx`:

```
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-slate-100',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);

Separator.displayName = 'Separator';

export { Separator };
```

---

## `.\components\ui\skeleton.tsx`:

```
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-sm bg-slate-200/50',
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

const SkeletonCard = ({ className }: { className?: string }) => {
  return (
    <div className={cn('bg-porcelain border border-slate-100 rounded-sm p-8', className)}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="w-full">
      <div className="bg-mineral border-b-2 border-slate-200 p-4 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-slate-100 p-4 flex gap-6">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-32" />
          ))}
        </div>
      ))}
    </div>
  );
};

SkeletonTable.displayName = 'SkeletonTable';

const SkeletonImage = ({ className }: { className?: string }) => {
  return (
    <Skeleton className={cn('aspect-[4/3] w-full', className)} />
  );
};

SkeletonImage.displayName = 'SkeletonImage';

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonImage };
```

---

## `.\components\ui\table.tsx`:

```
import { forwardRef, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
);

Table.displayName = 'Table';

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-mineral border-b-2 border-slate-200', className)}
      {...props}
    />
  )
);

TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
);

TableBody.displayName = 'TableBody';

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('bg-mineral border-t font-medium', className)}
      {...props}
    />
  )
);

TableFooter.displayName = 'TableFooter';

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-slate-100 transition-colors duration-200',
        'hover:bg-slate-50/50 data-[state=selected]:bg-slate-50',
        className
      )}
      {...props}
    />
  )
);

TableRow.displayName = 'TableRow';

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-6 text-left align-middle',
        'uppercase tracking-widest text-[10px] text-slate-500 font-semibold',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
);

TableHead.displayName = 'TableHead';

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'py-4 px-6 align-middle text-sm',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
);

TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm text-slate-500', className)}
      {...props}
    />
  )
);

TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
```

---

## `.\components\ui\textarea.tsx`:

```
import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block uppercase tracking-widest text-[10px] font-semibold mb-2',
              error ? 'text-rose-600' : 'text-slate-500'
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full border rounded-sm px-4 py-3 text-sm transition-all duration-200 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
            'min-h-[100px]',
            error
              ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 bg-white focus:border-obsidian',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
```

---

## `.\components\ui\toast.tsx`:

```
'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border rounded-sm shadow-premium',
          success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          error: 'bg-rose-50 border-rose-200 text-rose-800',
          warning: 'bg-amber-50 border-amber-200 text-amber-800',
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          title: 'text-sm font-semibold',
          description: 'text-xs',
        },
        duration: 3000,
      }}
      {...props}
    />
  );
};

export { Toaster };

// Exportar toast helper do sonner
export { toast } from 'sonner';
```

---

## `.\components\ui\toggle.tsx`:

```
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={props.checked}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            props.checked ? 'bg-obsidian' : 'bg-slate-200 hover:bg-slate-300',
            className
          )}
          onClick={() => {
            const event = new Event('change', { bubbles: true });
            Object.defineProperty(event, 'target', {
              value: { checked: !props.checked },
              writable: false,
            });
            props.onChange?.(event as any);
          }}
          disabled={props.disabled}
        >
          <span className="sr-only">{label || 'Toggle'}</span>
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
              props.checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <input
          ref={ref}
          id={toggleId}
          type="checkbox"
          className="sr-only"
          {...props}
        />
        {label && (
          <label
            htmlFor={toggleId}
            className="ml-3 text-sm text-slate-600 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
```

---

## `.\eslint.config.mjs`:

```
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

---

## `.\lib\schemas\auth.schema.ts`:

```
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'Telefone inválido'
    ),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const inviteBrokerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'Telefone inválido'
    ),
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'WhatsApp inválido'
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(1, 'Nova senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmNewPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmNewPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type InviteBrokerInput = z.infer<typeof inviteBrokerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

---

## `.\lib\schemas\batch.schema.ts`:

```
import { z } from 'zod';

export const batchStatuses = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'INATIVO',
] as const;

export const batchSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  batchCode: z
    .string()
    .min(1, 'Código do lote é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Código deve conter apenas letras maiúsculas, números e hífens')
    .transform((val) => val.toUpperCase()),
  height: z
    .number({ invalid_type_error: 'Altura deve ser um número' })
    .positive('Altura deve ser maior que zero')
    .max(1000, 'Altura deve ser menor que 1000 cm'),
  width: z
    .number({ invalid_type_error: 'Largura deve ser um número' })
    .positive('Largura deve ser maior que zero')
    .max(1000, 'Largura deve ser menor que 1000 cm'),
  thickness: z
    .number({ invalid_type_error: 'Espessura deve ser um número' })
    .positive('Espessura deve ser maior que zero')
    .max(100, 'Espessura deve ser menor que 100 cm'),
  quantitySlabs: z
    .number({ invalid_type_error: 'Quantidade deve ser um número' })
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero')
    .default(1),
  industryPrice: z
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero'),
  originQuarry: z
    .string()
    .max(100, 'Nome da pedreira deve ter no máximo 100 caracteres')
    .optional(),
  entryDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida')
    .default(() => new Date().toISOString().split('T')[0]),
});

export const batchFilterSchema = z.object({
  productId: z.string().optional(),
  status: z.enum([...batchStatuses, '']).optional(),
  code: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const reservationSchema = z.object({
  batchId: z.string().min(1, 'Lote é obrigatório'),
  leadId: z.string().optional(),
  customerName: z
    .string()
    .min(1, 'Nome do cliente é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .optional(),
  customerContact: z
    .string()
    .min(1, 'Contato do cliente é obrigatório')
    .optional(),
  expiresAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida')
    .refine(
      (val) => new Date(val) > new Date(),
      'Data de expiração deve ser futura'
    )
    .default(() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }),
  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

export const updateBatchPriceSchema = z.object({
  negotiatedPrice: z
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero')
    .optional(),
});

export type BatchInput = z.infer<typeof batchSchema>;
export type BatchFilter = z.infer<typeof batchFilterSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type UpdateBatchPriceInput = z.infer<typeof updateBatchPriceSchema>;
```

---

## `.\lib\schemas\lead.schema.ts`:

```
import { z } from 'zod';

export const leadStatuses = ['NOVO', 'CONTATADO', 'RESOLVIDO'] as const;

export const leadFilterSchema = z.object({
  search: z.string().optional(),
  linkId: z.string().optional(),
  startDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  optIn: z.boolean().optional(),
  status: z.enum([...leadStatuses, '']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(leadStatuses, {
    required_error: 'Status é obrigatório',
  }),
});

export type LeadFilter = z.infer<typeof leadFilterSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
```

---

## `.\lib\schemas\link.schema.ts`:

```
import { z } from 'zod';

export const linkTypes = ['LOTE_UNICO', 'PRODUTO_GERAL', 'CATALOGO_COMPLETO'] as const;

export const salesLinkSchema = z
  .object({
    linkType: z.enum(linkTypes, {
      required_error: 'Tipo de link é obrigatório',
    }),
    batchId: z.string().optional(),
    productId: z.string().optional(),
    title: z
      .string()
      .max(100, 'Título deve ter no máximo 100 caracteres')
      .optional(),
    customMessage: z
      .string()
      .max(500, 'Mensagem deve ter no máximo 500 caracteres')
      .optional(),
    slugToken: z
      .string()
      .min(3, 'Slug deve ter no mínimo 3 caracteres')
      .max(50, 'Slug deve ter no máximo 50 caracteres')
      .regex(
        /^[a-z0-9-]+$/,
        'Slug deve conter apenas letras minúsculas, números e hífens'
      ),
    displayPrice: z
      .number({ invalid_type_error: 'Preço deve ser um número' })
      .positive('Preço deve ser maior que zero')
      .optional(),
    showPrice: z.boolean().default(true),
    expiresAt: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
      .refine(
        (val) => !val || new Date(val) > new Date(),
        'Data de expiração deve ser futura'
      )
      .optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.linkType === 'LOTE_UNICO') {
        return !!data.batchId;
      }
      return true;
    },
    {
      message: 'Lote é obrigatório para links de lote único',
      path: ['batchId'],
    }
  )
  .refine(
    (data) => {
      if (data.linkType === 'PRODUTO_GERAL') {
        return !!data.productId;
      }
      return true;
    },
    {
      message: 'Produto é obrigatório para links de produto',
      path: ['productId'],
    }
  );

export const leadCaptureSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  contact: z
    .string()
    .min(1, 'Contato é obrigatório')
    .refine(
      (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10,11}$/;
        const cleaned = val.replace(/\D/g, '');
        return emailRegex.test(val) || phoneRegex.test(cleaned);
      },
      'Informe um email ou telefone válido'
    ),
  message: z
    .string()
    .max(500, 'Mensagem deve ter no máximo 500 caracteres')
    .optional(),
  marketingOptIn: z.boolean().default(false),
});

export const linkFilterSchema = z.object({
  type: z.enum([...linkTypes, '']).optional(),
  status: z.enum(['ATIVO', 'EXPIRADO', '']).optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
});

export const validateSlugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
});

export type SalesLinkInput = z.infer<typeof salesLinkSchema>;
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;
export type LinkFilter = z.infer<typeof linkFilterSchema>;
export type ValidateSlugInput = z.infer<typeof validateSlugSchema>;
```

---

## `.\lib\schemas\product.schema.ts`:

```
import { z } from 'zod';

export const materialTypes = [
  'GRANITO',
  'MARMORE',
  'QUARTZITO',
  'LIMESTONE',
  'TRAVERTINO',
  'OUTROS',
] as const;

export const finishTypes = [
  'POLIDO',
  'LEVIGADO',
  'BRUTO',
  'APICOADO',
  'FLAMEADO',
] as const;

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do produto é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  sku: z
    .string()
    .max(50, 'SKU deve ter no máximo 50 caracteres')
    .optional(),
  material: z.enum(materialTypes, {
    required_error: 'Tipo de material é obrigatório',
  }),
  finish: z.enum(finishTypes, {
    required_error: 'Acabamento é obrigatório',
  }),
  description: z
    .string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  isPublic: z.boolean().default(true),
});

export const productFilterSchema = z.object({
  search: z.string().optional(),
  material: z.enum([...materialTypes, '']).optional(),
  includeInactive: z.boolean().default(false),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(24),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductFilter = z.infer<typeof productFilterSchema>;
```

---

## `.\lib\types\api.ts`:

```
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  success: false;
}

export type ApiResult<T> = ApiResponse<T> | ErrorResponse;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  productId?: string;
  batchId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
  material?: string;
  includeInactive?: boolean;
  optIn?: boolean;
}

export type QueryParams = PaginationParams & FilterParams;
```

---

## `.\lib\types\index.ts`:

```
export type UserRole = 'ADMIN_INDUSTRIA' | 'BROKER' | 'VENDEDOR_INTERNO';

export type BatchStatus = 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INATIVO';

export type MaterialType = 
  | 'GRANITO' 
  | 'MARMORE' 
  | 'QUARTZITO' 
  | 'LIMESTONE' 
  | 'TRAVERTINO' 
  | 'OUTROS';

export type FinishType = 
  | 'POLIDO' 
  | 'LEVIGADO' 
  | 'BRUTO' 
  | 'APICOADO' 
  | 'FLAMEADO';

export type LinkType = 'LOTE_UNICO' | 'PRODUTO_GERAL' | 'CATALOGO_COMPLETO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  industryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Industry {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  url: string;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  industryId: string;
  name: string;
  sku?: string;
  material: MaterialType;
  finish: FinishType;
  description?: string;
  isPublic: boolean;
  isActive: boolean;
  medias: Media[];
  batchCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  industryId: string;
  batchCode: string;
  height: number;
  width: number;
  thickness: number;
  quantitySlabs: number;
  totalArea: number;
  industryPrice: number;
  originQuarry?: string;
  entryDate: string;
  status: BatchStatus;
  isActive: boolean;
  medias: Media[];
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface SharedInventoryBatch {
  id: string;
  batchId: string;
  brokerUserId: string;
  negotiatedPrice?: number;
  sharedAt: string;
  batch: Batch;
  broker: User;
}

export interface SalesLink {
  id: string;
  createdByUserId: string;
  linkType: LinkType;
  batchId?: string;
  productId?: string;
  title?: string;
  customMessage?: string;
  slugToken: string;
  displayPrice?: number;
  showPrice: boolean;
  viewsCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fullUrl?: string;
  batch?: Batch;
  product?: Product;
  createdBy?: User;
}

export interface Lead {
  id: string;
  salesLinkId: string;
  name: string;
  contact: string;
  message?: string;
  marketingOptIn: boolean;
  status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO';
  createdAt: string;
  updatedAt: string;
  salesLink?: SalesLink;
}

export interface Reservation {
  id: string;
  batchId: string;
  leadId?: string;
  reservedByUserId: string;
  expiresAt: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  batch?: Batch;
  lead?: Lead;
  reservedBy?: User;
}

export interface Sale {
  id: string;
  batchId: string;
  soldByUserId: string;
  leadId?: string;
  customerName: string;
  customerContact: string;
  salePrice: number;
  brokerCommission?: number;
  netIndustryValue: number;
  saleDate: string;
  invoiceUrl?: string;
  notes?: string;
  createdAt: string;
  batch?: Batch;
  soldBy?: User;
  lead?: Lead;
}

export interface DashboardMetrics {
  availableBatches: number;
  monthlySales: number;
  reservedBatches: number;
  activeLinks?: number;
  leadsCount?: number;
  monthlyCommission?: number;
}

export interface Activity {
  id: string;
  batchCode: string;
  productName: string;
  sellerName: string;
  action: 'RESERVADO' | 'VENDIDO' | 'COMPARTILHADO' | 'CRIADO';
  date: string;
}
```

---

## `.\lib\utils\cn.ts`:

```
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## `.\lib\utils\formatCurrency.ts`:

```
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatCurrencyInput(value: string): string {
  const number = parseCurrency(value);
  return formatCurrency(number);
}
```

---

## `.\lib\utils\formatDimensions.ts`:

```
export function formatDimensions(
  height: number,
  width: number,
  thickness: number
): string {
  return `${height} × ${width} × ${thickness} cm`;
}

export function formatArea(area: number): string {
  return `${area.toFixed(2)} m²`;
}

export function calculateTotalArea(
  height: number,
  width: number,
  quantitySlabs: number = 1
): number {
  const heightInMeters = height / 100;
  const widthInMeters = width / 100;
  const areaPerSlab = heightInMeters * widthInMeters;
  return areaPerSlab * quantitySlabs;
}
```

---

## `.\lib\utils\validators.ts`:

```
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}
```

---

## `.\next-env.d.ts`:

```
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

---

## `.\next.config.ts`:

```
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

---

## `.\package.json`:

```
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@hookform/resolvers": "^5.2.2",
    "@react-input/mask": "^2.0.4",
    "@tanstack/react-query": "^5.90.16",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.562.0",
    "nanoid": "^5.1.6",
    "next": "16.1.1",
    "qrcode.react": "^4.2.0",
    "react": "19.2.3",
    "react-day-picker": "^9.13.0",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.70.0",
    "react-input-mask": "^2.0.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0",
    "vaul": "^1.1.2",
    "zod": "^4.3.5",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.19.27",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@types/react-input-mask": "^3.0.6",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## `.\postcss.config.mjs`:

```
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

---

## `.\tsconfig.json`:

```
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

---


# 📌 Resumo

## Arquivos com conteúdo:
- .\app\globals.css
- .\app\page.tsx
- .\components\ui\badge.tsx
- .\components\ui\button.tsx
- .\components\ui\card.tsx
- .\components\ui\dropdown.tsx
- .\components\ui\input.tsx
- .\components\ui\label.tsx
- .\components\ui\modal.tsx
- .\components\ui\select.tsx
- .\components\ui\separator.tsx
- .\components\ui\skeleton.tsx
- .\components\ui\table.tsx
- .\components\ui\textarea.tsx
- .\components\ui\toast.tsx
- .\components\ui\toggle.tsx
- .\eslint.config.mjs
- .\lib\schemas\auth.schema.ts
- .\lib\schemas\batch.schema.ts
- .\lib\schemas\lead.schema.ts
- .\lib\schemas\link.schema.ts
- .\lib\schemas\product.schema.ts
- .\lib\types\api.ts
- .\lib\types\index.ts
- .\lib\utils\cn.ts
- .\lib\utils\formatCurrency.ts
- .\lib\utils\formatDimensions.ts
- .\lib\utils\validators.ts
- .\next-env.d.ts
- .\next.config.ts
- .\package.json
- .\postcss.config.mjs
- .\tsconfig.json

## Arquivos vazios:
- .\app\(auth)\login\page.tsx
- .\app\(broker)\dashboard\page.tsx
- .\app\(broker)\leads\page.tsx
- .\app\(broker)\links\new\page.tsx
- .\app\(broker)\links\page.tsx
- .\app\(broker)\shared-inventory\page.tsx
- .\app\(industry)\brokers\[id]\shared\page.tsx
- .\app\(industry)\brokers\page.tsx
- .\app\(industry)\catalog\[id]\page.tsx
- .\app\(industry)\catalog\new\page.tsx
- .\app\(industry)\catalog\page.tsx
- .\app\(industry)\dashboard\page.tsx
- .\app\(industry)\inventory\[id]\page.tsx
- .\app\(industry)\inventory\new\page.tsx
- .\app\(industry)\inventory\page.tsx
- .\app\(industry)\leads\page.tsx
- .\app\(industry)\links\new\page.tsx
- .\app\(industry)\links\page.tsx
- .\app\(industry)\sales\page.tsx
- .\app\(industry)\team\page.tsx
- .\app\(public)\[slug]\page.tsx
- .\app\(seller)\dashboard\page.tsx
- .\app\(seller)\inventory\page.tsx
- .\app\(seller)\leads\page.tsx
- .\app\(seller)\links\new\page.tsx
- .\app\(seller)\links\page.tsx
- .\components\shared\EmptyState.tsx
- .\components\shared\ErrorBoundary.tsx
- .\components\shared\Header.tsx
- .\components\shared\LoadingState.tsx
- .\components\shared\Pagination.tsx
- .\components\shared\Sidebar.tsx
- .\lib\api\client.ts
- .\lib\hooks\useAuth.ts
- .\lib\hooks\useToast.ts
- .\lib\types\database.ts
- .\lib\utils\calculateArea.ts
- .\lib\utils\formatDate.ts
- .\middleware.ts
- .\store\auth.store.ts
- .\store\ui.store.ts
