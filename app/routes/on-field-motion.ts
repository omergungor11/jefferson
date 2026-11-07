import timeline from './timeline.json';
import { all, clamp, conveyor, countOnce, observeScroll, one, pointerDrag } from './route-motion';

const countFields = ['games', 'receptions', 'touchdowns', 'yardsPerGame'] as const;

export function installOnField(root: HTMLElement, signal: AbortSignal) {
  const pin = one(root, '[data-stats-pin]');
  const park = one(root, '[data-stats-park]');
  const scrubber = one(park!, ':scope > div:last-child')!;
  const seasons = all(scrubber, '.label-sm');
  const marker = scrubber.lastElementChild as HTMLElement;
  const numbers = all(park!, ':scope > div:first-child .numeric');
  const football = one(root, '[data-on-field-catch]:not([data-on-field-gloves])');
  const gloves = one(root, '[data-on-field-gloves]');
  const total = one(root, '[data-yards] .numeric');
  const hero = one(root, '[data-section="on-hero"]');
  const heroPane = one(hero!, '[data-on-hero-pane]');
  const heroVideo = one<HTMLVideoElement>(hero!, 'video');
  const title = one(hero!, '[data-hero-title]');
  const quote = one(hero!, '[data-quote-pull]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => matchMedia('(max-width: 767px), (max-width: 900px) and (pointer: coarse)').matches;
  let phoneScrubbed = false;
  let mobilePlayed = false;
  const showTimeline = (progress: number) => {
    const position = clamp(progress) * (timeline.years.length - 1);
    const index = Math.min(Math.floor(position), timeline.years.length - 2);
    const fraction = position - index;
    numbers.forEach((el, k) => {
      const values = timeline[countFields[k]];
      const value = values[index] + (values[index + 1] - values[index]) * fraction;
      const decimals = k === 3 ? 1 : 0;
      el.textContent = value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    });
    const left = seasons[index].offsetLeft + seasons[index].offsetWidth / 2;
    const right = seasons[index + 1].offsetLeft + seasons[index + 1].offsetWidth / 2;
    marker.style.transform = `translate3d(${left + (right - left) * fraction}px,0,0)`;
    seasons.forEach((label, i) => { label.style.opacity = i <= position ? '1' : '.38'; });
  };

  const scrub = (clientX: number, snap = false) => {
    if (!phone()) return;
    phoneScrubbed = true;
    const box = scrubber.getBoundingClientRect();
    const position = clamp((clientX - box.left) / box.width);
    showTimeline(snap ? Math.round(position * (seasons.length - 1)) / (seasons.length - 1) : position);
  };
  scrubber.addEventListener('click', (event) => scrub(event.clientX, true), { signal });
  scrubber.tabIndex = 0;
  scrubber.setAttribute('aria-label', 'NFL career timeline, 2020 to 2027');
  let scrubYear = seasons.length - 1;
  scrubber.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    phoneScrubbed = true;
    scrubYear = clamp(scrubYear + (event.key === 'ArrowRight' ? 1 : -1), 0, seasons.length - 1);
    showTimeline(scrubYear / (seasons.length - 1));
  }, { signal });
  pointerDrag(scrubber, signal, { move: () => undefined });
  scrubber.addEventListener('pointermove', (event) => {
    if (scrubber.hasAttribute('data-grabbing')) scrub(event.clientX);
  }, { signal });

  if (heroVideo && phone()) {
    heroVideo.src = 'https://vz-e818877b-c14.b-cdn.net/53c115c5-0420-4482-98fa-51853261634f/play_480p.mp4';
  }
  if (total) countOnce(total, 8815, signal);

  observeScroll(signal, () => {
    if (!pin || !park || !hero || !heroPane || !title || !quote) return;
    const box = pin.getBoundingClientRect();
    if (reduced) return;
    if (phone()) {
      park.style.transform = '';
      if (!mobilePlayed && box.top < innerHeight * .71 && !phoneScrubbed) {
        mobilePlayed = true;
        const started = performance.now();
        const roll = (now: number) => {
          if (signal.aborted || phoneScrubbed) return;
          const progress = clamp((now - started) / 1650);
          showTimeline(1 - (1 - progress) ** 3);
          if (progress < 1) requestAnimationFrame(roll);
        };
        requestAnimationFrame(roll);
      }
    } else {
      const progress = clamp((innerHeight - box.top) / box.height);
      showTimeline(clamp((progress - .08) / .92));
      const settle = clamp((progress - .385) / .119);
      park.style.transform = `translate3d(0,${15 * (1 - settle) ** 2}vh,0)`;
      const fly = clamp((progress - .503) / .378);
      if (football) football.style.transform = `translate3d(calc(${-.14 + .52 * fly} * var(--page-w)), ${78 - fly * 200}vh, 0) rotate(${-10 + 14 * fly}deg)`;
      if (gloves) gloves.style.transform = `translate3d(calc(${.05 - .16 * fly} * var(--page-w)), ${106 - 260 * fly}vh, 0) rotate(${4 - 6 * fly}deg)`;
    }
    const heroProgress = clamp(-hero.getBoundingClientRect().top / innerHeight);
    title.style.transform = `translate3d(0,${heroProgress * innerHeight * .13}px,0)`;
    title.style.opacity = String(1 - clamp(heroProgress * 2));
    heroPane.style.opacity = String(1 - clamp((heroProgress - .18) / .82));
    if (heroVideo) heroVideo.style.scale = String(1 + heroProgress * .16);
  });
  heroPane?.addEventListener('pointermove', (event) => {
    if (phone() || reduced || !heroVideo) return;
    const dx = clamp(event.clientX / innerWidth - .5, -.5, .5);
    const dy = clamp(event.clientY / innerHeight - .5, -.5, .5);
    heroVideo.style.transform = `translate3d(${dx * 22}px,${dy * 17}px,0)`;
  }, { signal, passive: true });

  const section = one(root, '[data-section="on-records"]')!;
  const cards = all<HTMLButtonElement>(section, '[data-record-card]');
  const category = all<HTMLButtonElement>(section, '[aria-label="Record categories"] button');
  const limits = [0, 4, 7, 10, 13];
  const setCategory = (index: number) => category.forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
  setCategory(0);
  const track = cards[0].parentElement!.parentElement!;
  const rail = conveyor(track, signal, -.32, (el, offset) => {
    const middle = el.parentElement!.clientWidth / 2;
    const spacing = (cards[1].offsetLeft - cards[0].offsetLeft) || cards[0].offsetWidth + 24;
    const primary = ((Math.round((middle - offset - cards[0].offsetWidth / 2) / spacing) % (cards.length / 2)) + cards.length / 2) % (cards.length / 2);
    const highlighted = limits.findLastIndex(start => primary >= start);
    setCategory(highlighted);
    if (innerWidth < 900 || reduced) return;
    cards.forEach((card) => {
      const distance = clamp((card.offsetLeft + offset + card.offsetWidth / 2 - middle) / middle, -1.2, 1.2);
      const depth = distance ** 2;
      card.style.transform = `perspective(1200px) translate3d(${-48 * distance * Math.abs(distance)}px,${depth * 20}px,${-210 * depth}px) rotateY(${16 * distance}deg) rotateZ(${1.1 * distance}deg)`;
    });
  });

  category.forEach((button, i) => button.addEventListener('click', () => {
    setCategory(i);
    rail?.center(cards[limits[i]]);
  }, { signal }));
  cards.forEach((card) => {
    card.setAttribute('aria-expanded', 'false');
    card.addEventListener('click', () => {
      const current = card.hasAttribute('data-record-open');
      cards.forEach(other => {
        const open = other === card && !current;
        other.toggleAttribute('data-record-open', open);
        other.setAttribute('aria-expanded', String(open));
        const text = one(other, 'div[aria-hidden="true"]');
        if (!text) return;
        const [summary, details] = [...text.children] as HTMLElement[];
        if (!summary || !details) return;
        summary.style.visibility = open ? 'hidden' : '';
        details.style.visibility = open ? 'visible' : 'hidden';
        details.style.position = open ? 'relative' : 'absolute';
        summary.style.position = open ? 'absolute' : 'relative';
      });
    }, { signal });
  });
  all(root, '[data-section="on-cleats"] section > div > div:first-child').forEach((el, i) => conveyor(el, signal, i % 2 ? .7 : -.65));
  const pace = one(root, '[data-pace-card]')?.parentElement?.parentElement;
  conveyor(pace, signal, -.45);
}
