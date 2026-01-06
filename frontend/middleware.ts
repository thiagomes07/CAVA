import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register'];
const publicPrefixes = ['/api/public', '/_next', '/static', '/favicon.ico'];

const roleRouteMap: Record<string, string[]> = {
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

const roleDashboards: Record<string, string> = {
  ADMIN_INDUSTRIA: '/dashboard',
  VENDEDOR_INTERNO: '/dashboard',
  BROKER: '/dashboard',
};

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  return publicPrefixes.some(prefix => pathname.startsWith(prefix));
}

function canAccessRoute(pathname: string, userRole: string): boolean {
  const allowedRoutes = roleRouteMap[userRole];
  if (!allowedRoutes) return false;

  return allowedRoutes.some(route => pathname.startsWith(route));
}

function getDashboardForRole(role: string): string {
  return roleDashboards[role] || '/login';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

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

      const response = NextResponse.next();
      
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

  if (!userRole) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && accessToken) {
    const dashboardUrl = getDashboardForRole(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  if (!canAccessRoute(pathname, userRole)) {
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