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

export function formatCurrencyInput(value: string, locale: CurrencyLocale = 'pt'): string {
  const number = parseCurrency(value);
  return formatCurrency(number, locale);
}