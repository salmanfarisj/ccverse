import { AuthNav } from '@/components/nav/AuthNav';
import { PublicNav } from '@/components/nav/PublicNav';
import { getSessionData } from '@/lib/session';

type SiteNavProps = {
  transparent?: boolean;
};

export async function SiteNav({ transparent = false }: SiteNavProps) {
  const session = await getSessionData();

  if (session.userId && session.role) {
    return <AuthNav role={session.role} />;
  }

  return <PublicNav transparent={transparent} />;
}
