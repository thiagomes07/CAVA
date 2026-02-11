import { toast as sonnerToast } from 'sonner';
import { createElement } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastOptions {
  description?: string;
  duration?: number;
  dedupeWindowMs?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

const DEFAULT_DEDUPE_WINDOW_MS = 1500;
const recentToastTimestamps = new Map<string, number>();

const normalizeToastText = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const formatToastText = (value: string): string => {
  const normalized = normalizeToastText(value);
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const normalizeToastKeyPart = (value: string): string => {
  return normalizeToastText(value).toLowerCase().replace(/[.!?]+$/, '');
};

const getToastKey = (type: ToastType, message: string, description?: string) => {
  return `${type}:${normalizeToastKeyPart(message)}:${normalizeToastKeyPart(description || '')}`;
};

const shouldSkipDuplicateToast = (key: string, dedupeWindowMs: number) => {
  const now = Date.now();
  const lastShownAt = recentToastTimestamps.get(key);

  if (lastShownAt && now - lastShownAt < dedupeWindowMs) {
    return true;
  }

  recentToastTimestamps.set(key, now);

  // Limpeza simples para evitar crescimento indefinido do mapa em sessão longa
  for (const [entryKey, timestamp] of recentToastTimestamps.entries()) {
    if (now - timestamp > 60_000) {
      recentToastTimestamps.delete(entryKey);
    }
  }

  return false;
};

function showToast(
  type: ToastType,
  message: string,
  options?: ToastOptions & { icon?: ReturnType<typeof createElement> }
) {
  const formattedMessage = formatToastText(message);
  const formattedDescription = options?.description
    ? formatToastText(options.description)
    : undefined;

  if (!formattedMessage) {
    return;
  }

  const key = getToastKey(type, formattedMessage, formattedDescription);
  const dedupeWindowMs = options?.dedupeWindowMs ?? DEFAULT_DEDUPE_WINDOW_MS;

  if (shouldSkipDuplicateToast(key, dedupeWindowMs)) {
    return;
  }

  sonnerToast[type](formattedMessage, {
    id: key,
    description: formattedDescription,
    duration: options?.duration ?? DEFAULT_DURATION[type],
    icon: options?.icon,
    action: options?.action,
  });
}

export function showSuccessToast(message: string, options?: ToastOptions) {
  showToast('success', message, {
    ...options,
    icon: createElement(CheckCircle, { className: 'w-5 h-5' }),
  });
}

export function showErrorToast(message: string, options?: ToastOptions) {
  showToast('error', message, {
    ...options,
    icon: createElement(XCircle, { className: 'w-5 h-5' }),
  });
}

export function showWarningToast(message: string, options?: ToastOptions) {
  showToast('warning', message, {
    ...options,
    icon: createElement(AlertTriangle, { className: 'w-5 h-5' }),
  });
}

export function showInfoToast(message: string, options?: ToastOptions) {
  showToast('info', message, {
    ...options,
    icon: createElement(Info, { className: 'w-5 h-5' }),
  });
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    showSuccessToast(message, options);
  };

  const error = (message: string, options?: ToastOptions) => {
    showErrorToast(message, options);
  };

  const warning = (message: string, options?: ToastOptions) => {
    showWarningToast(message, options);
  };

  const info = (message: string, options?: ToastOptions) => {
    showInfoToast(message, options);
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  };

  return {
    success,
    error,
    warning,
    info,
    promise,
    toast: sonnerToast,
  };
}

export const errorMessages: Record<string, string> = {
  BATCH_NOT_AVAILABLE: 'Este lote não está mais disponível',
  INSUFFICIENT_SLABS: 'Quantidade de chapas insuficiente para esta operação',
  RESERVATION_EXPIRED: 'Esta reserva já expirou',
  UNAUTHORIZED: 'Você não tem permissão para esta ação',
  VALIDATION_ERROR: 'Erro de validação nos dados enviados',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  GENERIC_ERROR: 'Algo deu errado. Tente novamente.',
  FILE_TOO_LARGE: 'Arquivo excede o limite de 5MB',
  INVALID_FORMAT: 'Formato não suportado. Use JPG, PNG ou WebP',
  PERMISSION_DENIED: 'Você não tem permissão para esta ação',
};

export function getErrorMessage(code: string): string {
  return errorMessages[code] || errorMessages.GENERIC_ERROR;
}
