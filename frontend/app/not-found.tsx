'use client';

import { useRouter } from 'next/navigation';
import { Link2Off, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Fallback not-found page for non-locale routes
// Uses browser language detection for basic i18n
function getTexts() {
  const lang = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'pt';
  
  const texts: Record<string, { title: string; description: string; checkAddress: string; home: string; platform: string }> = {
    pt: {
      title: 'Link não encontrado',
      description: 'Este link não existe ou pode ter expirado.',
      checkAddress: 'Verifique se o endereço está correto ou entre em contato com o vendedor.',
      home: 'Voltar ao Início',
      platform: 'Plataforma de gestão e comercialização de pedras ornamentais',
    },
    en: {
      title: 'Link not found',
      description: 'This link does not exist or may have expired.',
      checkAddress: 'Check if the address is correct or contact the seller.',
      home: 'Back to Home',
      platform: 'Ornamental stone management and sales platform',
    },
    es: {
      title: 'Enlace no encontrado',
      description: 'Este enlace no existe o puede haber expirado.',
      checkAddress: 'Verifique si la dirección es correcta o contacte al vendedor.',
      home: 'Volver al Inicio',
      platform: 'Plataforma de gestión y comercialización de piedras ornamentales',
    },
  };
  
  return texts[lang] || texts.pt;
}

export default function NotFound() {
  const router = useRouter();
  const t = getTexts();

  return (
    <div className="min-h-screen bg-mineral flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <Link2Off className="w-12 h-12 text-slate-400" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h1 className="font-serif text-4xl text-obsidian mb-4">
          {t.title}
        </h1>

        {/* Description */}
        <p className="text-slate-600 mb-8 clienteing-relaxed">
          {t.description}
          <br />
          {t.checkAddress}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            variant="primary"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.home}
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-obsidian rounded-sm" />
            <span className="font-serif text-sm text-slate-400">CAVA Stone Platform</span>
          </div>
          <p className="text-xs text-slate-400">
            {t.platform}
          </p>
        </div>
      </div>
    </div>
  );
}
