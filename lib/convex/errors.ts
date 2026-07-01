/**
 * Detect Convex argument-validation failures caused by a stale session
 * cookie whose userId points at the wrong table (e.g. a password-reset token).
 */
export function isInvalidSessionUserIdError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.message.includes('ArgumentValidationError') &&
    err.message.includes('does not match the table name in validator')
  );
}
