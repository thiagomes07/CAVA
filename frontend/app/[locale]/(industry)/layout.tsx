'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/shared/Sidebar';
import { BackButton } from '@/components/shared/BackButton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUIStore } from '@/store/ui.store';
import { LoadingSpinner } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils/cn';

export default function IndustryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toggleSidebar } = useUIStore();
  const t = useTranslations('navigation');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  if (!user) {
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
          
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
