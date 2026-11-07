export type Media = { title: string; src: string; poster?: string };

export const one = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector<T>(selector);
export const all = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => [...root.querySelectorAll<T>(selector)];
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function animateVisibility(root: HTMLElement, signal: AbortSignal) {
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      if (el.dataset.reveal === 'photo' && el.getBoundingClientRect().left > innerWidth / 2) {
        el.style.setProperty('--photo-entry', '42vw');
      }
      el.dataset.entered = '';
      reveal.unobserve(el);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  all(root, '[data-type-reveal], [data-reveal]').forEach(el => reveal.observe(el));

  for (const image of all<HTMLImageElement>(root, 'img[style*="opacity:0;transition:opacity"]')) {
    const loaded = () => { image.style.opacity = '1'; };
    if (image.complete && image.naturalWidth) loaded();
    else image.addEventListener('load', loaded, { signal, once: true });
  }

  const videos = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      const video = target as HTMLVideoElement;
      if (isIntersecting && !document.hidden) {
        video.muted = true;
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }
  }, { threshold: .2 });
  all<HTMLVideoElement>(root, 'video[src]:not([data-feature-video-preview] video)').forEach(el => {
    el.addEventListener('playing', () => {
      const poster = one(el.parentElement!, '[data-reel-poster]');
      if (poster) poster.style.opacity = '0';
    }, { signal });
    videos.observe(el);
  });
  signal.addEventListener('abort', () => {
    reveal.disconnect();
    videos.disconnect();
  }, { once: true });
}

export function pointerDrag(
  el: HTMLElement,
  signal: AbortSignal,
  handlers: { move: (x: number, y: number, dx: number, dy: number) => void; end?: (dx: number, dy: number) => void },
  twoAxes = false,
) {
  let pointer: number | undefined;
  let x = 0, y = 0, lastX = 0, lastY = 0, moved = false, lastRelease = -Infinity;
  el.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    x = lastX = event.clientX;
    y = lastY = event.clientY;
    moved = false;
  }, { signal });
  window.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointer) return;
    const dx = event.clientX - x, dy = event.clientY - y;
    if (!moved && (Math.hypot(dx, dy) < 6 || (!twoAxes && Math.abs(dy) > Math.abs(dx)))) return;
    if (!moved) {
      el.setPointerCapture(pointer);
      el.dataset.grabbing = '';
      moved = true;
    }
    handlers.move(dx, dy, event.clientX - lastX, event.clientY - lastY);
    lastX = event.clientX;
    lastY = event.clientY;
  }, { signal });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (moved) {
      lastRelease = performance.now();
      handlers.end?.(event.clientX - x, event.clientY - y);
    }
    pointer = undefined;
    delete el.dataset.grabbing;
  };
  window.addEventListener('pointerup', release, { signal });
  window.addEventListener('pointercancel', release, { signal });
  el.addEventListener('click', (event) => {
    if (event.detail && performance.now() - lastRelease < 180) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, { signal, capture: true });
}

