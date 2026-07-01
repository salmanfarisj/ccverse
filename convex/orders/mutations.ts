import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { nextCounter, padNumber } from '../lib/counters';

export const buyListing = mutation({
  args: {
    buyerId: v.id('users'),
    listingId: v.id('listings'),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity < 1) {
      return { success: false as const, error: 'Quantity must be at least 1' };
    }

    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return { success: false as const, error: 'Listing not found' };
    }
    if (listing.status !== 'ACTIVE') {
      return { success: false as const, error: 'Listing is not available' };
    }
    if (listing.quantityAvailable < args.quantity) {
      return {
        success: false as const,
        error: `Only ${listing.quantityAvailable} credits available`,
      };
    }

    const project = await ctx.db.get(listing.projectId);
    if (!project) {
      return { success: false as const, error: 'Project not found' };
    }

    const availableEntries = await ctx.db
      .query('registryEntries')
      .withIndex('by_listingId', (q) => q.eq('listingId', args.listingId))
      .filter((q) => q.eq(q.field('state'), 'AVAILABLE'))
      .take(args.quantity);

    if (availableEntries.length < args.quantity) {
      return { success: false as const, error: 'Not enough registry entries available' };
    }

    const now = Date.now();
    const newQtyAvailable = listing.quantityAvailable - args.quantity;
    const serials = availableEntries.map((e) => e.cvcSerial);
    const totalAmount = listing.unitPrice * args.quantity;

    await ctx.db.patch(listing._id, {
      quantityAvailable: newQtyAvailable,
      status: newQtyAvailable === 0 ? 'SOLD_OUT' : listing.status,
    });

    const orderId = await ctx.db.insert('orders', {
      buyerId: args.buyerId,
      listingId: args.listingId,
      sellerId: listing.sellerId,
      quantity: args.quantity,
      unitPrice: listing.unitPrice,
      currency: listing.currency,
      totalAmount,
      serials,
      status: 'PAID',
      createdAt: now,
    });

    const certCounter = await nextCounter(ctx, 'certificate_counter');
    const certNo = `CERT-${padNumber(certCounter, 8)}`;

    const certificateId = await ctx.db.insert('certificates', {
      orderId,
      buyerId: args.buyerId,
      serials,
      projectName: project.name,
      quantity: args.quantity,
      issuedAt: now,
      certNo,
      status: 'ISSUED',
      createdAt: now,
    });

    await ctx.db.patch(orderId, { certificateId });

    for (const entry of availableEntries) {
      await ctx.db.patch(entry._id, {
        state: 'RETIRED',
        ownerBuyerId: args.buyerId,
        heldByOrderId: orderId,
      });
    }

    return {
      success: true as const,
      orderId,
      certificateId,
      certNo,
      totalAmount,
      currency: listing.currency,
      serials,
    };
  },
});
