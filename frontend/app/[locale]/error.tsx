'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations('errors');

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-mineral flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-600" />
        </div>

        {/* Title */}
        <h1 className="font-serif text-3xl text-obsidian mb-3">
          {t('generic')}
        </h1>

        {/* Description */}
        <p className="text-slate-500 mb-8">
          {t('genericDescription')}
        </p>

        {/* Error digest (for debugging) */}
        {error.digest && (
          <p className="text-xs text-slate-400 mb-6 font-mono">
            {t('code')}: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-obsidian text-white rounded-sm font-medium text-sm transition-all duration-200 hover:bg-obsidian-hover hover:scale-[1.02]"
          >
            <RotateCcw className="w-4 h-4" />
            {t('tryAgain')}
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-obsidian rounded-sm font-medium text-sm transition-all duration-200 hover:bg-slate-50"
          >
            <Home className="w-4 h-4" />
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
