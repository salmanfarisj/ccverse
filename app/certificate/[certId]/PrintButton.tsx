'use client';

import { LimeButton } from '@/components/ui/LimeButton';

export function PrintButton() {
  return (
    <LimeButton type="button" onClick={() => window.print()} className="print:hidden whitespace-nowrap">
      Print certificate
    </LimeButton>
  );
}
