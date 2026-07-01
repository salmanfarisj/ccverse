import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { nextCounter, padNumber } from '../lib/counters';

export const createProject = mutation({
  args: {
    sellerId: v.id('users'),
    name: v.string(),
    country: v.string(),
    projectType: v.string(),
    methodology: v.string(),
    vintageYear: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const counter = await nextCounter(ctx, 'project_counter');
    const ccverseProjectId = `CCV-${padNumber(counter, 6)}`;
    const now = Date.now();

    const projectId = await ctx.db.insert('projects', {
      sellerId: args.sellerId,
      name: args.name,
      country: args.country,
      projectType: args.projectType,
      methodology: args.methodology,
      vintageYear: args.vintageYear,
      description: args.description,
      ccverseProjectId,
      status: 'ACTIVE',
      createdAt: now,
    });

    return {
      success: true as const,
      projectId,
      ccverseProjectId,
    };
  },
});
