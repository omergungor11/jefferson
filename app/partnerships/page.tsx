import type { Metadata } from 'next';
import { RoutePage } from '../routes/route-page';
import sections from '../routes/partnerships.json';

export const metadata: Metadata = { title: 'Partnerships' };

export default function Page() {
  return <RoutePage route="partnerships" sections={sections} />;
}
