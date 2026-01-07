import { toast as sonnerToast } from 'sonner';
import { createElement } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 3000, // 3 segundos conforme doc
      icon: createElement(CheckCircle, { className: 'w-5 h-5' }),
      action: options?.action,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000, // 5 segundos conforme doc
      icon: createElement(XCircle, { className: 'w-5 h-5' }),
      action: options?.action,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000, // 4 segundos conforme doc
      icon: createElement(AlertTriangle, { className: 'w-5 h-5' }),
      action: options?.action,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 3000, // 3 segundos conforme doc
      icon: createElement(Info, { className: 'w-5 h-5' }),
      action: options?.action,
    });
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