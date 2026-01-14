import type { UserRole } from '@/lib/types';

/**
 * Rotas canônicas do sistema CAVA
 * Com a nova estrutura, todas as rotas já são canônicas (sem prefixos internos).
 * Esta função é mantida para compatibilidade, mas apenas valida e retorna o pathname.
 */
export function toCanonicalPath(pathname: string): string {
  if (!pathname.startsWith('/')) return '/dashboard';
  return pathname;
}

type RoleRouteMap = Record<UserRole, string[]>;

/**
 * Rotas disponíveis por role (bases; rotas filhas são cobertas via prefixo)
 */
export const routesByRole: RoleRouteMap = {
  ADMIN_INDUSTRIA: [
    '/dashboard',
    '/catalog',
    '/inventory',
    '/brokers',
    '/sales',
    '/team',
    '/links',
    '/clientes',
  ],
  VENDEDOR_INTERNO: [
    '/dashboard',
    '/inventory',
    '/sales',
    '/links',
    '/clientes',
  ],
  BROKER: [
    '/dashboard',
    '/shared-inventory',
    '/links',
    '/clientes',
  ],
};

/**
 * Verifica se uma role pode acessar uma rota
 */
export function canRoleAccessRoute(role: UserRole, pathname: string): boolean {
  const routes = routesByRole[role];
  if (!routes) return false;
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Retorna a rota de dashboard para uma role (permite especializar futuramente)
 */
export function getDashboardForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN_INDUSTRIA':
    case 'VENDEDOR_INTERNO':
    case 'BROKER':
      return '/dashboard';
    default:
      return '/login';
  }
}
