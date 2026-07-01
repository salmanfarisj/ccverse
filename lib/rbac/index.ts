/**
 * RBAC helpers for CC Verse.
 *
 * `requireRole` is the primary guard — call it at the top of every
 * route handler / server action that requires authentication.
 *
 * It:
 *   - Returns 401 if no session or no userId
 *   - Returns 403 if the session role is not in the allowed list
 *   - Throws NEVER on success (control never reaches the next line)
 *
 * The five roles are: BUYER, SELLER, AUDITOR, ADMIN.
 * "public" is not a role value — it is the absence of a session.
 */

import { getIronSession, unsealData } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnv } from '@/lib/env';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Role = 'BUYER' | 'SELLER' | 'AUDITOR' | 'ADMIN';

export interface SessionData {
  userId?: string;
  role?: string;
  mfaPassed?: boolean;
  ip?: string;
  userAgent?: string;
}

// ─── requireRole ─────────────────────────────────────────────────────────────

const COOKIE_NAME = 'ccverse_session';

/**
 * Guard a route handler or server action.
 *
 * @param allowed  - Roles that may access this route.
 * @returns The session data — only reached when the caller is authorised.
 * @throws  NextResponse 401 (no session) or 403 (wrong role).
 */
export async function requireRole(allowed: Role[]): Promise<SessionData> {
  const env = getEnv();
  const session = await getIronSession<SessionData>(await cookies(), {
    password: env.SESSION_SECRET,
    cookieName: COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    },
  });

  if (!session.userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.role as Role | undefined;
  if (!role || !allowed.includes(role)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return session;
}

// ─── middleware helper (used by middleware.ts) ───────────────────────────────

/**
 * Parse the session from a NextRequest cookie on the Edge.
 *
 * Uses iron-session's `unsealData` to decrypt the cookie value so we can
 * read userId and role for middleware path gating. The full signature
 * verification is done by getIronSession in requireRole (Node runtime).
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData> {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return {};

  try {
    const env = getEnv();
    const data = await unsealData<SessionData>(cookie.value, {
      password: env.SESSION_SECRET,
    });
    return data ?? {};
  } catch {
    return {};
  }
}
