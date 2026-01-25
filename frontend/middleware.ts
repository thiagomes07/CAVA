import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { UserRole } from '@/lib/types';
import { canRoleAccessRoute, getDashboardForRole, routesByRole } from '@/lib/utils/routes';
import { routing, locales, defaultLocale, type Locale } from '@/i18n/routing';

// Rotas de autenticação (públicas)
const authRoutes = ['/login'];

// Prefixos de rotas públicas
const publicPrefixes = ['/api/public', '/_next', '/static', '/favicon.ico', '/privacy', '/catalogo'];

// Prefixos reservados (rotas internas) derivados do mapa de permissões
const reservedPrefixes = Array.from(
  new Set(Object.values(routesByRole).flatMap((routes) => routes.map((route) => route.split('/')[1])).filter(Boolean))
).map((segment) => `/${segment}`);

// Rotas que requerem redirecionamento baseado em role
const roleBasedRedirects: Record<string, Record<string, string>> = {
  '/dashboard': {
    ADMIN_INDUSTRIA: '/dashboard',
    VENDEDOR_INTERNO: '/dashboard',
    BROKER: '/dashboard',
  },
  '/inventory': {
    ADMIN_INDUSTRIA: '/inventory',
    VENDEDOR_INTERNO: '/inventory',
    BROKER: '/shared-inventory',
  },
};

const allowedRoles: UserRole[] = ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'];

// Create the next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Cookie name for user's language preference
const LOCALE_COOKIE = 'NEXT_LOCALE';

function getLocaleFromPath(pathname: string): Locale | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
    return segments[0] as Locale;
  }
  return null;
}

function stripLocaleFromPath(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    const segments = pathname.split('/').filter(Boolean);
    segments.shift(); // Remove locale
    return '/' + segments.join('/') || '/';
  }
  return pathname;
}

function addLocaleToPath(pathname: string, locale: Locale): string {
  // Don't add locale prefix for default locale with 'as-needed' strategy
  if (locale === defaultLocale) {
    return pathname;
  }
  return `/${locale}${pathname === '/' ? '' : pathname}`;
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.includes(pathname);
}

function isPublicRoute(pathname: string): boolean {
  if (isAuthRoute(pathname)) return true;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;

  // Rotas públicas de landing page: /[slug] ou /catalogo/[slug]
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const top = `/${segments[0]}`;
    const isReserved = [...reservedPrefixes, '/api'].some((p) => top === p || top.startsWith(`${p}/`));
    if (!isReserved) return true;
  }
  
  // Rotas de catálogo público: /catalogo/[slug]
  if (pathname.startsWith('/catalogo/')) return true;

  return false;
}

function getRedirectForRole(pathname: string, role: string): string | null {
  for (const [route, redirects] of Object.entries(roleBasedRedirects)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const redirect = redirects[role];
      if (!redirect) continue;

      // Avoid no-op redirects (e.g., ADMIN_INDUSTRIA -> /inventory stays /inventory)
      if (redirect === route) continue;

      const redirectPath = pathname.replace(route, redirect);
      if (redirectPath !== pathname) {
        return redirectPath;
      }
    }
  }
  return null;
}

function decodeJwt(token: string): { exp?: number; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = typeof atob === 'function'
      ? atob(payload)
      : typeof Buffer !== 'undefined'
        ? Buffer.from(payload, 'base64').toString('utf8')
        : '';
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const SKEW_SECONDS = 5;
  return payload.exp <= nowSeconds + SKEW_SECONDS;
}

async function attemptRefresh(request: NextRequest, pathname: string, locale: Locale) {
  const refreshCookie = request.cookies.get('refresh_token');

  if (!refreshCookie) {
    const loginUrl = new URL(addLocaleToPath('/login', locale), request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `refresh_token=${encodeURIComponent(refreshCookie.value)}`,
    },
    credentials: 'include',
  });

  if (!refreshResponse.ok) {
    const loginUrl = new URL(addLocaleToPath('/login', locale), request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const redirectUrl = request.nextUrl.clone();
  const response = NextResponse.redirect(redirectUrl);

  const setCookieHeader = refreshResponse.headers.get('set-cookie');
  if (setCookieHeader) {
    response.headers.set('set-cookie', setCookieHeader);
  }

  return response;
}

function getPreferredLocale(request: NextRequest): Locale {
  // 1. Check cookie first (user's explicit choice)
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return localeCookie as Locale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map((lang) => {
      const [code, priority] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(),
        priority: priority ? parseFloat(priority) : 1,
      };
    });

    languages.sort((a, b) => b.priority - a.priority);

    for (const { code } of languages) {
      if (code === 'pt') return 'pt';
      if (code === 'en') return 'en';
      if (code === 'es') return 'es';
    }
  }

  // 3. Default to Portuguese
  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Extract locale from path or determine from headers/cookie
  const pathLocale = getLocaleFromPath(pathname);
  const preferredLocale = getPreferredLocale(request);
  const currentLocale = pathLocale || preferredLocale;
  
  // Get the pathname without locale
  const pathnameWithoutLocale = stripLocaleFromPath(pathname);

  // Handle i18n first - let next-intl handle locale routing
  const intlResponse = intlMiddleware(request);
  
  // If next-intl wants to redirect (e.g., to add locale prefix), follow that
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const rawRole = request.cookies.get('user_role')?.value;
  const userRole = allowedRoles.includes(rawRole as UserRole) ? (rawRole as UserRole) : null;
  const hasValidAccessToken = !!accessToken && !isTokenExpired(accessToken);

  // Auth routes are public, but redirect if already authenticated
  if (isAuthRoute(pathnameWithoutLocale)) {
    // Allow access to login when the access token is missing or expired to avoid redirect loops
    if (hasValidAccessToken && userRole) {
      const dashboardUrl = getDashboardForRole(userRole);
      const redirectUrl = new URL(addLocaleToPath(dashboardUrl, currentLocale), request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return intlResponse;
  }

  // Public routes - allow access
  if (isPublicRoute(pathnameWithoutLocale)) {
    return intlResponse;
  }

  // No token or expired token - try refresh or redirect to login
  if (!hasValidAccessToken) {
    try {
      return await attemptRefresh(request, pathnameWithoutLocale, currentLocale);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Token refresh error:', error);
      }
      const loginUrl = new URL(addLocaleToPath('/login', currentLocale), request.url);
      loginUrl.searchParams.set('callbackUrl', pathnameWithoutLocale);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Verify role from token
  const tokenPayload = accessToken ? decodeJwt(accessToken) : null;
  const tokenRole = tokenPayload?.role as UserRole | undefined;
  const effectiveRole = tokenRole && allowedRoles.includes(tokenRole) ? tokenRole : userRole;

  if (!effectiveRole || (tokenRole && tokenRole !== effectiveRole)) {
    const loginUrl = new URL(addLocaleToPath('/login', currentLocale), request.url);
    loginUrl.searchParams.set('callbackUrl', pathnameWithoutLocale);
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based redirects
  const redirect = getRedirectForRole(pathnameWithoutLocale, effectiveRole);
  if (redirect) {
    const redirectUrl = new URL(addLocaleToPath(redirect, currentLocale), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Check access permission
  if (!canRoleAccessRoute(effectiveRole, pathnameWithoutLocale)) {
    const dashboardUrl = effectiveRole ? getDashboardForRole(effectiveRole) : '/login';
    const redirectUrl = new URL(addLocaleToPath(dashboardUrl, currentLocale), request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};