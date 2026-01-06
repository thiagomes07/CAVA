import { format, formatDistance, formatRelative, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, formatStr, { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
}

export function formatDateLong(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd/MM/yy');
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

export function formatRelativeDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatRelative(dateObj, new Date(), { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDistanceToNow(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatDistance(dateObj, new Date(), { 
      addSuffix: true, 
      locale: ptBR 
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