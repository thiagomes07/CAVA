'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { BrokerDashboard, IndustryDashboard, SellerDashboard } from '@/components/dashboard';
import { LoadingSpinner } from '@/components/shared/LoadingState';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isBroker, isSeller } = useAuth();

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
    // Will redirect in useEffect
    return null;
  }

  // Render different dashboard based on user role
  if (isBroker()) {
    return <BrokerDashboard />;
  }

  if (isSeller()) {
    return <SellerDashboard />;
  }

  // Default: Industry dashboard (ADMIN_INDUSTRIA)
  return <IndustryDashboard />;
}