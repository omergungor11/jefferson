import type { Metadata } from 'next';
import { RoutePage } from '../routes/route-page';
import sections from '../routes/foundation.json';

export const metadata: Metadata = { title: 'Foundation' };

export default function Page() {
  return <RoutePage route="foundation" sections={sections} />;
}
