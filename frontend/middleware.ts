import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas de autenticação (públicas)
const authRoutes = ['/login'];

// Prefixos de rotas públicas
const publicPrefixes = ['/api/public', '/_next', '/static', '/favicon.ico', '/privacy'];

// Rotas protegidas e suas permissões por role
const routePermissions: Record<string, string[]> = {
  // Industry routes (ADMIN_INDUSTRIA e VENDEDOR_INTERNO)
  '/dashboard': ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  '/catalog': ['ADMIN_INDUSTRIA'],
  '/inventory': ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  '/brokers': ['ADMIN_INDUSTRIA'],
  '/sales': ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  '/team': ['ADMIN_INDUSTRIA'],
  '/links': ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  '/leads': ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  // Broker-only routes
  '/shared-inventory': ['BROKER'],
};

// Rotas que requerem redirecionamento baseado em role
const roleBasedRedirects: Record<string, Record<string, string>> = {
  '/dashboard': {
    'ADMIN_INDUSTRIA': '/dashboard',
    'VENDEDOR_INTERNO': '/dashboard',
    'BROKER': '/dashboard',
  },
  '/inventory': {
    'ADMIN_INDUSTRIA': '/inventory',
    'VENDEDOR_INTERNO': '/inventory',
    'BROKER': '/shared-inventory', // Broker vê shared-inventory ao invés de inventory
  },
};

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
    const reservedPrefixes = Object.keys(routePermissions);
    const isReserved = [...reservedPrefixes, '/api'].some((p) => top === p || top.startsWith(`${p}/`));
    if (!isReserved) return true;
  }

  return false;
}

function getDashboardForRole(role: string): string {
  return '/dashboard';
}

function canAccessRoute(pathname: string, role: string): boolean {
  // Encontrar a rota base que corresponde ao pathname
  for (const [route, allowedRoles] of Object.entries(routePermissions)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return allowedRoles.includes(role);
    }
  }
  // Se não encontrar regra específica, permitir (para rotas não protegidas)
  return true;
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

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

  // Sem token - tentar refresh ou redirecionar para login
  if (!accessToken) {
    try {
      const refreshToken = request.cookies.get('refresh_token')?.value;
      
      if (!refreshToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `refresh_token=${refreshToken}`,
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
    } catch (error) {
      console.error('Token refresh error:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Sem role definida - redirecionar para login
  if (!userRole) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar redirecionamento baseado em role (ex: broker acessando /inventory vai para /shared-inventory)
  const redirect = getRedirectForRole(pathname, userRole);
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // Verificar permissão de acesso
  if (!canAccessRoute(pathname, userRole)) {
    // Sem permissão - redirecionar para dashboard
    const dashboardUrl = getDashboardForRole(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};