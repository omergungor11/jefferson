import type { ReactNode } from 'react';
import './legal.css';

type LegalPageProps = {
  title: string;
  intro: string;
  sections: readonly (readonly [string, ReactNode])[];
};

export default function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <main id="main" tabIndex={-1}>
      <article className="legal-page" data-tone="dark">
        <div className="legal-inner">
          <p className="label-sm legal-label">Legal</p>
          <h1 className="display">{title}</h1>
          <p className="legal-date">Last updated September 1, 2026</p>
          <div className="legal-content">
            <p>{intro}</p>
            {sections.map(([heading, content]) => (
              <section key={heading}>
                <h2 className="heading">{heading}</h2>
                <p>{content}</p>
              </section>
            ))}
          </div>
        </div>
      </article>
    </main>
  );
}
