import { create } from 'zustand';
import type { User, UserRole } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

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
          }>('/auth/login', { email, password });

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
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
          await apiClient.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
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
          }>('/auth/refresh');

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
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