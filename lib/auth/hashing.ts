/**
 * Password hashing helpers using argon2id.
 *
 * Parameters follow the OWASP 2023 recommendations for Argon2id:
 *   - Memory:  64 MB  (m=64)
 *   - Iterations: 3   (t=3)
 *   - Parallelism: 4 (p=4)
 *
 * These values are tuned for a modern server; mobile/low-memory clients
 * may need lower memory in Phase 2+ (at which point this module is
 * parametrisable via env).
 */

import { hash, verify } from 'argon2';

const ARGON2_PARAMS = {
  memoryCost: 64 * 1024, // 64 MB
  timeCost: 3,
  parallelism: 4,
  type: 2, // argon2id
} as const;

/**
 * Hash a plain-text password.
 * @param plain - The plain-text password (min 8 chars expected)
 * @returns The argon2id hash (includes salt, params, and version)
 */
export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return hash(plain, ARGON2_PARAMS);
}

/**
 * Verify a plain-text password against an argon2id hash.
 * @param plain - The plain-text password attempt
 * @param hash  - The stored argon2id hash
 * @returns true if the password matches, false otherwise
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await verify(hash, plain);
  } catch {
    // argon2 throws on malformed hashes — treat as mismatch
    return false;
  }
}
