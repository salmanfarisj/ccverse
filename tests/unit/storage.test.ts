/**
 * Unit tests for lib/storage — S3Driver + StorageDriver interface.
 *
 * Uses aws-sdk-client-mock to intercept AWS SDK calls without making
 * real network requests.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Driver } from '@/lib/storage/s3';
import { BUCKETS } from '@/lib/storage/driver';

// Mock env — storage driver reads S3_REGION etc. at construction time
vi.mock('@/lib/env', () => ({
  getEnv: () => ({
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: '',
    S3_SECRET_ACCESS_KEY: '',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_FORCE_PATH_STYLE: true,
    S3_BUCKET_KYC: 'ccverse-kyc',
    S3_BUCKET_PROJECTS: 'ccverse-projects',
    S3_BUCKET_CERTIFICATES: 'ccverse-certificates',
    S3_BUCKET_AUDIT_EXPORTS: 'ccverse-audit-exports',
  }),
}));

describe('StorageDriver interface', () => {
  let s3Driver: S3Driver;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh driver per test (client is built at construction)
    s3Driver = new S3Driver();
  });

  describe('put', () => {
    it('sends PutObjectCommand with SSE encryption', async () => {
      const mock = mockClient(S3Client);
      mock.on(PutObjectCommand).resolves({ ETag: '"abc123"' });

      const result = await s3Driver.put(
        BUCKETS.KYC,
        'kyc/user-1/doc.pdf',
        Buffer.from('hello'),
        { contentType: 'application/pdf' },
      );

      expect(result.etag).toBe('"abc123"');

      // Verify the command was called with expected fields
      const calls = mock.calls();
      expect(calls.length).toBe(1);
      expect((calls[0]!.args[0] as { input?: unknown }).input).toMatchObject({
        Bucket: 'ccverse-kyc',
        Key: 'kyc/user-1/doc.pdf',
        ServerSideEncryption: 'AES256',
        ContentType: 'application/pdf',
      });
    });

    it('accepts string body', async () => {
      const mock = mockClient(S3Client);
      mock.on(PutObjectCommand).resolves({ ETag: '"def456"' });

      await s3Driver.put(BUCKETS.PROJECTS, 'proj/logo.png', 'binary string');

      const calls = mock.calls();
      expect(calls.length).toBe(1);
    });
  });

  describe('get', () => {
    it('returns body and metadata on success', async () => {
      const mock = mockClient(S3Client);
      mock.on(GetObjectCommand).resolves({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Body: Buffer.from('file content') as any,
        ContentType: 'text/plain',
        ETag: '"etag1"',
        ContentLength: 12,
      });

      const result = await s3Driver.get(BUCKETS.CERTIFICATES, 'cert/123.pdf');

      expect(result).not.toBeNull();
      expect(result!.body.toString()).toBe('file content');
      expect(result!.metadata.contentType).toBe('text/plain');
      expect(result!.metadata.etag).toBe('"etag1"');
    });

    it('returns null for NoSuchKey', async () => {
      const mock = mockClient(S3Client);
      const error = new Error('NoSuchKey');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).name = 'NoSuchKey';
      mock.on(GetObjectCommand).rejects(error);

      const result = await s3Driver.get(BUCKETS.KYC, 'missing.txt');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('sends DeleteObjectCommand', async () => {
      const mock = mockClient(S3Client);
      mock.on(DeleteObjectCommand).resolves({});

      await s3Driver.delete(BUCKETS.AUDIT_EXPORTS, 'exports/2025.csv');

      const calls = mock.calls();
      expect(calls.length).toBe(1);
      expect((calls[0]!.args[0] as { input?: unknown }).input).toMatchObject({
        Bucket: 'ccverse-audit-exports',
        Key: 'exports/2025.csv',
      });
    });
  });

  describe('head', () => {
    it('returns metadata on success', async () => {
      const mock = mockClient(S3Client);
      mock.on(HeadObjectCommand).resolves({
        ContentType: 'image/png',
        ETag: '"head-etag"',
        ContentLength: 1024,
        LastModified: new Date('2025-01-01'),
      });

      const result = await s3Driver.head(BUCKETS.PROJECTS, 'proj/img.png');

      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('image/png');
      expect(result!.etag).toBe('"head-etag"');
    });

    it('returns null for NotFound', async () => {
      const mock = mockClient(S3Client);
      const error = new Error('NotFound');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).name = 'NotFound';
      mock.on(HeadObjectCommand).rejects(error);

      const result = await s3Driver.head(BUCKETS.CERTIFICATES, 'missing.pdf');

      expect(result).toBeNull();
    });
  });

  describe('presigned URLs', () => {
    it('presignPut generates a URL with bucket, key and expiry', async () => {
      const mock = mockClient(S3Client);
      mock.on(PutObjectCommand).resolves({ ETag: '"etag"' });

      const url = await s3Driver.presignPut(BUCKETS.KYC, 'kyc/upload.pdf', 600);

      expect(url).toContain('ccverse-kyc');
      expect(url).toContain('X-Amz-Expires=600');
    });

    it('presignGet generates a URL with default TTL', async () => {
      const mock = mockClient(S3Client);
      mock.on(GetObjectCommand).resolves({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Body: Buffer.from('x') as any,
      });

      const url = await s3Driver.presignGet(BUCKETS.CERTIFICATES, 'cert/1.pdf');

      expect(url).toContain('ccverse-certificates');
      expect(url).toContain('X-Amz-Expires=300');
    });
  });
});

describe('BUCKETS constants', () => {
  it('are defined for all four buckets', () => {
    expect(BUCKETS.KYC).toBe('ccverse-kyc');
    expect(BUCKETS.PROJECTS).toBe('ccverse-projects');
    expect(BUCKETS.CERTIFICATES).toBe('ccverse-certificates');
    expect(BUCKETS.AUDIT_EXPORTS).toBe('ccverse-audit-exports');
  });
});
