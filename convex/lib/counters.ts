import type { MutationCtx } from '../_generated/server';

/** Atomically increment a named counter stored in platformConfigs. */
export async function nextCounter(ctx: MutationCtx, key: string): Promise<number> {
  const now = Date.now();
  const row = await ctx.db
    .query('platformConfigs')
    .withIndex('by_key', (q) => q.eq('key', key))
    .first();

  const next = row ? parseInt(row.value, 10) + 1 : 1;

  if (row) {
    await ctx.db.patch(row._id, { value: String(next), updatedAt: now });
  } else {
    await ctx.db.insert('platformConfigs', { key, value: String(next), updatedAt: now });
  }

  return next;
}

export function padNumber(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
