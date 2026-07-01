import { LimeButton } from '@/components/ui/LimeButton';

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
};

export function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-iron-filings bg-surface-raised p-[var(--spacing-29)] text-center">
      <p className="font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
        {title}
      </p>
      <p className="mt-3 font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] text-bone-vellum/80">
        {description}
      </p>
      <div className="mt-6">
        <LimeButton href={ctaHref}>{ctaLabel}</LimeButton>
      </div>
    </div>
  );
}
