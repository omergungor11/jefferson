import media from './off-field-media.json';
import { all, clamp, conveyor, observeScroll, one, pointerDrag, type Media } from './route-motion';

export function installOffField(root: HTMLElement, signal: AbortSignal, play: (media: Media) => void) {
  const sections = ['fashion', 'digital', 'appearances', 'features'].map(id => one(root, `#${id}`)!);
  const nav = one(root, '[aria-label="Off-field lanes"]')!;
  const tabs = all<HTMLButtonElement>(nav, 'button');
  const hero = one(root, '[data-section="off-hero"]')!;
  const portrait = one(hero, '[data-off-card]');
  const rule = one(hero, '[data-off-rule]');
  const features = sections[3];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => matchMedia('(max-width: 1023px)').matches;
  if (portrait && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let x = 0, y = 0;
    pointerDrag(portrait, signal, {
      move: (dx, dy) => {
        portrait.style.translate = `${clamp(x + dx, -innerWidth * .65, innerWidth * .65)}px ${clamp(y + dy, -innerHeight * .65, innerHeight * .65)}px`;
      },
      end: (dx, dy) => {
        x = clamp(x + dx, -innerWidth * .65, innerWidth * .65);
        y = clamp(y + dy, -innerHeight * .65, innerHeight * .65);
      },
    }, true);
  }
  let activeFeature = 0;
  let lastFeature = 0;
  let scheduled = false;
  let featureVisible = false;
  let programmaticUntil = 0;
  const stage = one(features, '[data-feature-video-preview]')!;
  const clip = one<HTMLVideoElement>(stage, 'video')!;
  const trigger = one<HTMLButtonElement>(stage, 'button')!;
  const desktopButtons = all<HTMLButtonElement>(features, 'button').filter(el => media.features.some(story => story.nav === el.textContent?.trim()));
  const storyButtons = all<HTMLButtonElement>(features, 'button[aria-label]').filter(el => media.features.some(story => story.nav === el.getAttribute('aria-label')));
  const storyCopy = one(features, '[aria-live]')!;
  const copyTitle = one(storyCopy, 'p')!;
  const copyBody = one(storyCopy, ':scope > p')!;
  const logo = one<HTMLImageElement>(storyCopy, 'img')!;

  const refreshVideo = () => {
    if (featureVisible) {
      clip.muted = true;
      clip.play().catch(() => undefined);
    } else clip.pause();
  };
  const selectFeature = (index: number) => {
    activeFeature = (index + media.features.length) % media.features.length;
    const story = media.features[activeFeature];
    const selected = activeFeature;
    if (selected !== lastFeature || !scheduled) {
      const url = story.media.loopUrl || story.media.playUrl;
      stage.style.backgroundImage = `url("${story.media.src}?w=1040&auto=format")`;
      clip.poster = `${story.media.src}?w=1040&auto=format`;
      clip.removeAttribute('data-loaded');
      if (clip.getAttribute('src') !== url) clip.src = url;
      refreshVideo();
      copyTitle.textContent = story.logoText || story.nav;
      copyBody.textContent = story.media.caption;
      logo.alt = story.logoImg.alt;
      logo.removeAttribute('srcset');
      logo.src = `${story.logoImg.src}?w=160&auto=format`;
      trigger.setAttribute('aria-label', `Play the ${story.nav} video`);
      clip.setAttribute('aria-label', story.nav);
      [desktopButtons, storyButtons].forEach(list => list.forEach((el, i) => {
        const active = i === selected;
        el.setAttribute('aria-current', String(active));
        if (list === desktopButtons) el.style.color = active ? '#f4efe6' : '#f4efe68c';
        const indicator = one(el, ':scope > span[aria-hidden="true"]');
        if (indicator && list === storyButtons) {
          indicator.style.width = active ? '16px' : '6px';
          indicator.style.opacity = active ? '1' : '.35';
        }
      }));
      if (!reduced && selected !== lastFeature) {
        stage.animate([{ opacity: .5, scale: '.985' }, { opacity: 1, scale: '1' }], { duration: 500, easing: 'ease-out' });
      }
      lastFeature = selected;
      scheduled = true;
    }
  };
  clip.addEventListener('playing', () => { clip.dataset.loaded = ''; }, { signal });
  const visibility = new IntersectionObserver(([entry]) => {
    featureVisible = entry.isIntersecting;
    refreshVideo();
  }, { threshold: .15 });
  visibility.observe(stage);
  signal.addEventListener('abort', () => visibility.disconnect(), { once: true });
  selectFeature(0);

  const choose = (index: number) => {
    selectFeature(index);
    if (phone()) return;
    programmaticUntil = performance.now() + 950;
    const top = scrollY + features.getBoundingClientRect().top;
    const range = features.offsetHeight - innerHeight;
    window.scrollTo({ top: top + range * (activeFeature / (media.features.length - 1)), behavior: reduced ? 'instant' : 'smooth' });
  };
  [...desktopButtons, ...storyButtons].forEach(button => {
    const label = button.getAttribute('aria-label') || button.textContent?.trim();
    const index = media.features.findIndex(story => story.nav === label);
    button.addEventListener('click', () => choose(index), { signal });
  });
  one(features, '[aria-label="Previous story"]')?.addEventListener('click', () => choose(activeFeature - 1), { signal });
  one(features, '[aria-label="Next story"]')?.addEventListener('click', () => choose(activeFeature + 1), { signal });
  trigger.addEventListener('click', () => {
    const story = media.features[activeFeature];
    play({ title: story.nav, src: phone() && story.media.playPhoneUrl ? story.media.playPhoneUrl : story.media.playUrl, poster: story.media.src });
  }, { signal });
  pointerDrag(stage, signal, {
    move: (x) => { if (phone()) clip.style.translate = `${clamp(x * .16, -32, 32)}px`; },
    end: (x) => {
      clip.style.translate = '';
      if (phone() && Math.abs(x) >= 36) choose(activeFeature + (x < 0 ? 1 : -1));
    },
  });
  stage.style.touchAction = 'pan-y';

  tabs.forEach((tab, index) => tab.addEventListener('click', () => {
    const anchor = sections[index].getBoundingClientRect().top + scrollY;
    window.scrollTo({ top: anchor - (phone() ? 8 : 100), behavior: reduced ? 'instant' : 'smooth' });
  }, { signal }));

  observeScroll(signal, () => {
    const positions = sections.map(section => section.getBoundingClientRect());
    const current = Math.max(0, positions.findLastIndex(box => box.top < innerHeight * .52));
    tabs.forEach((tab, index) => {
      tab.setAttribute('aria-current', String(current === index));
      tab.dataset.active = String(current === index);
    });
    nav.toggleAttribute('data-pinned', positions[0].top < 112);
    if (!phone() && performance.now() > programmaticUntil && positions[3].top < innerHeight && positions[3].bottom > 0) {
      const progress = clamp(-positions[3].top / Math.max(1, positions[3].height - innerHeight));
      selectFeature(Math.round(progress * (media.features.length - 1)));
    }
    if (portrait && !reduced) {
      const progress = clamp(scrollY / hero.offsetHeight);
      portrait.style.transform = `translate3d(0,${progress * -78}px,0) rotate(${2.5 + progress * (phone() ? -3 : 2)}deg)`;
      if (rule) rule.style.transform = `scaleX(${1 - progress * .2})`;
    }
    if (!reduced) {
      positions.forEach((box, index) => {
        if (index === 3 || box.bottom <= 0 || box.top >= innerHeight) return;
        const heading = one(sections[index], 'h2');
        if (heading) heading.style.translate = `0 ${clamp(box.top / innerHeight, -1, 1) * 24}px`;
      });
    }
  });

  ['Fashion imagery', 'Appearances imagery', 'Brand partners'].forEach((name, i) => {
    conveyor(one<HTMLElement>(root, `[aria-label="${name}"] > div:first-child`), signal, i === 1 ? .35 : -.35);
  });
  conveyor(one<HTMLElement>(root, '[data-section="off-pieces"] section > div > div'), signal, -.45);
  for (const button of all<HTMLButtonElement>(root, '#appearances button[aria-label^="Play: "]')) {
    const title = button.getAttribute('aria-label')!.slice(6);
    const source = media.appearances.find(item => item.title === title);
    if (!source) continue;
    button.addEventListener('click', () => play({ title, src: source.video, poster: source.poster }), { signal });
  }

  const mobileRail = one(root, '[data-loop-rail]');
  if (mobileRail && mobileRail.children.length === 3) {
    const measure = () => (mobileRail.children[1] as HTMLElement).offsetLeft - (mobileRail.children[0] as HTMLElement).offsetLeft;
    const initialize = () => { if (mobileRail.scrollLeft === 0) mobileRail.scrollLeft = measure(); };
    const size = new ResizeObserver(initialize);
    size.observe(mobileRail);
    mobileRail.addEventListener('scrollend', () => {
      const width = measure();
      if (mobileRail.scrollLeft < width * .45) mobileRail.scrollLeft += width;
      else if (mobileRail.scrollLeft > width * 1.55) mobileRail.scrollLeft -= width;
    }, { passive: true, signal });
    signal.addEventListener('abort', () => size.disconnect(), { once: true });
  }
}
