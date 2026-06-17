/**
 * lib/storage — object storage abstraction layer
 *
 * Public API:
 *   getStorageDriver()   — returns the configured S3Driver (singleton)
 *   BUCKETS              — named bucket constants
 *   StorageDriver        — interface
 */
export { BUCKETS, type BucketName } from './driver';
export type { StorageDriver, StorageObjectMetadata } from './driver';
export { getStorageDriver } from './s3';
export { S3Driver } from './s3';
