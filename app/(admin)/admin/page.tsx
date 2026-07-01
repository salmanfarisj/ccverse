import Link from 'next/link';
import { requireRole } from '@/lib/rbac';
import { AuthNav } from '@/components/nav/AuthNav';

export default async function AdminPage() {
  const session = await requireRole(['ADMIN']);

  return (
    <>
      <AuthNav role={session.role} />
      <main id="main" className="min-h-screen bg-obsidian-loam pt-[80px]">
        <div className="mx-auto max-w-[1200px] px-[var(--spacing-18)] py-[var(--spacing-18)]">
          <h1 className="font-jetbrains-mono text-4xl font-bold tracking-tight !text-lime-surveyor">Admin</h1>
          <p className="mt-2 font-jetbrains-mono text-[13px] uppercase tracking-[0.06em] text-drift-ash">
            KYC review and compliance
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <AdminCard
              href="/admin/kyc"
              title="KYC Queue"
              description="Review pending seller KYC applications"
            />
          </div>
        </div>
      </main>
    </>
  );
}

function AdminCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-iron-filings bg-[#141414] p-8 transition-colors hover:border-lime-surveyor !no-underline"
    >
      <h2 className="font-jetbrains-mono text-[14px] uppercase tracking-[0.06em] !text-lime-surveyor">
        {title}
      </h2>
      <p className="mt-2 text-[14px] font-nb-international-pro text-drift-ash">{description}</p>
    </Link>
  );
}
