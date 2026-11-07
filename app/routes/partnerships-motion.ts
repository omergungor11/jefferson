import partners from './partners-media.json';
import { all, one, pointerDrag, type Media } from './route-motion';

const phone = () => matchMedia('(max-width: 767px), (max-width: 900px) and (pointer: coarse)').matches;
const canHover = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
type Partner = {
  name: string;
  slug: string;
  videoPreviewUrl: string | null;
  videoUrl: string | null;
  videoPhoneUrl?: string;
  gallery: {
    src: string;
    alt: string;
    width: number;
    height: number;
    loopUrl?: string;
    playUrl?: string;
    playPhoneUrl?: string;
  }[];
};

type Tile = {
  src?: string;
  preview?: string;
  full?: string;
  mobile?: string;
  label: string;
  ratio: number;
};

function tiles(partner: Partner): Tile[] {
  const gallery: Tile[] = partner.gallery.map((item) => ({
    src: item.src || undefined,
    preview: item.loopUrl || (!item.src ? item.playUrl : undefined),
    full: item.playUrl,
    mobile: item.playPhoneUrl,
    label: item.alt || partner.name,
    ratio: (item.width || 16) / (item.height || 9),
  }));
  const preview = partner.videoPreviewUrl || partner.videoUrl;
  if (preview) gallery.unshift({ preview, full: partner.videoUrl || undefined, mobile: partner.videoPhoneUrl, label: `${partner.name} film`, ratio: 16 / 9 });
  return gallery;
}

function mediaElement(tile: Tile, width: number, decorative = false) {
  const elements: (HTMLImageElement | HTMLVideoElement)[] = [];
  if (tile.src) {
    const image = document.createElement('img');
    image.src = `${tile.src}?w=${width}&auto=format&q=80`;
    image.alt = decorative ? '' : tile.label;
    image.loading = 'lazy';
    image.draggable = false;
    elements.push(image);
  }
  if (tile.preview) {
    const video = document.createElement('video');
    video.muted = video.defaultMuted = video.loop = video.playsInline = true;
    video.preload = 'none';
    video.disableRemotePlayback = true;
    video.dataset.src = tile.preview;
    video.setAttribute('aria-hidden', 'true');
    elements.push(video);
  }
  return elements;
}

function playPreview(video: HTMLVideoElement) {
  if (!video.getAttribute('src')) video.src = video.dataset.src!;
  video.play().catch(() => undefined);
}

