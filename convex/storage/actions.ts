"use node";

/**
 * convex/storage/actions.ts — S3 storage operations as Convex Node actions.
 *
 * Ports S3Driver logic from lib/storage/s3.ts to Convex actions.
 * All buckets use Option B: Node action → existing S3 via @aws-sdk/client-s3.
 *
 * Dev mode: if S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are empty AND S3_ENDPOINT
 * is not set, uploads return a fake etag and get/head return null so the app
 * works without a mock S3.
 */
import { action } from '../_generated/server';
import { v } from 'convex/values';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** SSE header value — enforced on every put */
const SSE_AES256 = 'AES256' as const;

/** Allowed buckets — prevents arbitrary S3 bucket access */
export const BUCKETS = {
  KYC: 'ccverse-kyc',
  PROJECTS: 'ccverse-projects',
  CERTIFICATES: 'ccverse-certificates',
  AUDIT_EXPORTS: 'ccverse-audit-exports',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

function buildClient(): S3Client {
  const isDev =
    !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY;

  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: process.env.S3_REGION ?? 'us-east-1',
    ...(isDev
      ? {
          // Local dev: anonymous credentials + optional custom endpoint
          credentials: { accessKeyId: '', secretAccessKey: '' },
          ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
        }
      : {
          // Production: IAM role (no static credentials) OR static creds if provided
          ...(process.env.S3_ACCESS_KEY_ID &&
            process.env.S3_SECRET_ACCESS_KEY && {
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
              },
            }),
        }),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  };

  return new S3Client(clientConfig);
}

function isDevWithoutEndpoint(): boolean {
  return (
    (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) &&
    !process.env.S3_ENDPOINT
  );
}

// ---------------------------------------------------------------------------
// Presigned PUT URL
// ---------------------------------------------------------------------------

export const presignPutAction = action({
  args: {
    bucket: v.union(
      v.literal(BUCKETS.KYC),
      v.literal(BUCKETS.PROJECTS),
      v.literal(BUCKETS.CERTIFICATES),
      v.literal(BUCKETS.AUDIT_EXPORTS),
    ),
    key: v.string(),
    ttlSeconds: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<{ url: string }> => {
    const client = buildClient();
    const command = new PutObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
      ServerSideEncryption: SSE_AES256 as 'AES256',
    });
    const url = await getSignedUrl(client, command, {
      expiresIn: args.ttlSeconds ?? 300,
    });
    return { url };
  },
});

// ---------------------------------------------------------------------------
// Presigned GET URL
// ---------------------------------------------------------------------------

export const presignGetAction = action({
  args: {
    bucket: v.union(
      v.literal(BUCKETS.KYC),
      v.literal(BUCKETS.PROJECTS),
      v.literal(BUCKETS.CERTIFICATES),
      v.literal(BUCKETS.AUDIT_EXPORTS),
    ),
    key: v.string(),
    ttlSeconds: v.optional(v.number()),
  },
  handler: async (_ctx, args): Promise<{ url: string }> => {
    const client = buildClient();
    const command = new GetObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });
    const url = await getSignedUrl(client, command, {
      expiresIn: args.ttlSeconds ?? 300,
    });
    return { url };
  },
});

// ---------------------------------------------------------------------------
// Put object
// ---------------------------------------------------------------------------

