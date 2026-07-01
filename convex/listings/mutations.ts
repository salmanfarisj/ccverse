import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { nextCounter, padNumber } from '../lib/counters';

export const createListing = mutation({
  args: {
    sellerId: v.id('users'),
    projectId: v.id('projects'),
    title: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.quantity < 1) {
      return { success: false as const, error: 'Quantity must be at least 1' };
    }
    if (args.unitPrice <= 0) {
      return { success: false as const, error: 'Unit price must be positive' };
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return { success: false as const, error: 'Project not found' };
    }
    if (project.sellerId !== args.sellerId) {
      return { success: false as const, error: 'Project does not belong to seller' };
    }
    if (project.status !== 'ACTIVE') {
      return { success: false as const, error: 'Project is not active' };
    }

    const now = Date.now();
    const year = new Date().getFullYear();

    const listingId = await ctx.db.insert('listings', {
      sellerId: args.sellerId,
      projectId: args.projectId,
      title: args.title,
      quantityTotal: args.quantity,
      quantityAvailable: args.quantity,
      unitPrice: args.unitPrice,
      currency: args.currency,
      status: 'ACTIVE',
      createdAt: now,
    });

    const serials: string[] = [];
    for (let i = 0; i < args.quantity; i++) {
      const counter = await nextCounter(ctx, `cvc_serial_${year}`);
      const cvcSerial = `CVC-${year}-${padNumber(counter, 7)}`;
      serials.push(cvcSerial);

      await ctx.db.insert('registryEntries', {
        state: 'AVAILABLE',
        cvcSerial,
        listingId,
        projectId: args.projectId,
        createdAt: now,
      });
    }

    return {
      success: true as const,
      listingId,
      serials,
    };
  },
});
