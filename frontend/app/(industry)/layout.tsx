'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/shared/Sidebar';
import { Header } from '@/components/shared/Header';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useAuth } from '@/lib/hooks/useAuth';
import { LoadingSpinner } from '@/components/shared/LoadingState';

export default function IndustryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (!isLoading && user && !hasPermission(['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'])) {
      router.push('/broker/dashboard');
    }
  }, [user, isLoading, hasPermission, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user || !hasPermission(['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'])) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-mineral">
        <Sidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          
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