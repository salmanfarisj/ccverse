import Link from 'next/link';
import { requireRole } from '@/lib/rbac';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex/client';
import { api } from '@/convex/_generated/api';
import { AuthNav } from '@/components/nav/AuthNav';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

export const metadata = {
  title: 'My Purchases',
  description: 'View your purchased carbon credits and certificates.',
};

export const dynamic = 'force-dynamic';

export default async function BuyerPage() {
  const session = await requireRole(['BUYER']);
  const convex = getConvexClient();

  const orders = await convex.query(api.orders.queries.listMyOrders, {
    buyerId: session.userId as Id<'users'>,
  });

  return (
    <>
      <AuthNav role={session.role} />
      <main id="main" className="flex min-h-screen flex-col bg-obsidian-loam main-offset" tabIndex={-1}>
        <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
          <PageHeader
            eyebrow="BUYER"
            title="My Purchases"
            description="Credits you have purchased and retired on the registry."
          />

          {orders.length === 0 ? (
            <EmptyState
              title="No purchases yet"
              description="Browse the marketplace to find verified carbon credits for your portfolio."
              ctaLabel="Browse marketplace"
              ctaHref="/marketplace"
            />
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-md border border-iron-filings bg-surface-raised p-5"
                >
                  <div>
                    <p className="font-nb-international-pro text-[length:var(--text-body)] !text-bone-vellum">
                      {order.listingTitle}
                    </p>
                    <p className="font-jetbrains-mono text-[12px] text-bone-vellum/70">
                      {order.projectName} · {formatNumber(order.quantity)} credits ·{' '}
                      {formatCurrency(order.totalAmount, order.currency)} ·{' '}
                      {formatDate(order.createdAt)}
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
