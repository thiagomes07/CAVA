import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register'];
const publicPrefixes = ['/api/public', '/_next', '/static', '/favicon.ico', '/privacy'];

// Routes that require authentication - using prefixed routes
const protectedPrefixes = [
  '/admin',   // Industry admin routes
  '/broker',  // Broker routes  
  '/seller',  // Seller routes
  '/profile',
];

const roleRouteMap: Record<string, string[]> = {
  ADMIN_INDUSTRIA: [
    '/admin/dashboard',
    '/admin/catalog',
    '/admin/inventory',
    '/admin/brokers',
    '/admin/sales',
    '/admin/team',
    '/admin/links',
    '/admin/leads',
  ],
  VENDEDOR_INTERNO: [
    '/admin/dashboard',
    '/admin/inventory',
    '/admin/sales',
    '/admin/links',
    '/admin/leads',
  ],
  BROKER: [
    '/broker/dashboard',
    '/broker/shared-inventory',
    '/broker/links',
    '/broker/leads',
  ],
};

const roleDashboards: Record<string, string> = {
  ADMIN_INDUSTRIA: '/admin/dashboard',
  VENDEDOR_INTERNO: '/admin/dashboard',
  BROKER: '/broker/dashboard',
};

function isPublicRoute(pathname: string): boolean {
  // Explicit public routes
  if (publicRoutes.includes(pathname)) return true;
  
  // Check public prefixes
  if (publicPrefixes.some(prefix => pathname.startsWith(prefix))) return true;
  
  // Check if it's a protected route
  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));
  
  // If not a protected route and is a single-segment path (like /my-link-slug), it's a public landing page
  if (!isProtected) {
    const segments = pathname.split('/').filter(Boolean);
    // Single segment paths that aren't protected are public (landing pages)
    if (segments.length === 1) return true;
  }
  
  return false;
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