import type { Metadata } from 'next';
import './inquiries.css';

export const metadata: Metadata = { title: 'Inquiries' };

const contacts = [
  { title: 'Partnerships', email: 'partnerships', subject: 'Partnership', details: 'Brand partnerships, endorsements, and campaign collaborations.' },
  { title: 'Media & Press', email: 'media', subject: 'Media', details: 'Interviews, features, and press inquiries.' },
  { title: 'Booking & Appearances', email: 'booking', subject: 'Booking', details: 'Events, appearances, and booking requests.' },
];

export default function Inquiries() {
  return (
    <main id="main" tabIndex={-1}>
      <section className="inquiries-page" data-inquiries-page data-tone="dark">
        <p className="display inquiries-title" aria-hidden="true">Inquiries</p>
        <div className="inquiries-content">
          <h1 className="display inquiries-headline">Partner with Justin</h1>
          <div className="inquiries-cards">
            {contacts.map(({ title, email, subject, details }) => (
              <a className="inquiry-card" key={email} href={`mailto:${email}@jjettas.com?subject=${encodeURIComponent(`${subject} Inquiry for `)}`}>
                <div className="inquiry-card-copy">
                  <span className="label-sm">Details</span>
                  <h2 className="heading">{title}</h2>
                  <span className="inquiry-email">{email}@<wbr />jjettas.com</span>
                </div>
                <div className="inquiry-card-bottom">
                  <p>{details}</p>
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M6 16L16 6M16 6H7.5M16 6V14.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
