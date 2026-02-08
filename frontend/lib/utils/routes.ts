import type { UserRole } from "@/lib/types";

/**
 * Rotas canônicas do sistema CAVA
 * Com a nova estrutura, todas as rotas já são canônicas (sem prefixos internos).
 * Esta função é mantida para compatibilidade, mas apenas valida e retorna o pathname.
 */
export function toCanonicalPath(pathname: string): string {
  if (!pathname.startsWith("/")) return "/dashboard";
  return pathname;
}

type RoleRouteMap = Record<UserRole, string[]>;

/**
 * Rotas disponíveis por role (bases; rotas filhas são cobertas via prefixo)
 * Para ADMIN_INDUSTRIA e VENDEDOR_INTERNO, as rotas são relativas ao slug da empresa
 */
export const routesByRole: RoleRouteMap = {
  SUPER_ADMIN: ["/admin", "/admin/industries"],
  ADMIN_INDUSTRIA: [
    "/dashboard",
    "/portfolio",
    "/inventory",
    "/brokers",
    "/sales",
    "/reservations",
    "/bi",
    "/team",
    "/links",
    "/catalogos",
    "/clientes",
    "/industry-config",
    "/profile",
  ],
  VENDEDOR_INTERNO: [
    "/dashboard",
    "/inventory",
    "/sales",
    "/reservations",
    "/links",
    "/catalogos",
    "/clientes",
    "/profile",
  ],
  BROKER: [
    "/dashboard",
    "/shared-inventory",
    "/shared-portfolios",
    "/reservations",
    "/broker-sales",
    "/links",
    "/catalogos",
    "/clientes",
    "/profile",
  ],
};

/**
 * Rotas reservadas que não são slugs de empresas
 */
export const reservedPaths = [
  "admin",
  "login",
  "forgot-password",
  "privacy",
  "catalogo",
  "deposito",
  "portfolio",
  "api",
];

/**
 * Verifica se um segmento de URL é um slug de empresa (não é rota reservada)
 */
export function isIndustrySlug(segment: string): boolean {
  return !reservedPaths.includes(segment.toLowerCase());
}

/**
 * Extrai o slug da empresa de um pathname
 * Retorna null se não houver slug (ex: /admin, /login)
 */
export function extractSlugFromPath(pathname: string): string | null {
  // Remove locale prefix se existir
  const segments = pathname.split("/").filter(Boolean);

  // Ignora locale (pt, en, es)
  const locales = ["pt", "en", "es"];
  let startIndex = 0;
  if (segments.length > 0 && locales.includes(segments[0])) {
    startIndex = 1;
  }

  // Verifica se o primeiro segmento após locale é um slug
  if (segments.length > startIndex) {
    const possibleSlug = segments[startIndex];
    if (isIndustrySlug(possibleSlug)) {
      return possibleSlug;
    }
  }

  return null;
}

/**
 * Constrói uma rota com o slug da empresa
 */
export function buildSlugRoute(slug: string, path: string): string {
  // Remove barra inicial do path se existir
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/${slug}/${cleanPath}`;
}

/**
 * Remove o slug de uma rota, retornando apenas a rota base
 */
export function removeSlugFromPath(pathname: string, slug: string): string {
  const pattern = new RegExp(`^/${slug}(/|$)`);
  return pathname.replace(pattern, "/");
}

/**
 * Verifica se uma role pode acessar uma rota
 * Para ADMIN/VENDEDOR, considera que a rota já foi extraída sem o slug
 */
export function canRoleAccessRoute(role: UserRole, pathname: string): boolean {
  const routes = routesByRole[role];
  if (!routes) return false;
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Retorna a rota de dashboard para uma role
 * Para ADMIN/VENDEDOR, precisa do slug para construir a rota completa
 */
export function getDashboardForRole(role: UserRole, slug?: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/admin";
    case "ADMIN_INDUSTRIA":
    case "VENDEDOR_INTERNO":
      return slug ? `/${slug}/dashboard` : "/dashboard";
    case "BROKER":
      return "/dashboard";
    default:
      return "/login";
  }
}

/**
 * Verifica se a role precisa de slug nas rotas
 */
export function roleRequiresSlug(role: UserRole): boolean {
  return role === "ADMIN_INDUSTRIA" || role === "VENDEDOR_INTERNO";
}
