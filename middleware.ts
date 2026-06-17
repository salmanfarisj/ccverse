/**
 * CC Verse — Next.js Middleware.
 *
 * Path gating based on session role:
 *
 *   public   → /, /listing/[id], /verify/[serial], /health
 *   buyer    → /buyer, /api/buyer/*
 *   seller   → /seller, /api/seller/*
 *   auditor  → /auditor, /api/auditor/*
 *   admin    → /admin, /api/admin/*
 *
 * Public paths pass through. Others redirect to /login (pages) or
 * return 401 JSON (API routes) when unauthenticated.
 *
 * NOTE: This middleware runs on the Edge. It reads the session cookie
 * directly to decide whether to allow the request to continue. The actual
 * session validation (signature verification) is done by iron-session
 * inside requireRole() in route handlers — the middleware is a first-pass
 * guard only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/rbac';

// Paths that require no authentication
const PUBLIC_PATHS = ['/', '/health', '/api/health', '/api/version'];

const PUBLIC_PREFIXES = [
  '/listing/',
  '/verify/',
  '/api/webhooks/',
  '/_next/',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

// Route → required role
const PROTECTED_ROUTES: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /^\/buyer(\/.*)?$/, role: 'BUYER' },
  { pattern: /^\/seller(\/.*)?$/, role: 'SELLER' },
  { pattern: /^\/auditor(\/.*)?$/, role: 'AUDITOR' },
  { pattern: /^\/admin(\/.*)?$/, role: 'ADMIN' },
  { pattern: /^\/api\/buyer(\/.*)?$/, role: 'BUYER' },
  { pattern: /^\/api\/seller(\/.*)?$/, role: 'SELLER' },
  { pattern: /^\/api\/auditor(\/.*)?$/, role: 'AUDITOR' },
  { pattern: /^\/api\/admin(\/.*)?$/, role: 'ADMIN' },
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Public paths: allow through
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Find if this path requires a specific role
  const route = PROTECTED_ROUTES.find((r) => r.pattern.test(pathname));
  if (!route) {
    // Not a protected route — allow (e.g. /api/public/*)
    return NextResponse.next();
  }

  // Read session from cookie (Edge-compatible, uses unsealData)
  const session = await getSessionFromRequest(request);
  if (!session?.userId) {
    // No session — redirect pages to /login, return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session exists but check role
  if (session.role !== route.role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Pages: redirect to home with a flash message
    const homeUrl = new URL('/', request.url);
    homeUrl.searchParams.set('err', 'forbidden');
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml (handled above via isPublicPath)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
