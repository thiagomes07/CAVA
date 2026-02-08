'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Sidebar } from '@/components/shared/Sidebar';
import { BackButton } from '@/components/shared/BackButton';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useAuth } from '@/lib/hooks/useAuth';
import { useUIStore } from '@/store/ui.store';
import { LoadingSpinner } from '@/components/shared/LoadingState';
import { cn } from '@/lib/utils/cn';
import { reservedPaths } from '@/lib/utils/routes';

interface SlugLayoutProps {
  children: React.ReactNode;
}

export default function SlugLayout({ children }: SlugLayoutProps) {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { toggleSidebar } = useUIStore();
  const t = useTranslations('navigation');
  const [isValidating, setIsValidating] = useState(true);

  // Verificar se é uma rota reservada (não deveria chegar aqui, mas por segurança)
  const isReservedPath = reservedPaths.includes(slug.toLowerCase());

  useEffect(() => {
    // Se for rota reservada, deixar o Next.js lidar com 404
    if (isReservedPath) {
      setIsValidating(false);
      return;
    }

    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!isLoading && user) {
      // Verificar se usuário tem acesso a esta empresa
      const userRole = user.role;
      const userSlug = user.industrySlug;

      // SUPER_ADMIN não deveria estar aqui
      if (userRole === 'SUPER_ADMIN') {
        router.push('/admin');
        return;
      }

      // BROKER não deveria estar aqui
      if (userRole === 'BROKER') {
        router.push('/dashboard');
        return;
      }

      // ADMIN_INDUSTRIA e VENDEDOR_INTERNO - verificar slug
      // Se não tem slug definido ou o slug é o correto, permitir acesso
      if (!userSlug || userSlug === slug) {
        setIsValidating(false);
        return;
      }

      // Slug incorreto - redirecionar
      router.push(`/${userSlug}/dashboard`);
    }
  }, [user, isLoading, router, slug, isReservedPath]);

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

  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

  if (!user || isReservedPath) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-mineral">
        <Sidebar currentSlug={slug} />
        
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
