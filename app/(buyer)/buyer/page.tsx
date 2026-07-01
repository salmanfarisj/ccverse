import Link from 'next/link';
import { requireRole } from '@/lib/rbac';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { AuthNav } from '@/components/nav/AuthNav';

export const dynamic = 'force-dynamic';

export default async function BuyerPage() {
  const session = await requireRole(['BUYER']);
  const convex = getConvexClient();

  const orders = await convex.query(api.orders.queries.listMyOrders, {
    buyerId: session.userId as Id<'users'>,
  });

  return (
    <>
      <AuthNav />
      <main className="flex min-h-screen flex-col bg-obsidian-loam pt-[80px]">
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-jetbrains-mono text-3xl font-bold tracking-tight !text-lime-surveyor">
                My Purchases
              </h1>
              <p className="mt-1 font-jetbrains-mono text-[13px] text-drift-ash">
                Credits you have purchased and retired on the registry.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="shrink-0 rounded border border-lime-surveyor px-4 py-2 font-jetbrains-mono text-[13px] !text-lime-surveyor !no-underline hover:bg-lime-surveyor/10"
            >
              Browse marketplace
            </Link>
          </div>

          {orders.length === 0 ? (
            <p className="font-jetbrains-mono text-[13px] text-drift-ash">
              No purchases yet.{' '}
              <Link href="/marketplace" className="!text-lime-surveyor !no-underline">
                Browse the marketplace
              </Link>{' '}
              to buy credits.
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-md border border-iron-filings bg-[#141414] p-5"
                >
                  <div>
                    <p className="font-jetbrains-mono text-[14px] !text-bone-vellum">
                      {order.listingTitle}
                    </p>
                    <p className="font-jetbrains-mono text-[12px] text-drift-ash">
                      {order.projectName} · {order.quantity} credits · {order.currency}{' '}
                      {order.totalAmount} · {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 font-jetbrains-mono text-[11px] text-drift-ash">
                      Serials: {order.serials.join(', ')}
                    </p>
                  </div>
                  {order.certificateId && (
                    <Link
                      href={`/certificate/${order.certificateId}`}
                      className="shrink-0 font-jetbrains-mono text-[12px] !text-lime-surveyor !no-underline hover:underline"
                    >
                      View certificate
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
