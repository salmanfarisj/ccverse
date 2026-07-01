import { query } from '../_generated/server';
import { v } from 'convex/values';

export const listMyOrders = query({
  args: {
    buyerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_buyerId', (q) => q.eq('buyerId', args.buyerId))
      .collect();

    orders.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      orders.map(async (order) => {
        const listing = await ctx.db.get(order.listingId);
        const project = listing ? await ctx.db.get(listing.projectId) : null;
        const cert = order.certificateId ? await ctx.db.get(order.certificateId) : null;

        return {
          id: order._id,
          listingId: order.listingId,
          listingTitle: listing?.title ?? 'Unknown',
          projectName: project?.name ?? 'Unknown',
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          currency: order.currency,
          totalAmount: order.totalAmount,
          serials: order.serials,
          status: order.status,
          certificateId: order.certificateId,
          certNo: cert?.certNo ?? null,
          createdAt: order.createdAt,
        };
      }),
    );

    return enriched;
  },
});

export const getOrder = query({
  args: {
    orderId: v.id('orders'),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { found: false as const };
    }

    const listing = await ctx.db.get(order.listingId);
    const project = listing ? await ctx.db.get(listing.projectId) : null;
    const cert = order.certificateId ? await ctx.db.get(order.certificateId) : null;

    return {
      found: true as const,
      order: {
        id: order._id,
        buyerId: order.buyerId,
        listingId: order.listingId,
        listingTitle: listing?.title ?? 'Unknown',
        projectName: project?.name ?? 'Unknown',
        quantity: order.quantity,
        unitPrice: order.unitPrice,
        currency: order.currency,
        totalAmount: order.totalAmount,
        serials: order.serials,
        status: order.status,
        certificateId: order.certificateId,
        certNo: cert?.certNo ?? null,
        createdAt: order.createdAt,
      },
    };
  },
});

export const getCertificate = query({
  args: {
    certId: v.id('certificates'),
  },
  handler: async (ctx, args) => {
    const cert = await ctx.db.get(args.certId);
    if (!cert) {
      return { found: false as const };
    }

    const order = await ctx.db.get(cert.orderId);
    const buyer = await ctx.db.get(cert.buyerId);

    return {
      found: true as const,
      certificate: {
        id: cert._id,
        certNo: cert.certNo,
        projectName: cert.projectName,
        quantity: cert.quantity,
        serials: cert.serials,
        issuedAt: cert.issuedAt,
        status: cert.status,
        orderId: cert.orderId,
        buyerEmail: buyer?.email ?? 'Unknown',
        totalAmount: order?.totalAmount ?? 0,
        currency: order?.currency ?? 'USD',
      },
    };
  },
});

export const listSellerOrders = query({
  args: {
    sellerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query('orders')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', args.sellerId))
      .collect();

    orders.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      orders.map(async (order) => {
        const listing = await ctx.db.get(order.listingId);
        const project = listing ? await ctx.db.get(listing.projectId) : null;

        return {
          id: order._id,
          listingTitle: listing?.title ?? 'Unknown',
          projectName: project?.name ?? 'Unknown',
          quantity: order.quantity,
          totalAmount: order.totalAmount,
          currency: order.currency,
          serials: order.serials,
          status: order.status,
          createdAt: order.createdAt,
        };
      }),
    );

    return enriched;
  },
});
