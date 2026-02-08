'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/shared/Sidebar';
import { BackButton } from '@/components/shared/BackButton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { LoadingSpinner } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils/cn';

interface BrokerLayoutProps {
  children: React.ReactNode;
}

export default function BrokerLayout({ children }: BrokerLayoutProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const { toggleSidebar } = useUIStore();
  const t = useTranslations('navigation');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    // Verificar se usuário é BROKER
    if (!isLoading && user && user.role !== 'BROKER') {
      // Redirecionar para dashboard apropriado
      if (user.role === 'SUPER_ADMIN') {
        router.push('/admin');
      } else if (user.industrySlug) {
        router.push(`/${user.industrySlug}/dashboard`);
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Aplicar overflow hidden no documento
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  if (!user || user.role !== 'BROKER') {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-mineral">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Back Button & Mobile Menu */}
          <div className="flex items-center gap-2 px-6 pt-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className={cn(
                'p-2 rounded-sm hover:bg-slate-100 transition-colors lg:hidden',
                'focus:outline-none focus:ring-2 focus:ring-obsidian/20'
              )}
              aria-label={t('openMenu')}
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>

            {/* Back Button */}
            <BackButton />
          </div>
          
          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
