/**
 * Typed environment loader for the Next.js app shell.
 *
 * Validates only what the Next.js process needs at boot (app origin, session
 * secret, Convex client config, build metadata). Storage and email env vars
 * live on the Convex deployment — see `convex/storage/actions.ts` and
 * `convex/email/actions.ts` — and are optional there (dev mocks when unset).
 *
 * Edge runtime note: `middleware.ts` runs on the Edge and may read only
 * `process.env.APP_ORIGIN` and `process.env.PROXY_ORIGIN` directly; do not
 * import this module from middleware.
 */
import { z } from 'zod';

const appSchema = z.object({
  APP_ORIGIN: z.string().url('APP_ORIGIN must be a valid URL'),
  PROXY_ORIGIN: z
    .string()
    .url('PROXY_ORIGIN must be a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const convexSchema = z.object({
  CONVEX_DEPLOYMENT: z.string().optional().default(''),
  CONVEX_DEPLOY_KEY: z.string().optional().default(''),
  // Server-only URL used by lib/convex/client.ts when NEXT_PUBLIC_CONVEX_URL
  // is not set (e.g. payment webhooks).
  CONVEX_DEPLOYMENT_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

const sessionSchema = z.object({
  SESSION_SECRET: z
    .string()
    .min(
      32,
      'SESSION_SECRET must be at least 32 characters (generate with `openssl rand -base64 32`)',
    ),
});

const buildSchema = z.object({
  GIT_SHA: z.string().optional().default('dev'),
  BUILT_AT: z.string().optional().default(''),
});

const envSchema = appSchema.merge(convexSchema).merge(sessionSchema).merge(buildSchema);

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * Validate and return the typed env object. Crashes the process on failure.
 * Lazy + memoized so unit tests can mutate `process.env` between calls
 * (reset via `resetEnvForTesting`).
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    const message = `Invalid environment configuration:\n${issues}`;
    // eslint-disable-next-line no-console
    console.error(`\n❌ ${message}\n`);
    throw new Error(message);
  }
  cached = Object.freeze(parsed.data);
  return cached;
}

/** Eagerly validate (called once at app boot). */
export function loadEnv(): Env {
  return getEnv();
}

/** Test helper: forget the cached env so the next `getEnv()` re-reads `process.env`. */
export function resetEnvForTesting(): void {
  cached = undefined;
}
