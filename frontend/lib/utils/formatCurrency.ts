export type CurrencyLocale = 'pt' | 'en' | 'es';

// Locale to Intl configuration mapping
const localeConfig: Record<CurrencyLocale, { locale: string; currency: string; symbol: string }> = {
  pt: { locale: 'pt-BR', currency: 'BRL', symbol: 'R$' },
  en: { locale: 'en-US', currency: 'USD', symbol: '$' },
  es: { locale: 'es-ES', currency: 'EUR', symbol: '€' },
};

export function formatCurrency(value: number, locale: CurrencyLocale = 'pt'): string {
  try {
    const config = localeConfig[locale];
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
    }).format(value);
  } catch (error) {
    // Fallback for environments that don't support the specific locale
    const config = localeConfig[locale] || localeConfig.pt;
    const safeValue = Number.isFinite(value) ? value.toFixed(2) : '0.00';
    return `${config.symbol} ${safeValue}`;
  }
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Converte string para número com precisão de 2 casas decimais
 * Evita problemas de ponto flutuante como 1234.56 virar 1234.5600000001
 */
export function parsePrice(value: string | number): number {
  if (typeof value === 'number') {
    return Math.round(value * 100) / 100;
  }
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  // Arredonda para 2 casas decimais para evitar problemas de precisão
  return Math.round(parsed * 100) / 100;
}

export function formatCurrencyInput(value: string, locale: CurrencyLocale = 'pt'): string {
  const number = parseCurrency(value);
  return formatCurrency(number, locale);
}