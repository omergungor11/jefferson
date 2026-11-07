'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from './site-shell';
import './site-transition.css';

export default function SiteTransition() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const [progress, setProgress] = useState(0);
  const [intro, setIntro] = useState(pathname !== '/');
  const [routeVersion, setRouteVersion] = useState(0);

  useEffect(() => {
    if (!intro) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setIntro(false); return; }
    let frame = 0;
    let timeout: ReturnType<typeof setTimeout>;
    let ready = false;
    const start = performance.now();
    void document.fonts.ready.then(() => { ready = true; });

    const tick = (now: number) => {
      const elapsed = now - start;
      const finished = (ready && elapsed > 950) || elapsed > 1600;
      setProgress(finished ? 100 : Math.floor(97 * (1 - (1 - Math.min(1, elapsed / 1000)) ** 2)));
      if (finished) timeout = setTimeout(() => setIntro(false), 430);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clearTimeout(timeout); };
  }, [intro]);

  useEffect(() => {
    if (pathname === previousPath.current) return;
    previousPath.current = pathname;
    setRouteVersion((version) => version + 1);
  }, [pathname]);

  return (
    <>
      {intro && (
        <div className="site-intro" aria-hidden="true" data-finished={progress === 100 || undefined}>
          <div className="site-intro-mark">
            <BrandMark />
            <div className="site-intro-fill" style={{ clipPath: `inset(${100 - progress}% 0 0)` }}><BrandMark /></div>
            <span>{progress}%</span>
          </div>
        </div>
      )}
      {routeVersion > 0 && <div key={routeVersion} className="site-route-transition" aria-hidden="true" />}
    </>
  );
}
