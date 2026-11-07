import type { Metadata } from 'next';
import { RoutePage } from '../routes/route-page';
import sections from '../routes/on-field.json';

export const metadata: Metadata = { title: 'On-Field' };

export default function Page() {
  return <RoutePage route="on-field" sections={sections} />;
}
