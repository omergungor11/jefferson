'use client';

import Link from 'next/link';
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import cards from './closing-cards.json';
import './closing.css';

const shapes = [
  [44, 62.86, 6, -3], [54, 67.14, -4, 2], [48, 64.57, 7, -2], [56, 68, 1, 3],
  [46, 63.71, 8, -3], [48, 64.57, 3, 2], [42, 62, -5, -2], [50, 65.43, 6, 3],
] as const;

export default function HomeClosing() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const motion = useRef({ offset: 0, velocity: 0, pointer: -1, x: 0, start: 0, dragged: false, focusOffset: null as number | null });

  useEffect(() => {
    const frame = section.current;
    const rail = track.current;
    const firstGroup = group.current;
    if (!frame || !rail || !firstGroup) return;

    const state = motion.current;
    const footer = document.querySelector<HTMLElement>('.jj-footer');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let width = firstGroup.offsetWidth;
    let animation = 0;
    let previous = 0;
    let scrollFrame = 0;
    const updateFooter = () => {
      scrollFrame = 0;
      if (!footer) return;
      const top = footer.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, (innerHeight - top) / (innerHeight * .66)));
      footer.style.setProperty('--play-footer-fade', reduced.matches ? '0' : `${(1 - progress) * 100}%`);
    };
    const scroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateFooter); };
    const resize = new ResizeObserver(() => { width = firstGroup.offsetWidth; });
    const render = (now: number) => {
      const delta = Math.min(34, now - (previous || now));
      previous = now;
      if (state.pointer < 0 && state.focusOffset === null) {
        state.offset += (state.velocity - (reduced.matches ? 0 : .029)) * delta;
        state.velocity *= Math.pow(.91, delta / 16.7);
      }
      if (width) {
        const wrapped = ((state.offset % width) + width) % width;
        rail.style.transform = `translate3d(${state.focusOffset ?? wrapped - width}px, 0, 0)`;
      }
      if (visible) animation = requestAnimationFrame(render);
    };
    const observe = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(animation);
      previous = 0;
      if (visible) animation = requestAnimationFrame(render);
    });
    resize.observe(firstGroup);
    observe.observe(frame);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    updateFooter();
    return () => {
      resize.disconnect(); observe.disconnect(); cancelAnimationFrame(animation); cancelAnimationFrame(scrollFrame);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', scroll);
      footer?.style.removeProperty('--play-footer-fade');
    };
  }, []);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    Object.assign(motion.current, { pointer: event.pointerId, x: event.clientX, start: event.clientX, velocity: 0, dragged: false, focusOffset: null });
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = motion.current;
    if (event.pointerId !== state.pointer) return;
    if (!state.dragged && Math.abs(event.clientX - state.start) < 6) return;
    if (!state.dragged) event.currentTarget.setPointerCapture(event.pointerId);
    state.dragged = true;
    const movement = event.clientX - state.x;
    state.offset += movement;
    state.velocity = Math.max(-2, Math.min(2, movement / 16));
    state.x = event.clientX;
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    const state = motion.current;
    if (state.pointer === event.pointerId) state.pointer = -1;
  }

  return (
    <section className="make-a-play" data-section="make-a-play" data-theme="tone-light" ref={section}>
      <h2 className="display"><span>18 is gonna go out there</span><span>and make a play</span></h2>
      <div className="play-rail" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}
        onPointerLeave={(event) => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) pointerEnd(event); }}
        onClickCapture={(event) => {
          if (motion.current.dragged && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
          motion.current.dragged = false;
        }}
        onFocus={(event) => {
          const card = event.target.closest<HTMLElement>('.play-card:focus-visible');
          if (!card || !group.current) return;
          const viewport = event.currentTarget.clientWidth;
          const target = (viewport - card.offsetWidth) / 2 - card.offsetLeft;
          const offset = Math.min(0, Math.max(viewport - group.current.offsetWidth, target));
          motion.current.focusOffset = offset;
          motion.current.offset = offset;
        }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) motion.current.focusOffset = null; }}>
        <div className="play-track" ref={track}>
          {[0, 1].map((copy) => (
            <div className="play-group" key={copy} ref={copy === 0 ? group : undefined} aria-hidden={copy === 1}>
              {cards.map(({ src, caption, href, preview }, index) => {
                const [height, mobile, offset, rotation] = shapes[index % shapes.length];
                const style = { '--play-card-h': height, '--play-card-w': mobile, '--play-offset': `${offset}px`, '--play-rotation': `${rotation}deg`, '--play-preview': `url('${preview}')` } as CSSProperties;
                return (
                  <Link prefetch={false} className="play-card" key={caption} href={href} aria-label={caption} tabIndex={copy === 1 ? -1 : undefined} draggable={false} style={style}>
                    <span className="play-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${src}?w=650&fm=webp&q=82`} alt="" width="480" height="640" loading="lazy" decoding="async" draggable={false} />
                      <span className="play-caption">{caption}<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg></span>
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
