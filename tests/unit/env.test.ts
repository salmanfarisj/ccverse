import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnv, resetEnvForTesting } from '@/lib/env';

const REQUIRED: Record<string, string> = {
  APP_ORIGIN: 'http://localhost:3000',
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://ccverse:ccverse@localhost:5432/ccverse?schema=public',
  S3_REGION: 'us-east-1',
  S3_BUCKET_KYC: 'ccverse-kyc',
  S3_BUCKET_PROJECTS: 'ccverse-projects',
  S3_BUCKET_CERTIFICATES: 'ccverse-certificates',
  S3_BUCKET_AUDIT_EXPORTS: 'ccverse-audit-exports',
  SES_REGION: 'us-east-1',
  SES_SENDER_DOMAIN: 'ccverse.local',
  SES_CONFIGURATION_SET: 'ccverse-default',
  SESSION_SECRET: 'a'.repeat(32),
};

describe('env loader', () => {
  const original = { ...process.env };

  beforeEach(() => {
    resetEnvForTesting();
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, REQUIRED);
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, original);
    resetEnvForTesting();
  });

  it('parses a minimal valid env', () => {
    const env = getEnv();
    expect(env.APP_ORIGIN).toBe('http://localhost:3000');
    expect(env.S3_BUCKET_KYC).toBe('ccverse-kyc');
    expect(env.SESSION_SECRET).toHaveLength(32);
  });

  it('coerces S3_FORCE_PATH_STYLE from string to boolean', () => {
    process.env.S3_FORCE_PATH_STYLE = 'true';
    resetEnvForTesting();
    expect(getEnv().S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('throws when a required variable is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => getEnv()).toThrow(/Invalid environment/);
  });

  it('throws when SESSION_SECRET is too short', () => {
    process.env.SESSION_SECRET = 'short';
    expect(() => getEnv()).toThrow(/SESSION_SECRET/);
  });

  it('throws when APP_ORIGIN is not a URL', () => {
    process.env.APP_ORIGIN = 'not-a-url';
    expect(() => getEnv()).toThrow(/APP_ORIGIN/);
  });

  it('logs each issue on failure', () => {
    delete process.env.S3_REGION;
    delete process.env.SES_REGION;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => getEnv()).toThrow();
      expect(spy).toHaveBeenCalled();
      const message = String(spy.mock.calls[0]?.[0] ?? '');
      expect(message).toContain('S3_REGION');
      expect(message).toContain('SES_REGION');
    } finally {
      spy.mockRestore();
    }
  });
});
