'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { BrokerDashboard } from '@/components/dashboard';
import { LoadingSpinner } from '@/components/shared/LoadingState';

export default function BrokerDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isBroker } = useAuth();

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

  if (!user || !isBroker()) {
    return null;
  }

  return <BrokerDashboard />;
}
