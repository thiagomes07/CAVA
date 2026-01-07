import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { UserRole } from '@/lib/types';
import { canRoleAccessRoute, getDashboardForRole, routesByRole } from '@/lib/utils/routes';

// Rotas de autenticação (públicas)
const authRoutes = ['/login'];

// Prefixos de rotas públicas
const publicPrefixes = ['/api/public', '/_next', '/static', '/favicon.ico', '/privacy'];

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
    BROKER: '/shared-inventory', // Broker vê shared-inventory ao invés de inventory
  },
};

const allowedRoles: UserRole[] = ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'];

function isAuthRoute(pathname: string): boolean {
  return authRoutes.includes(pathname);
}

function isPublicRoute(pathname: string): boolean {
  if (isAuthRoute(pathname)) return true;
  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) return true;

  // Rotas públicas de landing page: /[slug]
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const top = `/${segments[0]}`;
    const isReserved = [...reservedPrefixes, '/api'].some((p) => top === p || top.startsWith(`${p}/`));
    if (!isReserved) return true;
  }

  return false;
}

function getRedirectForRole(pathname: string, role: string): string | null {
  // Verificar se há redirecionamento específico para esta rota/role
  for (const [route, redirects] of Object.entries(roleBasedRedirects)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const redirect = redirects[role];
      if (redirect && redirect !== pathname) {
        // Substituir a base da rota pelo redirecionamento
        return pathname.replace(route, redirect);
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
  // Keep skew minimal to avoid accepting expired tokens
  const SKEW_SECONDS = 5;
  return payload.exp <= nowSeconds + SKEW_SECONDS;
}

async function attemptRefresh(request: NextRequest, pathname: string) {
  const refreshCookie = request.cookies.get('refresh_token');

  if (!refreshCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Encaminha apenas o refresh_token necessário para o endpoint de refresh
      Cookie: `refresh_token=${encodeURIComponent(refreshCookie.value)}`,
    },
    credentials: 'include',
  });

  if (!refreshResponse.ok) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirecionar de volta para aplicar os novos cookies
  const redirectUrl = request.nextUrl.clone();
  const response = NextResponse.redirect(redirectUrl);

  const setCookieHeader = refreshResponse.headers.get('set-cookie');
  if (setCookieHeader) {
    response.headers.set('set-cookie', setCookieHeader);
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('access_token')?.value;
  const rawRole = request.cookies.get('user_role')?.value;
  const userRole = allowedRoles.includes(rawRole as UserRole) ? (rawRole as UserRole) : null;

  // Rotas de auth são públicas, mas redireciona se já autenticado
  if (isAuthRoute(pathname)) {
    if (accessToken && userRole) {
      const dashboardUrl = getDashboardForRole(userRole);
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
    return NextResponse.next();
  }

  // Rotas públicas - permitir acesso
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Sem token ou token expirado - tentar refresh ou redirecionar para login
  if (!accessToken || isTokenExpired(accessToken)) {
    try {
      return await attemptRefresh(request, pathname);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Token refresh error:', error);
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Sem role definida ou divergente do token - redirecionar para login
  const tokenPayload = accessToken ? decodeJwt(accessToken) : null;
  const tokenRole = tokenPayload?.role as UserRole | undefined;

  // Always trust the role inside the signed token over the readable cookie to avoid tampering
  const effectiveRole = tokenRole && allowedRoles.includes(tokenRole) ? tokenRole : userRole;

  if (!effectiveRole || (tokenRole && tokenRole !== effectiveRole)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar redirecionamento baseado em role (ex: broker acessando /inventory vai para /shared-inventory)
  const redirect = getRedirectForRole(pathname, effectiveRole);
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // Verificar permissão de acesso
  if (!canRoleAccessRoute(effectiveRole, pathname)) {
    // Sem permissão - redirecionar para dashboard
    const dashboardUrl = effectiveRole ? getDashboardForRole(effectiveRole) : '/login';
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};