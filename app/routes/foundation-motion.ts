import films from './foundation-films.json';
import { all, clamp, countOnce, installSnapRails, one, pointerDrag, type Media } from './route-motion';

export function installFoundation(root: HTMLElement, signal: AbortSignal, play: (media: Media) => void) {
  installSnapRails(root, signal);
  all(root, '[data-stat-num]').forEach(el => {
    const { value, prefix, suffix } = el.dataset;
    if (value) countOnce(el, Number(value), signal, prefix, suffix);
  });
  for (const photo of all(root, '[data-drag-photo]')) {
    let x = 0, y = 0;
    pointerDrag(photo, signal, ( {
      move: (dx, dy) => {
        photo.style.zIndex = '18';
        photo.style.translate = `${clamp(x + dx, -innerWidth * .65, innerWidth * .65)}px ${clamp(y + dy, -innerHeight * .65, innerHeight * .65)}px`;
      },
      end: (dx, dy) => {
        x = clamp(x + dx, -innerWidth * .65, innerWidth * .65);
        y = clamp(y + dy, -innerHeight * .65, innerHeight * .65);
        photo.style.zIndex = '12';
      },
    }), true);
  }

  const next = one<HTMLButtonElement>(root, '[aria-label="Next photo"]');
  const previous = one<HTMLButtonElement>(root, '[aria-label="Previous photo"]');
  const slides = next?.parentElement?.parentElement ? all(next.parentElement.parentElement, ':scope > div') : [];
  if (slides.length) {
    let active = 0;
    const go = (direction: number) => {
      active = (active + slides.length + direction) % slides.length;
      slides.forEach((slide, i) => {
        slide.style.opacity = i === active ? '1' : '0';
        slide.setAttribute('aria-hidden', String(i !== active));
      });
    };
    next?.addEventListener('click', () => go(1), { signal });
    previous?.addEventListener('click', () => go(-1), { signal });
    const frame = next?.parentElement?.parentElement;
    if (frame) pointerDrag(frame, signal, { move: () => undefined, end: (dx) => {
      if (Math.abs(dx) > 30) go(dx > 0 ? -1 : 1);
    }});
  }

  for (const button of all<HTMLButtonElement>(root, '[aria-label="Play film with sound"]')) {
    const section = button.closest('section');
    const film = films.find(item => section?.textContent?.includes(item.title) && button.closest('[class*="group/tile"]')?.querySelector('video')?.src !== '');
    const index = all(root, '[aria-label="Play film with sound"]').indexOf(button);
    const source = films[index] || film;
    if (!source) continue;
    const open = () => play({ title: source.title, src: source.video, poster: source.poster });
    button.addEventListener('click', open, { signal });
    button.parentElement?.addEventListener('click', event => {
      if (event.target === button.parentElement) open();
    }, { signal });
  }
}