export const putObjectAction = action({
  args: {
    bucket: v.union(
      v.literal(BUCKETS.KYC),
      v.literal(BUCKETS.PROJECTS),
      v.literal(BUCKETS.CERTIFICATES),
      v.literal(BUCKETS.AUDIT_EXPORTS),
    ),
    key: v.string(),
    body: v.bytes(),
    contentType: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (_ctx, args): Promise<{ etag: string }> => {
    // Dev mode without S3_ENDPOINT: log and return fake etag so the app works.
    if (isDevWithoutEndpoint()) {
      console.warn(
        `[storage] Dev mode — upload skipped (no S3_ENDPOINT configured)`,
        { bucket: args.bucket, key: args.key },
      );
      return { etag: `dev-fake-${Date.now()}` };
    }

    const input: PutObjectCommandInput = {
      Bucket: args.bucket,
      Key: args.key,
      Body: args.body,
      ServerSideEncryption: SSE_AES256 as 'AES256',
      ...(args.contentType && { ContentType: args.contentType }),
      ...(args.metadata && { Metadata: args.metadata as Record<string, string> }),
    };

    const client = buildClient();
    const command = new PutObjectCommand(input);
    const result = await client.send(command);

    return { etag: result.ETag ?? '' };
  },
});

// ---------------------------------------------------------------------------
// Get object — returns body as base64 string
// ---------------------------------------------------------------------------

export const getObjectAction = action({
  args: {
    bucket: v.union(
      v.literal(BUCKETS.KYC),
      v.literal(BUCKETS.PROJECTS),
      v.literal(BUCKETS.CERTIFICATES),
      v.literal(BUCKETS.AUDIT_EXPORTS),
    ),
    key: v.string(),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    body: string;
    metadata: {
      contentType?: string;
      contentDisposition?: string;
      metadata?: Record<string, string>;
      etag?: string;
      size?: number;
      lastModified?: number;
    };
  } | null> => {
    const client = buildClient();
    const command = new GetObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });

    try {
      const response = await client.send(command);

      // Collect body chunks — handle Buffer (mock) vs stream (real SDK)
      let body: Buffer;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const val = response.Body as any;
      if (Buffer.isBuffer(val)) {
        body = val;
      } else {
        const chunks: Uint8Array[] = [];
        for await (const chunk of val) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }

      // Convert to base64 for JSON-serializable transport
      const base64Body = body.toString('base64');

      return {
        body: base64Body,
        metadata: {
          contentType: response.ContentType,
          contentDisposition: response.ContentDisposition,
          metadata: response.Metadata,
          etag: response.ETag,
          size: response.ContentLength,
          lastModified: response.LastModified
            ? response.LastModified.getTime()
            : undefined,
        },
      };
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.name;
      if (code === 'NoSuchKey' || code === '404') return null;
      throw err;
    }
  },
});

// ---------------------------------------------------------------------------
// Delete object
// ---------------------------------------------------------------------------

export const deleteObjectAction = action({
  args: {
    bucket: v.union(
      v.literal(BUCKETS.KYC),
      v.literal(BUCKETS.PROJECTS),
      v.literal(BUCKETS.CERTIFICATES),
      v.literal(BUCKETS.AUDIT_EXPORTS),
    ),
    key: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: true }> => {
    const client = buildClient();
    const command = new DeleteObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });
    await client.send(command);
    return { success: true };
  },
});

// ---------------------------------------------------------------------------
// Head object — get metadata without body
// ---------------------------------------------------------------------------

export const headObjectAction = action({
  args: {
    bucket: v.union(
      v.literal(BUCKETS.KYC),
      v.literal(BUCKETS.PROJECTS),
      v.literal(BUCKETS.CERTIFICATES),
      v.literal(BUCKETS.AUDIT_EXPORTS),
    ),
    key: v.string(),
  },
  handler: async (
    _ctx,
    args,
  ): Promise<{
    contentType?: string;
    contentDisposition?: string;
    metadata?: Record<string, string>;
    etag?: string;
    size?: number;
    lastModified?: number;
  } | null> => {
    const client = buildClient();
    const command = new HeadObjectCommand({
      Bucket: args.bucket,
      Key: args.key,
    });

    try {
      const response = await client.send(command);
      return {
        contentType: response.ContentType,
        contentDisposition: response.ContentDisposition,
        metadata: response.Metadata,
        etag: response.ETag,
        size: response.ContentLength,
        lastModified: response.LastModified
          ? response.LastModified.getTime()
          : undefined,
      };
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.name;
      if (code === 'NotFound' || code === '404') return null;
      throw err;
    }
  },
});
