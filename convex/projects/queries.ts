import { query } from '../_generated/server';
import { v } from 'convex/values';

export const listMyProjects = query({
  args: {
    sellerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', args.sellerId))
      .collect();

    projects.sort((a, b) => b.createdAt - a.createdAt);

    return projects.map((p) => ({
      id: p._id,
      name: p.name,
      country: p.country,
      projectType: p.projectType,
      methodology: p.methodology,
      vintageYear: p.vintageYear,
      description: p.description,
      ccverseProjectId: p.ccverseProjectId,
      status: p.status,
      createdAt: p.createdAt,
    }));
  },
});

export const getProject = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return { found: false as const };
    }

    return {
      found: true as const,
      project: {
        id: project._id,
        sellerId: project.sellerId,
        name: project.name,
        country: project.country,
        projectType: project.projectType,
        methodology: project.methodology,
        vintageYear: project.vintageYear,
        description: project.description,
        ccverseProjectId: project.ccverseProjectId,
        status: project.status,
        createdAt: project.createdAt,
      },
    };
  },
});