function gallery(
  partner: Partner, content: HTMLElement, signal: AbortSignal, play: (media: Media) => void,
) {
  const wrapper = document.createElement('div');
  const rail = document.createElement('div');
  wrapper.className = 'reference-partner-media';
  wrapper.setAttribute('role', 'region');
  wrapper.setAttribute('aria-label', `${partner.name} gallery`);
  rail.className = 'reference-partner-gallery';
  rail.tabIndex = 0;
  rail.setAttribute('aria-label', `${partner.name} media`);
  wrapper.append(rail);

  const items = tiles(partner);
  let clip: HTMLVideoElement | undefined;
  let activeButton: HTMLButtonElement | undefined;
  let activeCell: HTMLElement | undefined;
  let momentum = 0;
  let frame = 0;
  const closeClip = () => {
    if (clip) {
      clip.pause();
      clip.removeAttribute('src');
      clip.remove();
    }
    if (activeButton) {
      activeButton.setAttribute('aria-label', activeButton.dataset.playLabel!);
      activeButton.setAttribute('aria-pressed', 'false');
    }
    activeCell?.removeAttribute('data-playing');
    const preview = activeCell?.querySelector<HTMLVideoElement>('video[data-src]');
    if (preview && !wrapper.closest('[inert]')) playPreview(preview);
    clip = undefined;
    activeButton = undefined;
    activeCell = undefined;
  };
  const videoObserver = new IntersectionObserver((entries) => {
    for (const { isIntersecting, target } of entries) {
      const video = target as HTMLVideoElement;
      if (isIntersecting && !wrapper.closest('[inert]') && video.parentElement !== activeCell) playPreview(video);
      else video.pause();
    }
  }, { root: rail, threshold: .1 });

  const cells = items.map((item, index) => {
    const cell = document.createElement('div');
    cell.dataset.galleryCell = String(index);
    cell.style.setProperty('--media-ratio', `${item.ratio}`);
    cell.style.setProperty('--tile-delay', `${Math.min(index, 12) * 40}ms`);
    const media = mediaElement(item, 920);
    cell.append(...media);
    media.forEach((element) => { if (element instanceof HTMLVideoElement) videoObserver.observe(element); });
    if (item.full) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.playLabel = `Play ${item.label} with sound`;
      button.setAttribute('aria-label', button.dataset.playLabel);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        const media = { title: item.label, src: (phone() && item.mobile) || item.full!, poster: item.src };
        if (phone()) { play(media); return; }
        const wasPlaying = activeCell === cell;
        closeClip();
        if (wasPlaying) return;
        activeButton = button;
        activeCell = cell;
        cell.dataset.playing = '';
        cell.querySelector('video')?.pause();
        const player = document.createElement('video');
        player.src = media.src;
        player.poster = media.poster || '';
        player.playsInline = player.autoplay = true;
        player.className = 'reference-full-clip';
        player.setAttribute('aria-label', media.title);
        player.addEventListener('ended', closeClip, { signal });
        player.addEventListener('error', () => { closeClip(); play(media); }, { signal });
        clip = player;
        button.setAttribute('aria-label', `Mute ${item.label}`);
        button.setAttribute('aria-pressed', 'true');
        cell.prepend(player);
        player.play().catch(() => undefined);
      }, { signal });
      cell.append(button);
    }
    rail.append(cell);
    return cell;
  });

  const dots = items.length > 1 && items.length <= 10 ? document.createElement('div') : null;
  const select = (index: number) => {
    rail.scrollTo({ left: cells[index].offsetLeft - cells[0].offsetLeft, behavior: reducedMotion() ? 'instant' : 'smooth' });
  };
  if (dots) {
    dots.className = 'reference-partner-dots';
    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Show ${item.label}`);
      button.addEventListener('click', () => select(index), { signal });
      dots.append(button);
    });
    wrapper.append(dots);
  }
  let activeIndex = 0;
  const update = () => {
    activeIndex = cells.reduce((best, cell, index) => {
      const left = cells[0].offsetLeft;
      return Math.abs(cell.offsetLeft - left - rail.scrollLeft) < Math.abs(cells[best].offsetLeft - left - rail.scrollLeft) ? index : best;
    }, 0);
    cells.forEach((cell, index) => cell.toggleAttribute('data-current', index === activeIndex));
    if (dots) Array.from(dots.children).forEach((dot, index) => {
      if (index === activeIndex) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };
  rail.addEventListener('scroll', update, { signal, passive: true });
  rail.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = Math.max(0, Math.min(cells.length - 1, activeIndex + (event.key === 'ArrowRight' ? 1 : -1)));
    select(index);
  }, { signal });

  if (!phone()) {
    rail.addEventListener('pointerdown', () => { cancelAnimationFrame(frame); momentum = 0; }, { signal });
    const coast = () => {
      momentum *= .94;
      if (Math.abs(momentum) < .4 || rail.closest('[inert]')) return;
      rail.scrollLeft -= momentum;
      frame = requestAnimationFrame(coast);
    };
    pointerDrag(rail, signal, {
      move: (_x, _y, dx) => { rail.scrollLeft -= dx; momentum = dx; },
      end: () => { if (!reducedMotion()) frame = requestAnimationFrame(coast); },
    });
  }
  signal.addEventListener('abort', () => {
    cancelAnimationFrame(frame);
    videoObserver.disconnect();
    wrapper.remove();
    closeClip();
  }, { once: true });
  content.append(wrapper);
  update();
  return {
    cells,
    setOpen(open: boolean) {
      if (!open) {
        closeClip();
        all<HTMLVideoElement>(rail, 'video').forEach(video => video.pause());
      }
      all<HTMLVideoElement>(rail, 'video[data-src]').forEach(video => {
        videoObserver.unobserve(video);
        if (open) videoObserver.observe(video);
      });
    },
  };
}

function flight(from: HTMLElement, to: HTMLElement, index: number, signal: AbortSignal) {
  const image = from.querySelector<HTMLImageElement>('img');
  if (!image?.complete || !image.naturalWidth) return;
  const start = from.getBoundingClientRect();
  if (start.left > innerWidth || start.right < 0 || !start.width) return;
  const clone = image.cloneNode() as HTMLImageElement;
  clone.className = 'reference-partner-flight';
  clone.setAttribute('aria-hidden', 'true');
  document.body.append(clone);
  to.style.visibility = 'hidden';
  const cleanup = () => { clone.remove(); to.style.visibility = ''; };
  signal.addEventListener('abort', cleanup, { once: true });
  const started = performance.now() + index * 65;
  const update = (now: number) => {
    if (signal.aborted || to.closest('[inert]')) { cleanup(); return; }
    const ratio = Math.min(1, Math.max(0, (now - started) / 620));
    const ease = 1 - (1 - ratio) ** 3.4;
    const target = to.getBoundingClientRect();
    const mix = (x: number, y: number) => x + (y - x) * ease;
    clone.style.width = `${mix(start.width, target.width)}px`;
    clone.style.height = `${mix(start.height, target.height)}px`;
    clone.style.transform = `translate3d(${mix(start.left, target.left)}px,${mix(start.top, target.top)}px,0)`;
    if (ratio < 1) requestAnimationFrame(update);
    else { cleanup(); signal.removeEventListener('abort', cleanup); }
  };
  update(performance.now());
}

export function installPartnerships(root: HTMLElement, signal: AbortSignal, play: (media: Media) => void) {
  const title = one(root, '[data-partnerships-title]');
  if (title?.parentElement) {
    const parent = title.parentElement;
    let fittedWidth = -1;
    let frame = 0;
    const fit = () => {
      frame = 0;
      if (signal.aborted) return;
      title.style.fontSize = '100px';
      const sample = title.getBoundingClientRect().width;
      if (sample > 0) title.style.fontSize = `${Math.max(40, 100 * parent.clientWidth / sample)}px`;
      fittedWidth = parent.clientWidth;
    };
    const schedule = () => { if (!frame && !signal.aborted) frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(() => { if (parent.clientWidth !== fittedWidth) schedule(); });
    observer.observe(parent);
    void document.fonts.ready.then(schedule);
    signal.addEventListener('abort', () => { observer.disconnect(); cancelAnimationFrame(frame); }, { once: true });
  }
  const rows = all<HTMLButtonElement>(root, 'li.jj-row-in > button').map((button, index) => {
    const partner = partners[index];
    const panel = button.nextElementSibling as HTMLElement;
    const body = panel.firstElementChild?.firstElementChild as HTMLElement;
    if (!partner || !body) return null;
    const id = `partner-${partner.slug}`;
    panel.id = id;
    button.setAttribute('aria-controls', id);
    let strip: HTMLSpanElement | undefined;
    let cards: ReturnType<typeof gallery> | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let open = false;
    const eraseStrip = () => {
      clearTimeout(timer);
      if (strip) {
        all<HTMLVideoElement>(strip, 'video').forEach(video => video.pause());
        strip.remove();
        strip = undefined;
      }
      button.toggleAttribute('data-partner-hover', false);
    };
    const showStrip = () => {
      if (open || !canHover() || strip) return;
      button.toggleAttribute('data-partner-hover', true);
      timer = setTimeout(() => {
        strip = document.createElement('span');
        strip.className = 'reference-partner-strip';
        strip.setAttribute('aria-hidden', 'true');
        tiles(partner).slice(0, 8).forEach((item, index) => {
          const thumb = document.createElement('span');
          thumb.dataset.stripIndex = String(index);
          thumb.style.setProperty('--media-ratio', `${item.ratio}`);
          thumb.style.animationDelay = `${(7 - index) * 32}ms`;
          const elements = mediaElement(item, 270, true);
          elements.forEach(el => {
            if (el instanceof HTMLVideoElement) playPreview(el);
            else el.loading = 'eager';
          });
          thumb.append(...elements);
          strip!.append(thumb);
        });
        button.append(strip);
      }, reducedMotion() ? 0 : 130);
    };
    const setOpen = (value: boolean) => {
      const thumbnails = strip ? all(strip, '[data-strip-index]') : [];
      open = value;
      button.setAttribute('aria-expanded', String(open));
      button.toggleAttribute('data-partner-active', open);
      panel.setAttribute('aria-hidden', String(!open));
      panel.inert = !open;
      panel.style.gridTemplateRows = open ? '1fr' : '0fr';
      body.style.opacity = open ? '1' : '0';
      body.style.transform = open ? 'translateY(0)' : 'translateY(-14px)';
      if (open) cards ??= gallery(partner, body, signal, play);
      cards?.setOpen(open);
      if (open && cards && !reducedMotion()) thumbnails.forEach((thumb, i) => {
        const cell = cards?.cells[Number(thumb.dataset.stripIndex)];
        if (cell && cell.getBoundingClientRect().left < innerWidth) flight(thumb, cell, i, signal);
      });
      eraseStrip();
    };
    button.addEventListener('mouseenter', showStrip, { signal });
    button.addEventListener('mouseleave', eraseStrip, { signal });
    button.addEventListener('focus', showStrip, { signal });
    button.addEventListener('blur', eraseStrip, { signal });
    signal.addEventListener('abort', eraseStrip, { once: true });
    return { button, setOpen, isOpen: () => open };
  }).filter(row => row !== null);
  rows.forEach(row => row.button.addEventListener('click', () => {
    const value = !row.isOpen();
    if (value && !phone()) rows.forEach(other => { if (other !== row && other.isOpen()) other.setOpen(false); });
    row.setOpen(value);
  }, { signal }));
}
