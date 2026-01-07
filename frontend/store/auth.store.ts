import { create } from 'zustand';
import type { User, UserRole } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

const setReadableAuthCookies = (user: User | null) => {
  if (typeof document === 'undefined') return;

  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  const base = `; Path=/; SameSite=Strict${secureFlag}`;

  if (user?.role) {
    document.cookie = `user_role=${encodeURIComponent(user.role)}${base}`;
  } else {
    document.cookie = `user_role=; Expires=Thu, 01 Jan 1970 00:00:00 GMT${base}`;
  }

  if (user?.industryId) {
    document.cookie = `industry_id=${encodeURIComponent(user.industryId)}${base}`;
  } else {
    document.cookie = `industry_id=; Expires=Thu, 01 Jan 1970 00:00:00 GMT${base}`;
  }
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    setUser: (user) => {
      setReadableAuthCookies(user);
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
    },

    login: async (email: string, password: string) => {
      try {
        set({ isLoading: true });

        const response = await apiClient.post<{
          user: User;
          role: UserRole;
        }>('/auth/login', { email, password }, { skipAuthRetry: true });

        setReadableAuthCookies(response.user);

        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        setReadableAuthCookies(null);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        throw error;
      }
    },

    logout: async () => {
      try {
        await apiClient.post('/auth/logout', undefined, { skipAuthRetry: true });
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        setReadableAuthCookies(null);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    },

    refreshSession: async () => {
      try {
        set({ isLoading: true });

        const response = await apiClient.post<{
          user: User;
        }>('/auth/refresh', undefined, { skipAuthRetry: true });

        setReadableAuthCookies(response.user);

        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        setReadableAuthCookies(null);
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        throw error;
      }
    },

    hasPermission: (requiredRole: UserRole | UserRole[]) => {
      const { user } = get();
      if (!user) return false;

      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      return roles.includes(user.role);
    },
  })
);