/**
 * Rotas canônicas do sistema CAVA
 * Com a nova estrutura, todas as rotas já são canônicas (sem prefixos internos).
 * Esta função é mantida para compatibilidade, mas apenas valida e retorna o pathname.
 */
export function toCanonicalPath(pathname: string): string {
  if (!pathname.startsWith('/')) return '/dashboard';
  return pathname;
}

/**
 * Rotas disponíveis por role
 */
export const routesByRole: Record<string, string[]> = {
  ADMIN_INDUSTRIA: [
    '/dashboard',
    '/catalog',
    '/inventory',
    '/brokers',
    '/sales',
    '/team',
    '/links',
    '/leads',
  ],
  VENDEDOR_INTERNO: [
    '/dashboard',
    '/inventory',
    '/sales',
    '/links',
    '/leads',
  ],
  BROKER: [
    '/dashboard',
    '/shared-inventory',
    '/links',
    '/leads',
  ],
};

/**
 * Verifica se uma role pode acessar uma rota
 */
export function canRoleAccessRoute(role: string, pathname: string): boolean {
  const routes = routesByRole[role];
  if (!routes) return false;
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Retorna a rota de dashboard para uma role
 * @param role - A role do usuário (reservado para uso futuro com dashboards específicos)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getDashboardForRole(role: string): string {
  return '/dashboard';
}
