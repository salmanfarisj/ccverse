import { requireRole } from '@/lib/rbac';
import { AuthNav } from '@/components/nav/AuthNav';
import { PageHeader } from '@/components/ui/PageHeader';

export const metadata = {
  title: 'Auditor Console',
  description: 'Audit and compliance console for CC Verse.',
};

export default async function AuditorPage() {
  const session = await requireRole(['AUDITOR']);

  return (
    <>
      <AuthNav role={session.role} />
      <main
        id="main"
        className="flex min-h-screen flex-col items-center justify-center bg-obsidian-loam main-offset"
        tabIndex={-1}
      >
        <div className="mx-auto max-w-lg space-y-4 px-6 py-12 text-center">
          <PageHeader
            eyebrow="AUDITOR"
            title="Auditor Console"
            description="This section is under construction. Full auditor flows land in Phase 4."
          />
        </div>
      </main>
    </>
  );
}