export function conveyor(
  track: HTMLElement | undefined | null,
  signal: AbortSignal,
  speed: number,
  update?: (track: HTMLElement, offset: number) => void,
) {
  if (!track?.parentElement || track.children.length < 2) return;
  const viewport = track.parentElement;
  track.dataset.referenceRail = '';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let offset = 0, length = 0, drift = 0, time = 0, frame = 0, visible = false;
  let lastScroll = scrollY;
  const measure = () => {
    length = (track.children[1] as HTMLElement).offsetLeft - (track.children[0] as HTMLElement).offsetLeft;
    if (length <= 0) length = track.scrollWidth / 2;
  };
  const paint = () => {
    if (length > 0) offset = -(((-offset % length) + length) % length);
    track.style.transform = `translate3d(${offset.toFixed(2)}px,0,0)`;
    update?.(track, offset);
  };
  const tick = (now: number) => {
    const elapsed = Math.min(36, now - (time || now));
    const movement = clamp(scrollY - lastScroll, -20, 20);
    time = now;
    lastScroll = scrollY;
    if (visible && !track.hasAttribute('data-grabbing') && !reduced && !track.matches(':focus-within')) {
      offset += speed * elapsed / 16 + drift - movement * .08;
      drift *= .92;
      paint();
    }
    frame = requestAnimationFrame(tick);
  };
  const focus = (event: FocusEvent) => {
    if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible')) return;
    const bounds = viewport.getBoundingClientRect();
    const card = event.target.getBoundingClientRect();
    if (card.left < bounds.left || card.right > bounds.right) {
      offset += bounds.left + bounds.width / 2 - card.left - card.width / 2;
      paint();
    }
  };
  measure();
  const sizing = new ResizeObserver(measure);
  sizing.observe(track);
  const view = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '12% 0px' });
  view.observe(viewport);
  track.addEventListener('focusin', focus, { signal });
  pointerDrag(track, signal, {
    move: (_x, _y, dx) => {
      offset += dx;
      drift = reduced ? 0 : dx * .46;
      paint();
    },
  });
  frame = requestAnimationFrame(tick);
  signal.addEventListener('abort', () => {
    sizing.disconnect();
    view.disconnect();
    cancelAnimationFrame(frame);
  }, { once: true });
  return {
    center(card: HTMLElement) {
      const frame = viewport.getBoundingClientRect();
      const selected = card.getBoundingClientRect();
      const start = offset;
      let delta = frame.left + frame.width / 2 - selected.left - selected.width / 2;
      if (length) delta -= Math.round(delta / length) * length;
      const started = performance.now();
      const ease = (now: number) => {
        if (signal.aborted) return;
        const progress = reduced ? 1 : clamp((now - started) / 480);
        offset = start + delta * (1 - (1 - progress) ** 3);
        paint();
        if (progress < 1) requestAnimationFrame(ease);
      };
      requestAnimationFrame(ease);
    },
  };
}

export function installSnapRails(root: HTMLElement, signal: AbortSignal) {
  for (const rail of all(root, '[data-snap-rail]')) {
    const slides = all(rail, ':scope > li');
    const dots = all<HTMLButtonElement>(root, `button[aria-controls="${CSS.escape(rail.id)}"]`);
    const inset = () => parseFloat(getComputedStyle(rail).paddingLeft) || 0;
    const destination = (index: number) => slides[index].offsetLeft - slides[0].offsetLeft;
    const update = () => {
      const active = slides.reduce((best, _slide, index) => Math.abs(destination(index) - rail.scrollLeft) < Math.abs(destination(best) - rail.scrollLeft) ? index : best, 0);
      slides.forEach((slide, index) => {
        if (index === active) slide.setAttribute('aria-current', 'true');
        else slide.removeAttribute('aria-current');
      });
      dots.forEach((dot, index) => {
        if (index === active) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
        dot.tabIndex = index === active ? 0 : -1;
        const indicator = dot.firstElementChild as HTMLElement;
        indicator.style.width = index === active ? '18px' : '6px';
        indicator.style.opacity = index === active ? '.9' : '.3';
      });
    };
    const select = (index: number) => rail.scrollTo({ left: destination(index), behavior: 'smooth' });
    rail.addEventListener('scroll', update, { passive: true, signal });
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => select(index), { signal });
      dot.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const target = clamp(index + (event.key === 'ArrowRight' ? 1 : -1), 0, slides.length - 1);
        event.preventDefault();
        dots[target].focus();
        select(target);
      }, { signal });
    });
    rail.style.scrollPaddingInline = `${inset()}px`;
  }
}

export function observeScroll(signal: AbortSignal, update: () => void) {
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update();
    });
  };
  window.addEventListener('scroll', schedule, { signal, passive: true });
  window.addEventListener('resize', schedule, { signal, passive: true });
  signal.addEventListener('abort', () => cancelAnimationFrame(frame), { once: true });
  schedule();
}

export function countOnce(el: HTMLElement, finish: number, signal: AbortSignal, prefix = '', suffix = '') {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const started = performance.now();
    const render = (now: number) => {
      if (signal.aborted) return;
      const time = clamp((now - started) / 1300);
      const value = Math.round(finish * (1 - (1 - time) ** 3)).toLocaleString('en-US');
      el.textContent = `${prefix}${value}${suffix}`;
      if (time < 1) requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }, { threshold: .25 });
  observer.observe(el);
  signal.addEventListener('abort', () => observer.disconnect(), { once: true });
}
