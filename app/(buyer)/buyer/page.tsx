import { requireRole } from '@/lib/rbac';
import { AuthNav } from '@/components/nav/AuthNav';
import { BuyerOrdersClient } from './BuyerOrdersClient';

export const metadata = {
  title: 'My Purchases',
  description: 'View your purchased carbon credits and certificates.',
};

export const dynamic = 'force-dynamic';

export default async function BuyerPage() {
  const session = await requireRole(['BUYER']);

  return (
    <>
      <AuthNav role={session.role} />
      <main
        id="main"
        className="flex min-h-screen flex-col bg-obsidian-loam main-offset"
        tabIndex={-1}
      >
        <BuyerOrdersClient />
      </main>
    </>
  );
}
