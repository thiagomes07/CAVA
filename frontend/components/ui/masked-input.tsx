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
  onChange?: (value: number) => void;
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

    // Formata número para exibição brasileira (1.234,56)
    const formatDisplay = (val: number | string | undefined): string => {
      if (val === undefined || val === '' || val === null) return '';
      
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(numVal)) return '';
      
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: allowDecimals ? decimalPlaces : 0,
        maximumFractionDigits: allowDecimals ? decimalPlaces : 0,
      }).format(numVal);
    };

    // Parse de string formatada para número
    const parseValue = (val: string): number => {
      if (!val) return 0;
      // Remove tudo exceto dígitos e vírgula
      let cleaned = val.replace(/[^\d,]/g, '');
      // Substitui vírgula por ponto para parseFloat
      cleaned = cleaned.replace(',', '.');
      const parsed = parseFloat(cleaned);
      if (isNaN(parsed)) return 0;
      // Arredonda para evitar problemas de ponto flutuante
      return Math.round(parsed * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
    };

    const [displayValue, setDisplayValue] = useState(() => formatDisplay(value));
    const [isFocused, setIsFocused] = useState(false);

    // Atualiza quando valor externo muda (e não está focado)
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatDisplay(value));
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Remove formatação quando foca (deixa só o número)
      const numVal = typeof value === 'string' ? parseFloat(value) : value;
      if (numVal !== undefined && !isNaN(numVal) && numVal !== 0) {
        setDisplayValue(numVal.toString().replace('.', ','));
      }
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Reformata ao sair do foco
      const parsed = parseValue(displayValue);
      setDisplayValue(formatDisplay(parsed));
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Permite apenas dígitos, vírgula e ponto
      inputValue = inputValue.replace(/[^\d.,]/g, '');
      
      // Converte pontos para vírgulas (padrão brasileiro)
      inputValue = inputValue.replace('.', ',');
      
      // Permite apenas uma vírgula
      const parts = inputValue.split(',');
      if (parts.length > 2) {
        inputValue = parts[0] + ',' + parts.slice(1).join('');
      }
      
      // Limita casas decimais
      if (parts.length === 2 && parts[1].length > decimalPlaces) {
        inputValue = parts[0] + ',' + parts[1].substring(0, decimalPlaces);
      }
      
      setDisplayValue(inputValue);
      
      // Notifica mudança
      const numericValue = parseValue(inputValue);
      onChange?.(numericValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permite: backspace, delete, tab, escape, enter, setas
      if ([8, 46, 9, 27, 13, 37, 38, 39, 40].includes(e.keyCode)) {
        return;
      }
      // Permite Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) {
        return;
      }
      // Permite dígitos
      if (/^\d$/.test(e.key)) {
        return;
      }
      // Permite vírgula e ponto (serão convertidos para vírgula)
      if (e.key === ',' || e.key === '.') {
        if (!allowDecimals) {
          e.preventDefault();
          return;
        }
        if (displayValue.includes(',')) {
          e.preventDefault();
        }
        return;
      }
      // Bloqueia qualquer outra tecla
      e.preventDefault();
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
          (prefix || suffix) && 'pl-10',
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
          ref={ref || inputRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
