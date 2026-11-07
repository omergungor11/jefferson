'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { SignatureMark } from '../site-shell';
import items from './items.json';
import './journal.css';

type JournalItem = (typeof items)[number];
const tileWidth = 3900;
const tileHeight = 6160;
const mobileQuery = '(max-width: 767px), (max-width: 900px) and (pointer: coarse)';
const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
const framed = (item: JournalItem) => item.id.startsWith('photo-') || item.id === 'card-prizm-debut';
const imageUrl = (item: JournalItem, width: number) => {
  if (item.id === 'cleat-lv') return '/on-field/cleats/cleat-gold-3d.webp';
  if (!item.src.startsWith('https://cdn.sanity.io/')) return item.src;
  return `${item.src}?w=${width}&fit=max&fm=webp&q=84`;
};

function JournalField({ select, activeIndex }: { select: (index: number) => void; activeIndex: number }) {
  const field = useRef<HTMLDivElement>(null);
  const itemElements = useRef<(HTMLButtonElement | null)[]>([]);
  const paint = useRef<() => void>(() => {});
  const camera = useRef({ x: 0, y: 0, tx: 0, ty: 0, x0: 0, y0: 0, pointer: -1, dragged: false, vx: 0, vy: 0 });

  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const state = camera.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = matchMedia(mobileQuery);
    let frame = 0;
    let width = element.clientWidth;
    let height = element.clientHeight;
    let scale = 1;
    const render = () => {
      frame = 0;
      const ease = reduced.matches ? 1 : state.pointer < 0 ? .17 : .47;
      state.x += (state.tx - state.x) * ease;
      state.y += (state.ty - state.y) * ease;
      let closest = -1;
      let nearest = Infinity;

      items.forEach((item, index) => {
        const button = itemElements.current[index];
        if (!button) return;
        const tileY = Math.round((state.y - item.y) / tileHeight);
        const tileX = Math.round((state.x - item.x - tileY * 975) / tileWidth);
        const x = (item.x + tileX * tileWidth + tileY * 975 - state.x) * scale;
        const y = (item.y + tileY * tileHeight + tileX * 880 - state.y) * scale;
        const w = item.width * scale;
        const h = item.height * scale;
        button.style.width = `${w}px`;
        button.style.height = `${h}px`;
        button.style.transform = `translate3d(${x - w / 2}px, ${y - h / 2}px, 0)`;
        const visible = Math.abs(x) < width / 2 + w * .6 && Math.abs(y) < height / 2 + h * .6;
        button.toggleAttribute('data-visible', visible);
        const distance = x * x + y * y;
        if (distance < nearest) { nearest = distance; closest = index; }
      });
      itemElements.current.forEach((item, index) => item?.toggleAttribute('data-centered', index === closest));
      if (Math.abs(state.tx - state.x) + Math.abs(state.ty - state.y) > .05) frame = requestAnimationFrame(render);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(render); };
    const resize = () => {
      width = element.clientWidth;
      height = element.clientHeight;
      scale = mobile.matches ? Math.min(.58, width / 900) : Math.min(1.25, Math.max(.72, width / 1440));
      element.style.setProperty('--journal-scale', `${scale}`);
      queue();
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const factor = event.deltaMode === 1 ? 16 : 1;
      state.tx += (event.shiftKey ? event.deltaY : event.deltaX) * factor / scale;
      state.ty += (event.shiftKey ? 0 : event.deltaY) * factor / scale;
      queue();
    };
    const resizeObserver = new ResizeObserver(resize);
    paint.current = queue;
    resizeObserver.observe(element);
    resize();
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      paint.current = () => {};
      resizeObserver.disconnect();
      element.removeEventListener('wheel', wheel);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (activeIndex < 0) return;
    const item = items[activeIndex];
    camera.current.tx = item.x - 300;
    camera.current.ty = item.y - 10;
    paint.current();
  }, [activeIndex]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    Object.assign(camera.current, { pointer: event.pointerId, x0: event.clientX, y0: event.clientY, dragged: false, vx: 0, vy: 0 });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = camera.current;
    if (event.pointerId !== state.pointer) return;
    const dx = event.clientX - state.x0;
    const dy = event.clientY - state.y0;
    if (!state.dragged && Math.hypot(dx, dy) < 6) return;
    if (!state.dragged) {
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
      state.dragged = true;
    }
    const scale = Number(event.currentTarget.style.getPropertyValue('--journal-scale')) || 1;
    state.tx -= dx / scale;
    state.ty -= dy / scale;
    state.vx = dx / scale;
    state.vy = dy / scale;
    state.x0 = event.clientX;
    state.y0 = event.clientY;
    paint.current();
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    const state = camera.current;
    if (event.pointerId !== state.pointer) return;
    state.pointer = -1;
    if (state.dragged && event.type === 'pointerup' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      state.tx -= Math.max(-150, Math.min(150, state.vx * 3));
      state.ty -= Math.max(-150, Math.min(150, state.vy * 3));
    }
    delete event.currentTarget.dataset.dragging;
    paint.current();
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = arrows[event.key];
    if (!direction) return;
    event.preventDefault();
    camera.current.tx += direction[0] * 240;
    camera.current.ty += direction[1] * 240;
    paint.current();
  }

  return (
    <div className="journal-field" ref={field} inert={activeIndex >= 0} aria-label="Journal items" role="region" onKeyDown={keyDown}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
      onClickCapture={(event) => { if (camera.current.dragged && event.detail) { event.preventDefault(); event.stopPropagation(); } }}>
      {items.map((item, index) => (
        <button key={item.id} className={`journal-object ${framed(item) ? 'journal-object-framed' : ''}`} type="button" aria-label={item.label}
          data-journal-item={item.id} data-sheen={item.sheen || undefined} data-selected={activeIndex === index || undefined} ref={(element) => { itemElements.current[index] = element; }}
          style={{ '--rotation': `${item.rotation}deg`, '--initial-w': `${item.width}px`, '--initial-h': `${item.height}px`, '--initial-x': `${item.x - item.width / 2}px`, '--initial-y': `${item.y - item.height / 2}px` } as CSSProperties}
          onClick={() => select(index)}
          onPointerMove={(event) => {
            if (event.pointerType !== 'mouse' || camera.current.pointer >= 0) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - .5;
            const y = (event.clientY - rect.top) / rect.height - .5;
            event.currentTarget.style.setProperty('--journal-rx', `${-y * 13}deg`);
            event.currentTarget.style.setProperty('--journal-ry', `${x * 17}deg`);
          }}
          onFocus={(event) => {
            if (!event.currentTarget.matches(':focus-visible')) return;
            camera.current.tx = item.x;
            camera.current.ty = item.y;
            paint.current();
          }}>
          <span className="journal-object-media">
            <img src={imageUrl(item, 650)} alt="" width={item.width} height={item.height} loading={index === 0 ? 'eager' : 'lazy'} draggable={false} />
          </span>
          <span className="label-sm journal-object-caption" aria-hidden="true">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function JournalDetail({ item, close, step }: { item: JournalItem; close: () => void; step: (offset: number) => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => { body.current?.scrollTo(0, 0); }, [item.id]);

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
    if (event.key !== 'Tab') return;
    const focusables = [...event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], iframe')].filter((element) => element.offsetWidth > 0 && element.tabIndex !== -1);
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  const video = item.contentKind === 'video' && !!item.videoId;
  return (
    <div className="journal-detail" data-video={video || undefined} role="dialog" aria-modal="true" aria-labelledby="journal-detail-title" onKeyDown={keyDown} ref={body}>
      <button type="button" className="journal-backdrop" tabIndex={-1} aria-label="Close journal item" onClick={close} />
      <button type="button" className="journal-close" ref={closeButton} aria-label="Close detail" onClick={close}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" stroke="currentColor" strokeWidth="1.5" /></svg>
      </button>
      <div className="journal-detail-stage" key={item.id}>
        <img src={imageUrl(item, 1100)} alt="" width={item.width} height={item.height} />
      </div>
      <article className="journal-card" key={`${item.id}-card`}>
        <div className="journal-folder-tab" aria-hidden="true">
          <SignatureMark /><span>×</span>
          {item.brand === 'Under Armour' ? <img className="journal-brand" src="/journal/ua.png" alt="" /> : <span>{item.brand || 'JJets'}</span>}
        </div>
        <div className="journal-card-body">
          {video && (
            <iframe className="journal-video" src={`https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0&playsinline=1`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen title={item.label} />
          )}
          {!video && <img className="journal-mobile-object" src={imageUrl(item, 900)} alt="" width={item.width} height={item.height} />}
          <h2 id="journal-detail-title" className="heading">{item.label}</h2>
          {item.body && <p>{item.body}</p>}
          <dl>{item.details.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {item.link && <a className="journal-outbound" href={item.link} target="_blank" rel="noreferrer">{item.cta || (video ? 'Watch on YouTube' : 'Explore')}</a>}
        </div>
      </article>
      <div className="journal-step">
        <button type="button" aria-label="Previous item" onClick={() => step(-1)}>‹</button>
        <button type="button" aria-label="Next item" onClick={() => step(1)}>›</button>
      </div>
    </div>
  );
}

export default function Journal() {
  const [index, setIndex] = useState(-1);
  const lastFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(location.search).get('item');
      setIndex(items.findIndex((item) => item.id === id));
    };
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  function update(next: number, replace: boolean) {
    const url = new URL(location.href);
    if (next >= 0) url.searchParams.set('item', items[next].id);
    else url.searchParams.delete('item');
    const fromField = next >= 0 && (!replace || history.state?.journalDetailFromField === true);
    history[replace ? 'replaceState' : 'pushState']({ journalDetailFromField: fromField }, '', url);
    setIndex(next);
  }

  function close() {
    if (history.state?.journalDetailFromField) {
      history.back();
    } else {
      update(-1, true);
    }
  }

  useEffect(() => {
    if (index !== -1) return;
    lastFocused.current?.focus({ preventScroll: true });
    lastFocused.current = null;
  }, [index]);

  return (
    <section className="journal-page" data-journal-page data-tone="dark" data-detail={index >= 0 || undefined}>
      <JournalField activeIndex={index} select={(next) => {
        lastFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        update(next, false);
      }} />
      <h1 className="display journal-title">Journal</h1>
      {index >= 0 ? <JournalDetail item={items[index]} close={close} step={(offset) => update((index + offset + items.length) % items.length, true)} /> : (
        <p className="journal-hint"><span>Drag · scroll · click</span><span>Swipe · tap</span></p>
      )}
    </section>
  );
}
