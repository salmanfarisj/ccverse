import Link from 'next/link';
import { getSessionData } from '@/lib/session';
import { getDashboardPath } from '@/lib/rbac/dashboard';

export async function getCertificateBackLink(): Promise<{ href: string; label: string }> {
  const session = await getSessionData();

  if (!session.userId) {
    return { href: '/marketplace', label: '← Marketplace' };
  }

  const role = (session.role ?? '').toUpperCase();
  if (role === 'BUYER') {
    return { href: '/buyer', label: '← My purchases' };
  }

  return { href: getDashboardPath(session.role), label: '← Dashboard' };
}

export function CertificateBackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="font-jetbrains-mono text-[13px] !text-drift-ash !no-underline hover:!text-lime-surveyor"
    >
      {label}
    </Link>
  );
}
