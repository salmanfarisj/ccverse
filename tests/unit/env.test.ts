import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEnv, resetEnvForTesting } from '@/lib/env';

const REQUIRED: Record<string, string> = {
  APP_ORIGIN: 'http://localhost:3000',
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://ccverse:ccverse@localhost:5432/ccverse?schema=public',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'ccverse-storage',
  SES_REGION: 'us-east-1',
  SES_SENDER_DOMAIN: 'ccverse.local',
  SES_CONFIGURATION_SET: 'ccverse-default',
  SESSION_SECRET: 'a'.repeat(32),
};

/** Delete a process.env key without triggering TS2704 (readonly property). */
function unset(key: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (process.env as Record<string, string | undefined>)[key];
}

describe('env loader', () => {
  const original = { ...process.env };

  beforeEach(() => {
    resetEnvForTesting();
    for (const k of Object.keys(process.env)) unset(k);
    Object.assign(process.env, REQUIRED);
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) unset(k);
    Object.assign(process.env, original);
    resetEnvForTesting();
  });

  it('parses a minimal valid env', () => {
    const env = getEnv();
    expect(env.APP_ORIGIN).toBe('http://localhost:3000');
    expect(env.S3_BUCKET).toBe('ccverse-storage');
    expect(env.SESSION_SECRET).toHaveLength(32);
  });

  it('coerces S3_FORCE_PATH_STYLE from string to boolean', () => {
    process.env.S3_FORCE_PATH_STYLE = 'true';
    resetEnvForTesting();
    expect(getEnv().S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('throws when a required variable is missing', () => {
    unset('DATABASE_URL');
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
    unset('S3_REGION');
    unset('SES_REGION');
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

  it('PROXY_ORIGIN empty string becomes undefined', () => {
    process.env.PROXY_ORIGIN = '';
    resetEnvForTesting();
    expect(getEnv().PROXY_ORIGIN).toBeUndefined();
  });

  it('S3_FORCE_PATH_STYLE false from string', () => {
    process.env.S3_FORCE_PATH_STYLE = 'false';
    resetEnvForTesting();
    expect(getEnv().S3_FORCE_PATH_STYLE).toBe(false);
  });

  it('throws when DATABASE_URL is not a valid URL', () => {
    process.env.DATABASE_URL = 'not-a-database-url';
    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });

  it('throws when SES_SENDER_DOMAIN is missing', () => {
    unset('SES_SENDER_DOMAIN');
    expect(() => getEnv()).toThrow(/SES_SENDER_DOMAIN/);
  });

  it('defaults NODE_ENV to development', () => {
    unset('NODE_ENV');
    resetEnvForTesting();
    expect(getEnv().NODE_ENV).toBe('development');
  });

  it('defaults GIT_SHA to dev', () => {
    unset('GIT_SHA');
    resetEnvForTesting();
    expect(getEnv().GIT_SHA).toBe('dev');
  });

  it('defaults BUILT_AT to empty string', () => {
    unset('BUILT_AT');
    resetEnvForTesting();
    expect(getEnv().BUILT_AT).toBe('');
  });
});
