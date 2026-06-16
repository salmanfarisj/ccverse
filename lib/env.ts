/**
 * Typed environment loader.
 *
 * Reads `process.env` once at module load, validates it with zod, and exports
 * a frozen `env` object. If any required variable is missing or malformed,
 * the process crashes with a clear, actionable error — fail-fast at boot is
 * required by §4.11 of the phase-0 plan.
 *
 * Edge runtime note: `iron-session` and most third-party SDKs are Node-only,
 * so this module is only imported from Node-runtime code (API route
 * handlers, server components, scripts). The Next.js `middleware.ts` runs
 * on the Edge and may read only `process.env.APP_ORIGIN` and
 * `process.env.PROXY_ORIGIN` directly.
 */
import { z } from 'zod';

// Sub-schemas ────────────────────────────────────────────────────────────────

const appSchema = z.object({
  APP_ORIGIN: z.string().url('APP_ORIGIN must be a valid URL'),
  PROXY_ORIGIN: z
    .string()
    .url('PROXY_ORIGIN must be a valid URL')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const databaseSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid postgres URL'),
});

const s3Schema = z.object({
  S3_REGION: z.string().min(1),
  // Dev-only static keys. Empty in production (IAM role).
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_ENDPOINT: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  S3_FORCE_PATH_STYLE: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .default(false)
    .transform((v) => v === true || v === 'true'),
  S3_BUCKET_KYC: z.string().min(1),
  S3_BUCKET_PROJECTS: z.string().min(1),
  S3_BUCKET_CERTIFICATES: z.string().min(1),
  S3_BUCKET_AUDIT_EXPORTS: z.string().min(1),
});

const sesSchema = z.object({
  SES_REGION: z.string().min(1),
  SES_SENDER_DOMAIN: z.string().min(1),
  SES_CONFIGURATION_SET: z.string().min(1),
  SES_ACCESS_KEY_ID: z.string().optional().default(''),
  SES_SECRET_ACCESS_KEY: z.string().optional().default(''),
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

const envSchema = appSchema
  .merge(databaseSchema)
  .merge(s3Schema)
  .merge(sesSchema)
  .merge(sessionSchema)
  .merge(buildSchema);

export type Env = z.infer<typeof envSchema>;

// Public API ────────────────────────────────────────────────────────────────

let cached: Env | undefined;

/**
 * Validate and return the typed env object. Crashes the process on failure.
 * Lazy + memoized so unit tests can mutate `process.env` between calls
 * (the test suite resets via `resetEnvForTesting`).
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
