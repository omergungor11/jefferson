import type { Metadata } from 'next';
import { RoutePage } from '../routes/route-page';
import sections from '../routes/off-field.json';

export const metadata: Metadata = { title: 'Off-Field' };

export default function Page() {
  return <RoutePage route="off-field" sections={sections} />;
}
