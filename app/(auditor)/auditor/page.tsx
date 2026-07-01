import { requireRole } from '@/lib/rbac';
import { AuthNav } from '@/components/nav/AuthNav';

export default async function AuditorPage() {
  const session = await requireRole(['AUDITOR']);

  return (
    <>
      <AuthNav role={session.role} />
      <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam text-lime-surveyor pt-[80px]">
        <div className="space-y-4 px-6 text-center">
          <h1 className="font-mono text-4xl font-bold tracking-tight">Auditor Console</h1>
          <p className="text-drift-ash">
            This section is under construction. Full auditor flows land in Phase 4.
          </p>
        </div>
      </main>
    </>
  );
}
