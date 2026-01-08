'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Routes where the back button should not appear
const AUTH_ROUTES = [
  '/login',
  '/signin',
  '/signup',
  '/register',
  '/auth',
  '/forgot-password',
  '/reset-password',
];

// Root/landing routes where back button shouldn't show
const ROOT_ROUTES = [
  '/dashboard',
];

interface BackButtonProps {
  className?: string;
}

// Custom hook to check if we have history
function useHasHistory() {
  return useSyncExternalStore(
    // Subscribe - no-op since history length doesn't change dynamically in a way we can subscribe to
    () => () => {},
    // Get client snapshot
    () => window.history.length > 1,
    // Get server snapshot
    () => false
  );
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHistory = useHasHistory();

  // Determine if we should show the back button based on route
  const shouldShowByRoute = useMemo(() => {
    const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
    const isRootRoute = ROOT_ROUTES.includes(pathname);
    return !isAuthRoute && !isRootRoute;
  }, [pathname]);

  const canGoBack = hasHistory && shouldShowByRoute;

  const handleBack = useCallback(() => {
    // Use router.back() which is Next.js's way of going back
    router.back();
  }, [router]);

  if (!canGoBack) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'inline-flex items-center justify-center',
        'w-9 h-9 min-w-[44px] min-h-[44px]', // Touch target with smaller visual size
        'rounded-sm transition-colors duration-200',
        'text-slate-400 hover:text-obsidian',
        'focus:outline-none focus:ring-2 focus:ring-obsidian/10',
        className
      )}
      aria-label="Voltar para página anterior"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
