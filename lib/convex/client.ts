/**
 * Server-side Convex HTTP client wrapper.
 *
 * `ConvexHttpClient` from `convex/browser` is the appropriate client
 * for server-side code (Next.js API routes, server components, scripts).
 * It is stateful (it carries credentials) so we memoize one instance
 * per Node process to avoid opening a new socket per request.
 *
 * URL resolution order:
 *   1. NEXT_PUBLIC_CONVEX_URL  — the browser/public deployment URL
 *                                 (also usable from the server).
 *   2. CONVEX_DEPLOYMENT_URL    — server-only fallback (Phase 5 / webhooks).
 *
 * In production these typically point to the same Convex deployment;
 * the duplication is so the server can call Convex over a private
 * network path while the browser uses the public deployment URL.
 *
 * Reset: `resetConvexClientForTesting()` clears the memoized client so
 * tests can mutate env vars and re-initialize.
 */

import { ConvexHttpClient } from 'convex/browser';

let cachedClient: ConvexHttpClient | undefined;
let cachedUrl: string | undefined;

function resolveConvexUrl(): string {
  const fromPublic = process.env['NEXT_PUBLIC_CONVEX_URL'];
  const fromServer = process.env['CONVEX_DEPLOYMENT_URL'];
  const url = fromPublic || fromServer;
  if (!url) {
    throw new Error(
      'Convex URL is not configured. Set NEXT_PUBLIC_CONVEX_URL (or CONVEX_DEPLOYMENT_URL) in your environment.',
    );
  }
  return url;
}

/**
 * Get the memoized `ConvexHttpClient` for the current Node process.
 * Throws if neither NEXT_PUBLIC_CONVEX_URL nor CONVEX_DEPLOYMENT_URL
 * is set in `process.env`.
 */
export function getConvexClient(): ConvexHttpClient {
  const url = resolveConvexUrl();
  if (cachedClient && cachedUrl === url) {
    return cachedClient;
  }
  cachedClient = new ConvexHttpClient(url);
  cachedUrl = url;
  return cachedClient;
}

/** Test helper: forget the memoized client so the next call rebuilds. */
export function resetConvexClientForTesting(): void {
  cachedClient = undefined;
  cachedUrl = undefined;
}
