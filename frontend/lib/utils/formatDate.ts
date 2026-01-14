import { format, formatDistance, formatRelative, parseISO, isValid } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

// Locale type
export type DateLocale = 'pt' | 'en' | 'es';

// Locale mapping
const localeMap = {
  pt: ptBR,
  en: enUS,
  es: es,
};

// Get date-fns locale from string
function getLocale(locale?: DateLocale) {
  return localeMap[locale || 'pt'] || ptBR;
}

export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy', locale?: DateLocale): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, formatStr, { locale: getLocale(locale) });
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date, locale?: DateLocale): string {
  const atWord = locale === 'en' ? 'at' : locale === 'es' ? 'a las' : 'às';
  return formatDate(date, `dd/MM/yyyy '${atWord}' HH:mm`, locale);
}

export function formatDateLong(date: string | Date, locale?: DateLocale): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    
    const formatStr = locale === 'en' 
      ? "MMMM dd, yyyy"
      : locale === 'es' 
        ? "dd 'de' MMMM 'de' yyyy"
        : "dd 'de' MMMM 'de' yyyy";
    
    return format(dateObj, formatStr, { locale: getLocale(locale) });
  } catch {
    return '-';
  }
}

export function formatDateShort(date: string | Date, locale?: DateLocale): string {
  return formatDate(date, 'dd/MM/yy', locale);
}

export function formatDateISO(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function formatDateTimeISO(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return dateObj.toISOString();
  } catch {
    return '';
  }
}

export function formatRelativeDate(date: string | Date, locale?: DateLocale): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatRelative(dateObj, new Date(), { locale: getLocale(locale) });
  } catch {
    return '-';
  }
}

export function formatDistanceToNow(date: string | Date, locale?: DateLocale): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatDistance(dateObj, new Date(), { 
      addSuffix: true, 
      locale: getLocale(locale) 
    });
  } catch {
    return '-';
  }
}

export function formatDateForInput(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd');
}

export function addDays(date: string | Date, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const result = new Date(dateObj);
  result.setDate(result.getDate() + days);
  return result;
}

export function isExpired(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    return dateObj < new Date();
  } catch {
    return false;
  }
}

export function getDaysUntil(date: string | Date): number {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 0;
    
    const now = new Date();
    const diff = dateObj.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function getDefaultExpirationDate(daysFromNow: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatDateForInput(date);
}