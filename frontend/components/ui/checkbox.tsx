'use client';

import { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex items-start gap-3">
        <label className="relative flex items-center justify-center cursor-pointer">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'h-5 w-5 rounded border-2 border-slate-300 bg-white transition-all',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-obsidian peer-focus-visible:ring-offset-2',
              'peer-checked:border-obsidian peer-checked:bg-obsidian',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              error && 'border-rose-500',
              className
            )}
          >
            <Check
              className={cn(
                'h-4 w-4 text-white opacity-0 transition-opacity',
                'peer-checked:opacity-100'
              )}
            />
          </div>
          {/* Overlay to make the check visible when checked */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </label>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  'text-sm font-medium text-obsidian cursor-pointer select-none',
                  props.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-xs text-slate-500 mt-0.5">
                {description}
              </span>
            )}
            {error && (
              <span className="text-xs text-rose-500 mt-1">
                {error}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
