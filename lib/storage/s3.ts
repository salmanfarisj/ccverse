/**
 * S3Driver — AWS S3 implementation of StorageDriver.
 *
 * Uses AWS SDK v3 with:
 *   - Server-side encryption enforced on every PUT (AES256 or KMS)
 *   - Path-style or virtual-host-style addressing (configurable via S3_FORCE_PATH_STYLE)
 *   - Dev mode: empty credentials + S3_ENDPOINT uses a local S3-compatible mock (MinIO)
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '@/lib/env';
import type { StorageDriver, StorageObjectMetadata } from './driver';
// eslint-disable-next-line import/no-internal-modules
import { logger } from '@/jobs/logger';

/** SSE header key — enforced on every put */
const SSE_AES256 = 'AES256';

function buildClient() {
  const env = getEnv();

  const isDev = !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY;

  const clientConfig: ConstructorParameters<typeof S3Client>[0] = {
    region: env.S3_REGION,
    ...(isDev
      ? {
          // Local dev: use anonymous credentials + custom endpoint
          credentials: { accessKeyId: '', secretAccessKey: '' },
          ...(env.S3_ENDPOINT && { endpoint: env.S3_ENDPOINT }),
        }
      : {
          // Production: IAM role (no static credentials needed)
          ...(env.S3_ACCESS_KEY_ID &&
            env.S3_SECRET_ACCESS_KEY && {
              credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
              },
            }),
        }),
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  };

  return new S3Client(clientConfig);
}

export class S3Driver implements StorageDriver {
  private readonly client: S3Client;
  private readonly sseAlgorithm: string;

  constructor() {
    this.client = buildClient();
    // Prefer KMS if KMS key ARN is set; fall back to AES256.
    // For MVP all uploads use AES256 — KMS is noted as a future option.
    this.sseAlgorithm = SSE_AES256;
  }

  async put(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    metadata?: StorageObjectMetadata,
  ): Promise<{ etag: string }> {
    const input: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: body,
      ServerSideEncryption: this.sseAlgorithm as 'AES256',
      ...(metadata?.contentType && { ContentType: metadata.contentType }),
      ...(metadata?.contentDisposition && {
        ContentDisposition: metadata.contentDisposition,
      }),
      ...(metadata?.metadata && { Metadata: metadata.metadata }),
    };

    const command = new PutObjectCommand(input);
    const result = await this.client.send(command);

    logger.debug('storage.put', { bucket, key, etag: result.ETag });
    return { etag: result.ETag ?? '' };
  }

  async get(
    bucket: string,
    key: string,
  ): Promise<{ body: Buffer; metadata: StorageObjectMetadata } | null> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    try {
      const response = await this.client.send(command);

      // Collect body chunks — handle Buffer (mock returns it directly) vs stream
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

      const metadata: StorageObjectMetadata = {
        contentType: response.ContentType,
        contentDisposition: response.ContentDisposition,
        metadata: response.Metadata,
        etag: response.ETag,
        size: response.ContentLength,
        lastModified: response.LastModified,
      };

      return { body, metadata };
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.name;
      if (code === 'NoSuchKey' || code === '404') return null;
      throw err;
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await this.client.send(command);
    logger.debug('storage.delete', { bucket, key });
  }

  async head(bucket: string, key: string): Promise<StorageObjectMetadata | null> {
    const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
    try {
      const response = await this.client.send(command);
      return {
        contentType: response.ContentType,
        contentDisposition: response.ContentDisposition,
        metadata: response.Metadata,
        etag: response.ETag,
        size: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (err as any)?.name;
      if (code === 'NotFound' || code === '404') return null;
      throw err;
    }
  }

  async presignPut(bucket: string, key: string, ttlSeconds = 300): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ServerSideEncryption: this.sseAlgorithm as 'AES256',
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds,
    });
    logger.debug('storage.presignPut', { bucket, key, ttlSeconds });
    return url;
  }

  async presignGet(bucket: string, key: string, ttlSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: ttlSeconds,
    });
    logger.debug('storage.presignGet', { bucket, key, ttlSeconds });
    return url;
  }
}

/** Singleton — cached at module level like the Prisma client */
let _instance: S3Driver | undefined;

export function getStorageDriver(): StorageDriver {
  if (!_instance) _instance = new S3Driver();
  return _instance;
}
