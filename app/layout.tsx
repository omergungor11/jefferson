import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SiteShell } from './site-shell';
import SiteTransition from './site-transition';

export const metadata: Metadata = {
  title: { default: 'Justin Jefferson', template: '%s · Justin Jefferson' },
  description: 'Explore the world of Justin Jefferson, on and off the field.',
  icons: { icon: '/home/logo.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
        <SiteTransition />
      </body>
    </html>
  );
}
