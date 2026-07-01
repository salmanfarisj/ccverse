import { query } from '../_generated/server';

export const listRegistry = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query('registryEntries').collect();
    entries.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const project = entry.projectId ? await ctx.db.get(entry.projectId) : null;
        const owner = entry.ownerBuyerId ? await ctx.db.get(entry.ownerBuyerId) : null;

        return {
          id: entry._id,
          cvcSerial: entry.cvcSerial,
          state: entry.state,
          projectName: project?.name ?? 'Unknown',
          ccverseProjectId: project?.ccverseProjectId ?? '',
          ownerEmail: owner?.email ?? null,
          createdAt: entry.createdAt,
        };
      }),
    );

    return enriched;
  },
});
