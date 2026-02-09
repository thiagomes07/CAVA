'use client';

import { forwardRef, type InputHTMLAttributes, type ChangeEvent, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  mask: string;
  maskChar?: string;
  onChange?: (value: string, rawValue: string) => void;
  value?: string;
}

// Simple masking implementation to replace react-input-mask
const formatValue = (value: string, mask: string): string => {
  if (!value) return '';

  let i = 0; // index in mask
  let j = 0; // index in value
  let result = '';

  const valueChars = value.replace(/[^a-zA-Z0-9]/g, ''); // Crude strip, refined below based on mask type

  while (i < mask.length) {
    const maskChar = mask[i];

    if (j >= valueChars.length) break;

    if (maskChar === '9') {
      // Expect digit
      if (/\d/.test(valueChars[j])) {
        result += valueChars[j];
        j++;
        i++;
      } else {
        // Skip invalid char in value
        j++;
      }
    } else if (maskChar === 'a') {
      // Expect letter
      if (/[a-zA-Z]/.test(valueChars[j])) {
        result += valueChars[j];
        j++;
        i++;
      } else {
        j++;
      }
    } else {
      // Static char
      result += maskChar;
      i++;
      // If value matches static char, advance value index too
      if (valueChars[j] === maskChar) {
        j++;
      }
    }
  }

  return result;
};

// Strip mask characters to get raw value
const getRawValue = (value: string, mask: string): string => {
  // This is a simplification. For complex masks it might need better logic.
  // But typically we just want the alphanumeric content.
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, label, error, helperText, mask, maskChar = '_', id, onChange, value: propValue, placeholder, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    // Internal state for uncontrolled usage or to manage display value
    const [displayValue, setDisplayValue] = useState(propValue || '');

    useEffect(() => {
      if (propValue !== undefined) {
        // Re-format incoming value to ensure mask consistency
        setDisplayValue(formatValue(propValue.toString(), mask));
      }
    }, [propValue, mask]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const masked = formatValue(val, mask);
      const raw = getRawValue(masked, mask); // Extract raw from the masked result to be sure

      setDisplayValue(masked);
      onChange?.(masked, raw);
    };

    const inputClassName = cn(
      'w-full border rounded-sm px-4 py-3 text-sm transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
      'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
      error
        ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
        : 'border-slate-200 bg-white focus:border-obsidian',
      className
    );

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
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputClassName}
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

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text');
      const numericValue = parseCurrency(pasted);
      onChange?.(numericValue);
      e.preventDefault();
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
          onPaste={handlePaste}
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

// Money Input Component - More flexible for price inputs (R$/m², etc.)
export interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: number | string;
  onChange?: (value: number | undefined) => void;
  prefix?: string;
  suffix?: string;
  allowDecimals?: boolean;
  decimalPlaces?: number;
  variant?: 'default' | 'minimal';
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ 
    className, 
    label, 
    error, 
    helperText, 
    id, 
    value, 
    onChange, 
    prefix = 'R$',
    suffix,
    allowDecimals = true,
    decimalPlaces = 2,
    variant = 'default',
    disabled,
    ...props 
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const inputRef = useRef<HTMLInputElement>(null);
    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    };
    const MAX_DIGITS = 15;
    const scale = allowDecimals ? Math.pow(10, decimalPlaces) : 1;

    const stripLeadingZeros = (digits: string): string => {
      if (!digits) return '';
      const normalized = digits.replace(/^0+(?=\d)/, '');
      return normalized || '0';
    };

    const digitsToNumber = (digits: string): number | undefined => {
      if (!digits) return undefined;
      const parsed = Number.parseInt(digits, 10);
      if (!Number.isFinite(parsed)) return undefined;
      return parsed / scale;
    };

    const numberToDigits = (num: number | undefined): string => {
      if (num === undefined || !Number.isFinite(num)) return '';
      const scaled = Math.round(Math.abs(num) * scale);
      return scaled > 0 ? String(scaled) : '0';
    };

    const parseExternalValue = (val: number | string | undefined): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;

      const trimmed = val.trim();
      if (!trimmed) return undefined;

      // Aceita string em pt-BR (1.234,56) e em formato simples (1234.56)
      const normalized = trimmed.includes(',')
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed;

      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const valueToDigits = (val: number | string | undefined): string => {
      const parsed = parseExternalValue(val);
      return numberToDigits(parsed);
    };

    const formatDigits = (digits: string): string => {
      if (!digits) return '';
      const numeric = digitsToNumber(digits);
      if (numeric === undefined) return '';

      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: allowDecimals ? decimalPlaces : 0,
        maximumFractionDigits: allowDecimals ? decimalPlaces : 0,
      }).format(numeric);
    };

    const isControlled = value !== undefined;
    const [internalDigits, setInternalDigits] = useState(() => valueToDigits(value));
    const rawDigits = isControlled ? valueToDigits(value) : internalDigits;

    const applyDigits = (nextDigits: string) => {
      const limited = stripLeadingZeros(nextDigits.replace(/\D/g, '').slice(0, MAX_DIGITS));
      if (!isControlled) {
        setInternalDigits(limited);
      }
      onChange?.(digitsToNumber(limited));
    };

    const moveCursorToEnd = () => {
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        const end = el.value.length;
        el.setSelectionRange(end, end);
      });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Fallback para teclado mobile/autofill: extrai dígitos e reaplica máscara.
      applyDigits(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        applyDigits(rawDigits.slice(0, -1));
        moveCursorToEnd();
        return;
      }

      if (e.key === 'Delete') {
        e.preventDefault();
        applyDigits('');
        moveCursorToEnd();
        return;
      }

      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        applyDigits(rawDigits + e.key);
        moveCursorToEnd();
        return;
      }

      if (['Tab', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }

      e.preventDefault();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text') || '';
      applyDigits(pasted);
      moveCursorToEnd();
    };

    const baseInputClass = variant === 'minimal' 
      ? cn(
          'w-full bg-transparent border-0 p-0 text-sm outline-none',
          'disabled:text-slate-300 disabled:cursor-not-allowed',
          className
        )
      : cn(
          'w-full border rounded-sm px-4 py-3 text-sm transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
          'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
          error
            ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
            : 'border-slate-200 bg-white focus:border-obsidian',
          prefix && 'pl-10',
          suffix && 'pr-16',
          className
        );

    const inputElement = (
      <div className="relative">
        {prefix && variant !== 'minimal' && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            {prefix}
          </span>
        )}
        {prefix && variant === 'minimal' && (
          <span className="text-sm text-slate-400 mr-1">{prefix}</span>
        )}
        <input
          ref={setRefs}
          id={inputId}
          type="text"
          inputMode="numeric"
          value={formatDigits(rawDigits)}
          onChange={handleChange}
          onBlur={props.onBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="0,00"
          disabled={disabled}
          className={baseInputClass}
          {...props}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    );

    if (variant === 'minimal') {
      return inputElement;
    }

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
        {inputElement}
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

MoneyInput.displayName = 'MoneyInput';

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
