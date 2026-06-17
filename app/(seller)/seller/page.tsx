import { requireRole } from '@/lib/rbac';
import { AuthNav } from '@/components/nav/AuthNav';

export default async function SellerPage() {
  await requireRole(['SELLER']);

  return (
    <>
      <AuthNav />
      <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam text-lime pt-[80px]">
        <div className="space-y-4 px-6 text-center">
          <h1 className="font-mono text-4xl font-bold tracking-tight">Seller Dashboard</h1>
          <p className="text-lime/70">
            This section is under construction. Full seller flows land in Phase 2.
          </p>
        </div>
      </main>
    </>
  );
}
