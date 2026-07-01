import type { ReactNode } from 'react';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  const base = 'animate-pulse rounded-sm bg-iron-filings/40';
  return <div className={className ? `${base} ${className}` : base} aria-hidden="true" />;
}

type SkeletonGroupProps = {
  children: ReactNode;
  label?: string;
};

/** Container with aria-busy for loading states. */
export function SkeletonGroup({ children, label = 'Loading content' }: SkeletonGroupProps) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-4">
      {children}
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <SkeletonGroup label="Loading account">
      <Skeleton className="h-10 w-48" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 rounded-md border border-iron-filings bg-surface-raised p-8">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="rounded-md border border-iron-filings bg-surface-raised p-8 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    </SkeletonGroup>
  );
}

export function KycSkeleton() {
  return (
    <SkeletonGroup label="Loading KYC">
      <div className="text-center space-y-3">
        <Skeleton className="mx-auto h-8 w-56" />
        <Skeleton className="mx-auto h-4 w-72" />
      </div>
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-6 rounded-full" />
        ))}
      </div>
      <div className="space-y-4 rounded-md border border-iron-filings bg-surface-raised p-6">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </SkeletonGroup>
  );
}

export function PageSkeleton() {
  return (
    <SkeletonGroup label="Loading page">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    </SkeletonGroup>
  );
}
