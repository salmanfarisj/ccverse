'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DataTag } from '@/components/ui/DataTag';

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

export function ListingDetailClient({ listing }: { listing: ListingDetail }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const total = listing.unitPrice * quantity;

  async function handleBuy() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, quantity }),
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'Purchase failed');
        return;
      }

      router.push(`/certificate/${data.certificateId}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <DataTag variant="solid">{listing.ccverseProjectId}</DataTag>
        <h1 className="mt-4 font-jetbrains-mono text-3xl font-bold tracking-tight text-bone-vellum">
          {listing.title}
        </h1>
        <p className="mt-2 font-jetbrains-mono text-[14px] text-drift-ash">{listing.projectName}</p>
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
          <p className="font-jetbrains-mono text-[13px] leading-relaxed text-bone-vellum">
            {listing.description}
          </p>
        </div>

        <div className="rounded-md border border-iron-filings bg-[#141414] p-6 space-y-6">
          <div>
            <p className="font-jetbrains-mono text-[13px] text-drift-ash">Price per credit</p>
            <p className="font-jetbrains-mono text-3xl font-bold text-lime-surveyor">
              {listing.currency} {listing.unitPrice}
            </p>
            <p className="mt-1 font-jetbrains-mono text-[12px] text-drift-ash">
              {listing.quantityAvailable} of {listing.quantityTotal} available
            </p>
          </div>

          {listing.status === 'ACTIVE' && listing.quantityAvailable > 0 ? (
            <>
              <div className="flex flex-col gap-[var(--spacing-7)]">
                <label
                  htmlFor="quantity"
                  className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-bone-vellum"
                >
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  min={1}
                  max={listing.quantityAvailable}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-transparent text-[14px] text-bone-vellum border-0 border-b border-iron-filings rounded-none px-0 py-[var(--spacing-7)] focus:outline-none focus:border-lime-surveyor"
                />
              </div>

              <p className="font-jetbrains-mono text-[14px] text-bone-vellum">
                Total: <span className="text-lime-surveyor font-bold">{listing.currency} {total}</span>
              </p>

              {error && (
                <p className="font-jetbrains-mono text-[13px] text-lime-surveyor" role="alert">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleBuy()}
                disabled={loading}
                className="w-full rounded bg-lime-surveyor px-6 py-3 font-jetbrains-mono text-[14px] font-semibold text-obsidian-loam hover:bg-marsh-olive disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Buy (demo pay)'}
              </button>
              <p className="font-jetbrains-mono text-[11px] text-drift-ash text-center">
                Demo mode — no real payment.{' '}
                <Link href="/login" className="!text-lime-surveyor !no-underline">
                  Log in as buyer
                </Link>{' '}
                to purchase.
              </p>
            </>
          ) : (
            <p className="font-jetbrains-mono text-[13px] text-drift-ash">This listing is sold out.</p>
          )}
        </div>
      </div>
    </div>
  );
}
