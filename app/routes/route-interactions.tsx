'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { installFoundation } from './foundation-motion';
import { installOffField } from './off-field-motion';
import { installOnField } from './on-field-motion';
import { installPartnerships } from './partnerships-motion';
import { animateVisibility, type Media } from './route-motion';
import type { ReferenceRoute } from './route-page';

function MediaDialog({ media, close }: { media: Media; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState(media.src);

  useEffect(() => {
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, []);

  function retry() {
    const original = new URLSearchParams(new URL(media.src).hash.slice(1)).get('sanity');
    if (source === media.src && original) {
      setSource(`https://cdn.sanity.io/files/${original}`);
    } else setFailed(true);
  }

  return (
    <dialog ref={dialog} className="reference-media-dialog" aria-label={media.title} data-video-error={failed || undefined}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <button type="button" aria-label="Close video" onClick={close}>×</button>
      {failed ? <a href={source} target="_blank" rel="noreferrer">Open video ↗</a> : (
        <video src={source} poster={media.poster} autoPlay controls playsInline onError={retry} />
      )}
    </dialog>
  );
}

const install = {
  'on-field': installOnField,
  'off-field': installOffField,
  foundation: installFoundation,
  partnerships: installPartnerships,
};

export function RouteInteractions({ route, children }: { route: ReferenceRoute; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const router = useRouter();

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const controller = new AbortController();
    const { signal } = controller;
    animateVisibility(element, signal);
    install[route](element, signal, setMedia);
    element.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href^="/"]:not([target]):not([download])');
      if (!link || link.origin !== location.origin) return;
      event.preventDefault();
      router.push(link.pathname + link.search + link.hash);
    }, { signal });
    element.dataset.motionReady = '';
    return () => {
      controller.abort();
      delete element.dataset.motionReady;
    };
  }, [route, router]);

  return <div ref={root}>{children}{media && <MediaDialog key={media.src} media={media} close={() => setMedia(null)} />}</div>;
}
