'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

function getSessionKey(): string {
  const key = process.env['SESSION_SECRET'];
  if (key && key.length >= 32) return key;
  return 'default-dev-secret-32-chars-minimum!!';
}

async function encryptSecret(secret: string, key: string): Promise<string> {
  const { createCipheriv, randomBytes } = await import('crypto');
  const algorithm = 'aes-256-gcm';
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, Buffer.from(key.slice(0, 32), 'utf8'), iv);
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function decryptSecret(encrypted: string, key: string): Promise<string> {
  const { createDecipheriv } = await import('crypto');
  const parts = encrypted.split(':');
  const ivHex = parts[0];
  const authTagHex = parts[1];
  const encryptedData = parts[2];
  if (!ivHex || !authTagHex || !encryptedData) {
    throw new Error('Malformed encrypted TOTP secret');
  }
  const algorithm = 'aes-256-gcm';
  const decipher = createDecipheriv(
    algorithm,
    Buffer.from(key.slice(0, 32), 'utf8'),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  return decrypted + decipher.final('utf8');
}

export const generateMfaSecretAction = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const { generateSecret, generateURI } = await import('otplib');
    const secret = generateSecret();
    const sessionKey = getSessionKey();
    const encryptedSecret = await encryptSecret(secret, sessionKey);

    const userResult = await ctx.runQuery(internal.auth.mfaMutations.getUserMfaSecretQuery, {
      email: identity.email || identity.tokenIdentifier,
    });

    if (!userResult.success || !userResult.userId) {
      throw new Error('User not found');
    }

    await ctx.runMutation(internal.auth.mfaMutations.setMfaSecretMutation, {
      userId: userResult.userId,
      encryptedSecret,
    });

    const uri = generateURI({
      secret,
      issuer: 'CCVerse',
      label: identity.email || identity.tokenIdentifier,
    });

    return {
      secret,
      uri,
    };
  },
});

export const verifyMfaTokenAction = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const userResult = await ctx.runQuery(internal.auth.mfaMutations.getUserMfaSecretQuery, {
      email: identity.email || identity.tokenIdentifier,
    });

    if (!userResult.success || !userResult.mfaSecret) {
      return { valid: false, error: 'MFA not set up' };
    }

    const sessionKey = getSessionKey();
    const decryptedSecret = await decryptSecret(userResult.mfaSecret, sessionKey);

    const { verify } = await import('otplib');
    const result = await verify({ token: args.token, secret: decryptedSecret });

    return { valid: result !== null };
  },
});

export const enableMfaAction = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const userResult = await ctx.runQuery(internal.auth.mfaMutations.getUserMfaSecretQuery, {
      email: identity.email || identity.tokenIdentifier,
    });

    if (!userResult.success || !userResult.mfaSecret || !userResult.userId) {
      return { success: false, error: 'MFA not set up' };
    }

    const sessionKey = getSessionKey();
    const decryptedSecret = await decryptSecret(userResult.mfaSecret, sessionKey);

    const { verify } = await import('otplib');
    const result = await verify({ token: args.token, secret: decryptedSecret });

    if (!result) {
      return { success: false, error: 'Invalid token' };
    }

    await ctx.runMutation(internal.auth.mfaMutations.enableMfaMutation, {
      userId: userResult.userId,
    });

    return { success: true };
  },
});

export const disableMfaAction = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const userResult = await ctx.runQuery(internal.auth.mfaMutations.getUserMfaSecretQuery, {
      email: identity.email || identity.tokenIdentifier,
    });

    if (!userResult.success || !userResult.userId) {
      throw new Error('User not found');
    }

    await ctx.runMutation(internal.auth.mfaMutations.disableMfaMutation, {
      userId: userResult.userId,
    });

    return { success: true };
  },
});
