import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { RouteFocusManager } from '@/components/nav/RouteFocusManager';
import { ToastProvider } from '@/components/ui/Toast';
import { getEnv } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  // Resolve relative og/twitter image URLs against the public app origin
  // (per Next.js metadataBase contract). Sourced from env so the production
  // build uses the real `APP_ORIGIN` rather than the localhost fallback.
  metadataBase: new URL(getEnv().APP_ORIGIN),
  title: {
    default: 'CC Verse',
    template: '%s · CC Verse',
  },
  description: 'Verified carbon credits, end to end.',
  applicationName: 'CC Verse',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#13140e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <RouteFocusManager />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
