'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link2Off, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();
  const t = useTranslations('errors');

  return (
    <div className="min-h-screen bg-mineral flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <Link2Off className="w-12 h-12 text-slate-400" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl text-obsidian mb-4">
          {t('notFound')}
        </h1>

        {/* Description */}
        <p className="text-slate-600 mb-8 clienteing-relaxed">
          {t('notFoundDescription')}
          <br />
          {t('checkAddress')}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="primary"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('backToHome')}
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-obsidian rounded-sm" />
            <span className="font-serif text-sm text-slate-400">CAVA</span>
          </div>  
          <p className="text-xs text-slate-400">
            {t('notFoundDescription')}
          </p>
        </div>
      </div>
    </div>
  );
}
