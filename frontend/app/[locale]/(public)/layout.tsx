import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: 'CAVA Stone Platform',
    description: t('description'),
  };
}

export default async function PublicLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });
  const tPrivacy = await getTranslations({ locale, namespace: 'privacy' });

  return (
    <div className="min-h-screen bg-porcelain">
      {children}
      
      {/* Footer minimalista */}
      <footer className="border-t border-slate-100 py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-obsidian rounded-sm" />
            <span className="font-serif text-sm text-slate-400">CAVA Stone Platform</span>
          </div>
          
          <p className="text-xs text-slate-400">
            {t('poweredBy')}
          </p>
          
          <div className="mt-4">
            <Link
              href="/privacy"
              className="text-xs text-slate-500 hover:text-obsidian transition-colors"
            >
              {tPrivacy('privacyPolicy')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
