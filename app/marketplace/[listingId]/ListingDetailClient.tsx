'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTag } from '@/components/ui/DataTag';
import { Input } from '@/components/ui/Input';
import { LimeButton } from '@/components/ui/LimeButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatNumber } from '@/lib/format';
import { apiGet, apiSend, isAuthError } from '@/lib/query/fetcher';
import { qk } from '@/lib/query/keys';

type ListingDetail = {
  id: string;
  title: string;
  projectName: string;
  ccverseProjectId: string;
  country: string;
  projectType: string;
  methodology: string;
  vintageYear: number;
  description: string;
  quantityAvailable: number;
  quantityTotal: number;
  unitPrice: number;
  currency: string;
  status: string;
};

type ListingResponse = {
  listing: ListingDetail;
};

type BuyResponse = {
  certificateId: string;
};

type ListingDetailClientProps = {
  listingId: string;
  isAuthenticated: boolean;
  userRole?: string;
};

const REFETCH_INTERVAL = 30_000;

export function ListingDetailClient({
  listingId,
  isAuthenticated,
  userRole,
}: ListingDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: qk.listing(listingId),
    queryFn: () => apiGet<ListingResponse>(`/api/marketplace/${listingId}`),
    refetchInterval: REFETCH_INTERVAL,
  });

  const buyMutation = useMutation({
    mutationFn: () => apiSend<BuyResponse>('/api/orders', 'POST', { listingId, quantity }),
    onSuccess: async (result) => {
      toast('Purchase complete — redirecting to certificate', 'success');
      setConfirmOpen(false);
      await queryClient.invalidateQueries({ queryKey: qk.listing(listingId) });
      await queryClient.invalidateQueries({ queryKey: qk.marketplace });
      await queryClient.invalidateQueries({ queryKey: qk.buyerOrders });
      await router.push(`/certificate/${result.certificateId}`);
    },
    onError: (err) => {
      if (isAuthError(err)) {
        void router.push('/login');
        return;
      }
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      toast(message, 'error');
    },
  });

  if (isPending && !data) {
    return <p className="font-jetbrains-mono text-[13px] text-drift-ash">Loading listing…</p>;
  }

  const listing = data?.listing;
  if (!listing) {
    return <p className="font-jetbrains-mono text-[13px] text-drift-ash">Listing not found.</p>;
  }

  const total = listing.unitPrice * quantity;
  const role = (userRole ?? '').toUpperCase();
  const isBuyer = isAuthenticated && role === 'BUYER';
  const loading = buyMutation.isPending;

  function handleBuy() {
    setError('');
    buyMutation.mutate();
  }

  function renderAuthNote() {
    if (!isAuthenticated) {
      return (
        <p className="font-jetbrains-mono text-[11px] text-drift-ash text-center">
          Demo mode — no real payment.{' '}
          <Link href="/login" className="!text-lime-surveyor !no-underline">
            Log in as buyer
          </Link>{' '}
          to purchase.
        </p>
      );
    }
    if (isBuyer) {
      return (
        <p className="font-jetbrains-mono text-[11px] text-drift-ash text-center">
          Signed in — demo payment only.
        </p>
      );
    }
    return (
      <p className="font-jetbrains-mono text-[11px] text-drift-ash text-center">
        Signed in as {role.toLowerCase()}. Switch to a buyer account to purchase credits.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <DataTag variant="solid">{listing.ccverseProjectId}</DataTag>
        <h1 className="mt-4 font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] text-bone-vellum">
          {listing.title}
        </h1>
        <p className="mt-2 font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum/80">
          {listing.projectName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-lime-surveyor">
            Project details
          </h2>
          <dl className="space-y-2 font-jetbrains-mono text-[13px]">
            <div className="flex justify-between border-b border-iron-filings py-2">
              <dt className="text-drift-ash">Country</dt>
              <dd className="text-bone-vellum">{listing.country}</dd>
            </div>
            <div className="flex justify-between border-b border-iron-filings py-2">
              <dt className="text-drift-ash">Type</dt>
              <dd className="text-bone-vellum">{listing.projectType}</dd>
            </div>
            <div className="flex justify-between border-b border-iron-filings py-2">
              <dt className="text-drift-ash">Methodology</dt>
              <dd className="text-bone-vellum">{listing.methodology}</dd>
            </div>
            <div className="flex justify-between border-b border-iron-filings py-2">
              <dt className="text-drift-ash">Vintage</dt>
              <dd className="text-bone-vellum">{listing.vintageYear}</dd>
            </div>
          </dl>
          <p className="font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] text-bone-vellum/80">
            {listing.description}
          </p>
        </div>

        <div className="rounded-md border border-iron-filings bg-surface-raised p-6 space-y-6">
          <div>
            <p className="font-jetbrains-mono text-[13px] text-drift-ash">Price per credit</p>
            <p className="font-nb-international-pro text-[length:var(--text-subheading)] leading-[var(--leading-subheading)] text-lime-surveyor">
              {formatCurrency(listing.unitPrice, listing.currency)}
            </p>
            <p className="mt-1 font-jetbrains-mono text-[12px] text-bone-vellum/70">
              {formatNumber(listing.quantityAvailable)} of {formatNumber(listing.quantityTotal)}{' '}
              available
            </p>
          </div>

          {listing.status === 'ACTIVE' && listing.quantityAvailable > 0 ? (
            <>
              <Input
                label="Quantity"
                id="quantity"
                type="number"
                min={1}
                max={listing.quantityAvailable}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              />

              <p className="font-nb-international-pro text-[length:var(--text-body)] text-bone-vellum">
                Total:{' '}
                <span className="text-lime-surveyor font-bold">
                  {formatCurrency(total, listing.currency)}
                </span>
              </p>

              {error ? (
                <p className="font-jetbrains-mono text-[13px] text-error" role="alert">
                  {error}
                </p>
              ) : null}

              <LimeButton
                type="button"
                className="w-full whitespace-nowrap"
                disabled={loading}
                onClick={() => setConfirmOpen(true)}
              >
                {loading ? 'Processing…' : 'Buy (demo pay)'}
              </LimeButton>
              {renderAuthNote()}
            </>
          ) : (
            <p className="font-jetbrains-mono text-[13px] text-bone-vellum/70">
              This listing is sold out.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        title="Confirm purchase"
        footer={
          <>
            <GhostButton type="button" disabled={loading} onClick={() => setConfirmOpen(false)}>
              Cancel
            </GhostButton>
            <LimeButton type="button" disabled={loading} onClick={() => void handleBuy()}>
              {loading ? 'Processing…' : 'Confirm purchase'}
            </LimeButton>
          </>
        }
      >
        <dl className="space-y-3 font-jetbrains-mono text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-drift-ash">Project</dt>
            <dd className="text-bone-vellum text-right">{listing.projectName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-drift-ash">Quantity</dt>
            <dd className="text-bone-vellum">{formatNumber(quantity)} credits</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-drift-ash">Unit price</dt>
            <dd className="text-bone-vellum">
              {formatCurrency(listing.unitPrice, listing.currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-iron-filings pt-3">
            <dt className="text-drift-ash">Total</dt>
            <dd className="text-lime-surveyor font-bold">
              {formatCurrency(total, listing.currency)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 font-jetbrains-mono text-[11px] text-drift-ash">
          Demo mode — no real payment will be processed.
        </p>
      </Modal>
    </div>
  );
}
