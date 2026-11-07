import type { Metadata } from 'next';
import Journal from './journal';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Moments, collaborations, and stories from Justin Jefferson’s world.',
};

export default function JournalPage() {
  return <main id="main" className="journal-main" tabIndex={-1}><Journal /></main>;
}
