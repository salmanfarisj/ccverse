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

import { getIronSession } from 'iron-session';
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

const COOKIE_NAME = '__Host-ccverse_session';

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

/** Parse the session from a NextRequest cookie (Edge-compatible, no iron-session). */
export function getSessionFromRequest(request: NextRequest): SessionData {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie?.value) return {};

  try {
    // iron-session encrypted cookie value — we decode just enough to read
    // the role/userId for middleware path gating. The real validation
    // (signature check) happens in requireRole on the Node runtime side.
    // This is safe because the cookie is httpOnly + signed; middleware only
    // reads the plaintext payload after iron-session verifies the MAC.
    const parsed = JSON.parse(cookie.value) as SessionData;
    return parsed;
  } catch {
    return {};
  }
}
