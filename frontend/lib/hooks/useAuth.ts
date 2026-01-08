import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/lib/types';
import { canRoleAccessRoute } from '@/lib/utils/routes';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    login,
    logout,
    refreshSession,
    hasPermission,
  } = useAuthStore();

  const hasAttemptedRefresh = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // Only attempt refresh once per mount when loading
    if (isLoading && !hasAttemptedRefresh.current) {
      hasAttemptedRefresh.current = true;
      refreshSession().catch(() => {
        if (isMounted) {
          setUser(null);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isLoading, refreshSession, setUser]);

  const checkPermission = (requiredRole: UserRole | UserRole[]): boolean => {
    return hasPermission(requiredRole);
  };

  const isAdmin = (): boolean => {
    return hasPermission('ADMIN_INDUSTRIA');
  };

  const isBroker = (): boolean => {
    return hasPermission('BROKER');
  };

  const isSeller = (): boolean => {
    return hasPermission('VENDEDOR_INTERNO');
  };

  const canAccessRoute = (route: string): boolean => {
    if (!user) return false;
    return canRoleAccessRoute(user.role, route);
  };

  const getDashboardRoute = (): string => {
    if (!user) return '/login';

    switch (user.role) {
      case 'ADMIN_INDUSTRIA':
      case 'VENDEDOR_INTERNO':
        return '/dashboard';
      case 'BROKER':
        return '/dashboard';
      default:
        return '/login';
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshSession,
    hasPermission: checkPermission,
    isAdmin,
    isBroker,
    isSeller,
    canAccessRoute,
    getDashboardRoute,
  };
}