import type { ReactNode } from 'react';
import { RouteInteractions } from './route-interactions';
import './route-utilities.css';
import './route-style.css';

export type ReferenceRoute = 'on-field' | 'off-field' | 'foundation' | 'partnerships';

export function RoutePage({ route, sections }: { route: ReferenceRoute; sections: readonly string[] }) {
  const content: ReactNode = <div className="reference-layout" dangerouslySetInnerHTML={{ __html: sections.join('') }} />;
  return (
    <main id="main" className="reference-page" data-reference-route={route}
      data-theme={route === 'partnerships' || route === 'foundation' ? 'tone-light' : 'tone-dark'} tabIndex={-1}>
      <RouteInteractions route={route}>{content}</RouteInteractions>
    </main>
  );
}
