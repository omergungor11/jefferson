import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '../legal/legal-page';

export const metadata: Metadata = { title: 'Terms of Use' };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="By accessing this website you agree to these Terms of Use."
      sections={[
        ['About this site', 'This website is a concept recreation of Justin Jefferson’s personal website. Team and league trademarks belong to their respective owners.'],
        ['Intellectual property', 'The reference images, video, logos, and other third-party content belong to their respective rights holders. Their appearance in this concept does not grant a license to reuse them.'],
        ['Use of the site', 'Use the site lawfully and respect its operation, security, and availability.'],
        ['Inquiries', <>Messages sent through the <Link prefetch={false} href="/inquiries">Inquiries</Link> page go to the recipients listed on the reference site.</>],
        ['Disclaimers', 'Statistics, dates, and event details may change. For current details, consult the original sources.'],
        ['Limitation of liability', 'Third-party links and embeds are governed by the terms of the sites that provide them.'],
        ['Changes', 'The date above reflects the reference design.'],
      ]}
    />
  );
}
