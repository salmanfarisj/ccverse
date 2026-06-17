/**
 * StorageDriver interface — the abstraction layer for object storage.
 *
 * All storage operations in the codebase go through this interface, allowing
 * the underlying driver to be swapped (S3 in prod, MinIO/local mock in dev)
 * without changing any call sites.
 *
 * Buckets managed by CC Verse:
 *   - `ccverse-kyc`             — KYC document uploads
 *   - `ccverse-projects`        — project registration documents
 *   - `ccverse-certificates`    — signed PDF certificates
 *   - `ccverse-audit-exports`   — periodic audit log exports
 */

export interface StorageObjectMetadata {
  contentType?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  etag?: string;
  size?: number;
  lastModified?: Date;
}

export interface StorageDriver {
  /**
   * Upload an object.
   * @param bucket Target bucket name (without `ccverse-` prefix — use the constants from lib/storage)
   * @param key Object key (path within bucket)
   * @param body Binary data
   * @param metadata Optional metadata
   */
  put(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | string,
    metadata?: StorageObjectMetadata,
  ): Promise<{ etag: string }>;

  /**
   * Download an object.
   * @param bucket Bucket name
   * @param key Object key
   * @returns Object body and metadata, or null if not found
   */
  get(
    bucket: string,
    key: string,
  ): Promise<{ body: Buffer; metadata: StorageObjectMetadata } | null>;

  /**
   * Delete an object.
   * @param bucket Bucket name
   * @param key Object key
   */
  delete(bucket: string, key: string): Promise<void>;

  /**
   * Get object metadata without downloading the body.
   * @param bucket Bucket name
   * @param key Object key
   * @returns Metadata or null if not found
   */
  head(bucket: string, key: string): Promise<StorageObjectMetadata | null>;

  /**
   * Generate a presigned PUT URL.
   * @param bucket Bucket name
   * @param key Object key
   * @param ttlSeconds How long the URL is valid (default 300 = 5 min)
   */
  presignPut(bucket: string, key: string, ttlSeconds?: number): Promise<string>;

  /**
   * Generate a presigned GET URL.
   * @param bucket Bucket name
   * @param key Object key
   * @param ttlSeconds How long the URL is valid (default 300 = 5 min)
   */
  presignGet(bucket: string, key: string, ttlSeconds?: number): Promise<string>;
}

// Bucket name constants — use these instead of raw strings
export const BUCKETS = {
  KYC: 'ccverse-kyc',
  PROJECTS: 'ccverse-projects',
  CERTIFICATES: 'ccverse-certificates',
  AUDIT_EXPORTS: 'ccverse-audit-exports',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];
