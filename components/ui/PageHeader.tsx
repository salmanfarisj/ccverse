import type { ReactNode } from 'react';
import { DataTag } from '@/components/ui/DataTag';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <DataTag variant="outline">{eyebrow}</DataTag>
        <h1 className="mt-4 font-nb-international-pro text-[length:var(--text-heading)] leading-[var(--leading-heading)] tracking-[var(--tracking-heading)] text-bone-vellum">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[68ch] font-nb-international-pro text-[length:var(--text-body)] leading-[var(--leading-body)] tracking-[var(--tracking-body)] text-bone-vellum/80">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
