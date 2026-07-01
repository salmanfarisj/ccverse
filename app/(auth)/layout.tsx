import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your CC Verse account.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
