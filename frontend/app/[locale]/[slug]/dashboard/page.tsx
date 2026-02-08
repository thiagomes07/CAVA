'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { IndustryDashboard, SellerDashboard } from '@/components/dashboard';
import { LoadingSpinner } from '@/components/shared/LoadingState';

export default function SlugDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isSeller } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

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

  // Render dashboard based on user role (only ADMIN_INDUSTRIA or VENDEDOR_INTERNO should reach here)
  if (isSeller()) {
    return <SellerDashboard />;
  }

  // Default: Industry dashboard (ADMIN_INDUSTRIA)
  return <IndustryDashboard />;
}
