'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import InputMask from 'react-input-mask';
import { cn } from '@/lib/utils/cn';

export interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  mask: string;
  maskChar?: string;
  onChange?: (value: string, rawValue: string) => void;
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, label, error, helperText, mask, maskChar = '_', id, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const rawValue = value.replace(/\D/g, '');
      onChange?.(value, rawValue);
    };

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
        <InputMask
          mask={mask}
          maskChar={maskChar}
          onChange={handleChange}
          {...props}
        >
          {(inputProps: Record<string, unknown>) => (
            <input
              {...inputProps}
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
            />
          )}
        </InputMask>
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

MaskedInput.displayName = 'MaskedInput';

// Pre-configured mask components
export const PhoneInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => (
    <MaskedInput
      ref={ref}
      mask="(99) 99999-9999"
      placeholder="(00) 00000-0000"
      {...props}
    />
  )
);

PhoneInput.displayName = 'PhoneInput';

export const CPFInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => (
    <MaskedInput
      ref={ref}
      mask="999.999.999-99"
      placeholder="000.000.000-00"
      {...props}
    />
  )
);

CPFInput.displayName = 'CPFInput';

export const CNPJInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => (
    <MaskedInput
      ref={ref}
      mask="99.999.999/9999-99"
      placeholder="00.000.000/0000-00"
      {...props}
    />
  )
);

CNPJInput.displayName = 'CNPJInput';

export const CEPInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => (
    <MaskedInput
      ref={ref}
      mask="99999-999"
      placeholder="00000-000"
      {...props}
    />
  )
);

CEPInput.displayName = 'CEPInput';

export const DateInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => (
    <MaskedInput
      ref={ref}
      mask="99/99/9999"
      placeholder="DD/MM/AAAA"
      {...props}
    />
  )
);

DateInput.displayName = 'DateInput';

// Currency Input Component - R$ #.##0,00
export interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: number;
  onChange?: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, label, error, helperText, id, value, onChange, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const formatCurrency = (val: number): string => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(val);
    };

    const parseCurrency = (val: string): number => {
      const cleaned = val.replace(/[^\d]/g, '');
      return parseFloat(cleaned) / 100 || 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numericValue = parseCurrency(inputValue);
      onChange?.(numericValue);
    };

    const displayValue = value !== undefined ? formatCurrency(value) : '';

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
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder="R$ 0,00"
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

CurrencyInput.displayName = 'CurrencyInput';

// Batch Code Input - AAA-999999
export const BatchCodeInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => (
    <MaskedInput
      ref={ref}
      mask="aaa-999999"
      placeholder="AAA-000000"
      style={{ textTransform: 'uppercase' }}
      {...props}
    />
  )
);

BatchCodeInput.displayName = 'BatchCodeInput';

export { MaskedInput };
