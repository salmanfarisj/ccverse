import { query } from '../_generated/server';
import { v } from 'convex/values';

async function enrichListing(
  ctx: {
    db: {
      get: (
        id: import('../_generated/dataModel').Id<'projects'>,
      ) => Promise<import('../_generated/dataModel').Doc<'projects'> | null>;
    };
  },
  listing: import('../_generated/dataModel').Doc<'listings'>,
) {
  const project = await ctx.db.get(listing.projectId);
  return {
    id: listing._id,
    sellerId: listing.sellerId,
    projectId: listing.projectId,
    title: listing.title,
    quantityTotal: listing.quantityTotal,
    quantityAvailable: listing.quantityAvailable,
    unitPrice: listing.unitPrice,
    currency: listing.currency,
    status: listing.status,
    createdAt: listing.createdAt,
    projectName: project?.name ?? 'Unknown',
    ccverseProjectId: project?.ccverseProjectId ?? '',
    country: project?.country ?? '',
    vintageYear: project?.vintageYear ?? 0,
  };
}

export const listActiveListings = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db
      .query('listings')
      .withIndex('by_status', (q) => q.eq('status', 'ACTIVE'))
      .collect();

    listings.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(listings.map((l) => enrichListing(ctx, l)));
    return enriched;
  },
});

export const getListing = query({
  args: {
    listingId: v.id('listings'),
  },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.listingId);
    if (!listing) {
      return { found: false as const };
    }

    const project = await ctx.db.get(listing.projectId);

    return {
      found: true as const,
      listing: {
        id: listing._id,
        sellerId: listing.sellerId,
        projectId: listing.projectId,
        title: listing.title,
        quantityTotal: listing.quantityTotal,
        quantityAvailable: listing.quantityAvailable,
        unitPrice: listing.unitPrice,
        currency: listing.currency,
        status: listing.status,
        createdAt: listing.createdAt,
        projectName: project?.name ?? 'Unknown',
        ccverseProjectId: project?.ccverseProjectId ?? '',
        country: project?.country ?? '',
        projectType: project?.projectType ?? '',
        methodology: project?.methodology ?? '',
        vintageYear: project?.vintageYear ?? 0,
        description: project?.description ?? '',
      },
    };
  },
});

export const listMyListings = query({
  args: {
    sellerId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query('listings')
      .withIndex('by_sellerId', (q) => q.eq('sellerId', args.sellerId))
      .collect();

    listings.sort((a, b) => b.createdAt - a.createdAt);

    const enriched = await Promise.all(
      listings.map(async (listing) => {
        const base = await enrichListing(ctx, listing);
        const sold = listing.quantityTotal - listing.quantityAvailable;
        return { ...base, sold };
      }),
    );

    return enriched;
  },
});
