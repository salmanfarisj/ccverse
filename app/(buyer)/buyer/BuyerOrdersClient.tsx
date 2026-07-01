'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Crossfade } from '@/components/motion';
import { Stagger, StaggerItem } from '@/components/motion';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { apiGet } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';

type BuyerOrder = {
  id: string;
  listingTitle: string;
  projectName: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  serials: string[];
  certificateId: string | null;
};

type OrdersResponse = {
  orders: BuyerOrder[];
};

const REFETCH_INTERVAL = 30_000;

export function BuyerOrdersClient() {
  const { data, isPending, isError } = useQuery({
    queryKey: qk.buyerOrders,
    queryFn: () => apiGet<OrdersResponse>('/api/orders'),
    refetchInterval: REFETCH_INTERVAL,
  });

  const orders = data?.orders ?? [];
  const isLoading = isPending && !data;

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
        <PageHeader eyebrow="BUYER" title="My Purchases" description="Failed to load purchases." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-6 py-12">
      <PageHeader
        eyebrow="BUYER"
        title="My Purchases"
        description="Credits you have purchased and retired on the registry."
      />

      <Crossfade showContent={!isLoading} skeleton={<PageSkeleton />}>
        {orders.length === 0 ? (
          <EmptyState
            title="No purchases yet"
            description="Browse the marketplace to find verified carbon credits for your portfolio."
            ctaLabel="Browse marketplace"
            ctaHref="/marketplace"
          />
        ) : (
          <Stagger className="space-y-3">
            {orders.map((order) => (
              <StaggerItem key={order.id}>
                <div className="flex items-center justify-between rounded-md border border-iron-filings bg-surface-raised p-5">
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
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </Crossfade>
    </div>
  );
}
