/**
 * TOTP MFA helpers (scaffold only — not wired to any flow in Phase 0).
 *
 * Implements RFC 6238 TOTP with SHA-1 (the industry-standard default).
 * Secret is base32-encoded; tokens are 6 digits; step is 30 s; window is ±1.
 *
 * This module is deliberately NOT connected to the session or User model in
 * Phase 0. T0-7-3 is the scaffold — wiring to login flows happens in Phase 1.
 */

import { generateSecret, verify, generateURI } from 'otplib';

/**
 * Generate a new TOTP secret for a user.
 * The secret is returned as a base32-encoded string suitable for QR-code encoding.
 */
export function generateTotpSecret(): string {
  return generateSecret();
}

/**
 * Verify a TOTP token against a user's secret.
 *
 * @param secret - The base32-encoded TOTP secret (from generateTotpSecret)
 * @param token  - The 6-digit OTP entered by the user
 * @returns true if the token is valid (within ±1 step window), false otherwise
 */
export async function verifyTotpToken(secret: string, token: string): Promise<boolean> {
  try {
    const result = await verify({ token, secret });
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Get the TOTP provisioning URI (for QR-code generation).
 * Format: otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}&digits=6&algorithm=SHA1&period=30
 *
 * @param account - Usually the user's email
 * @param secret  - The base32-encoded TOTP secret
 * @param issuer  - Application name (default: CCVerse)
 */
export function getProvisioningUri(
  account: string,
  secret: string,
  issuer: string = 'CCVerse',
): string {
  return generateURI({ secret, issuer, label: account });
}
