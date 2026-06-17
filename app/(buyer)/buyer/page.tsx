import { requireRole } from '@/lib/rbac';

export default async function BuyerPage() {
  await requireRole(['BUYER']);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam text-lime">
      <div className="space-y-4 px-6 text-center">
        <h1 className="font-mono text-4xl font-bold tracking-tight">Buyer Dashboard</h1>
        <p className="text-lime/70">
          This section is under construction. Full buyer flows land in Phase 1.
        </p>
      </div>
    </main>
  );
}
