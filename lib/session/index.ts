/**
 * iron-session helpers for CC Verse.
 *
 * Cookie-based sessions using iron-session v8. The session cookie is:
 *   - httpOnly  (never exposed to JS)
 *   - secure    (HTTPS only in production)
 *   - sameSite=strict  (no cross-site reads)
 *   - __Host- prefix  (cookie must come from the app origin, not a subdomain)
 *
 * Session payload shape:
 *   { userId, role, mfaPassed, ip, userAgent }
 */

import { getIronSession } from 'iron-session';
import type { SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { getEnv } from '@/lib/env';

// Extend the iron-session SessionData type to match our payload
export interface SessionData {
  userId?: string;
  role?: string;
  mfaPassed?: boolean;
  ip?: string;
  userAgent?: string;
}

const COOKIE_NAME = 'ccverse_session';

function getSessionOptions(): SessionOptions {
  const env = getEnv();
  return {
    password: env.SESSION_SECRET,
    cookieName: COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      // Do NOT set domain — __Host- prefix requires no domain
    },
  };
}

/**
 * Get the current session from incoming request cookies.
 * Use in Server Components and Route Handlers (not client components).
 */
export async function getSession(): Promise<{
  session: SessionData;
  save: () => Promise<void>;
}> {
  const session = await getIronSession<SessionData>(await cookies(), getSessionOptions());
  return {
    session,
    save: async () => {
      await session.save();
    },
  };
}

/**
 * Destructure the return value of getSession() for convenience.
 */
export async function getSessionData(): Promise<SessionData> {
  const { session } = await getSession();
  return session;
}

/**
 * Destructure the save function from getSession().
 */
export async function getSessionSave(): Promise<() => Promise<void>> {
  const { save } = await getSession();
  return save;
}
