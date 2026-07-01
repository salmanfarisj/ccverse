import { requireRole } from '@/lib/rbac';
import { AuthNav } from '@/components/nav/AuthNav';
import { SellerDashboardClient } from './SellerDashboardClient';

export const metadata = {
  title: 'Seller Dashboard',
  description: 'Manage projects, listings, and sales on CC Verse.',
};

export const dynamic = 'force-dynamic';

export default async function SellerDashboardPage() {
  const session = await requireRole(['SELLER']);

  return (
    <>
      <AuthNav role={session.role} />
      <main
        id="main"
        className="flex min-h-screen flex-col bg-obsidian-loam main-offset"
        tabIndex={-1}
      >
        <SellerDashboardClient />
      </main>
    </>
  );
}
