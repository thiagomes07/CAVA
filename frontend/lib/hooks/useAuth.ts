import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/lib/types';

export function useAuth() {
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

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      refreshSession().catch(() => {
        setUser(null);
      });
    }
  }, [isAuthenticated, isLoading, refreshSession, setUser]);

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

    if (route.startsWith('/dashboard') || route.startsWith('/catalog') || route.startsWith('/inventory') || route.startsWith('/brokers') || route.startsWith('/sales') || route.startsWith('/team')) {
      return hasPermission(['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO']);
    }

    if (route.startsWith('/shared-inventory')) {
      return hasPermission('BROKER');
    }

    if (route.startsWith('/links') || route.startsWith('/leads')) {
      return hasPermission(['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER']);
    }

    return true;
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