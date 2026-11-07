import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '../legal/legal-page';

export const metadata: Metadata = { title: 'Privacy Policy' };

const inquiries = <Link prefetch={false} href="/inquiries">Inquiries</Link>;

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy describes what information is collected when you visit this website and how it is used."
      sections={[
        ['Information we collect', <>When you reach out through the {inquiries} page, the links open your own email app, and your message arrives by email with your name and address.</>],
        ['How we use it', 'Inquiry emails are handled by the listed recipients. They can use your message and address to review and respond to your request.'],
        ['Third-party services', 'Images, fonts, and video load from their respective providers. Some journal entries embed a YouTube player, and YouTube may set its own cookies when you play one. Links out to social platforms are governed by those platforms’ terms.'],
        ['Cookies & analytics', 'This concept site does not include advertising cookies or a site analytics integration.'],
        ['Children', 'The site does not ask visitors to submit personal information.'],
        ['Your choices', <>For information sent by email, contact the recipients through the addresses on the {inquiries} page.</>],
        ['Changes', 'The date above reflects the reference design.'],
      ]}
    />
  );
}
