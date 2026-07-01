import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your CC Verse account profile and settings.',
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
