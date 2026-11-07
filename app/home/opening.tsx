"use client";

import Link from "next/link";
import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";
import Portrait from "./portrait";
import data from "./opening-data.json";
import "./opening.css";

type Moment = (typeof data.moments)[number];
type Style = CSSProperties & Record<`--${string}`, number | string>;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const range = (value: number, start: number, end: number) => clamp((value - start) / (end - start));

const desktop = {
  heroEnd: 2.35,
  cardsStart: 2.05,
  quoteStart: 5.2,
  quoteFull: 6.6,
  photosStart: 7.15,
  photosEnd: 9.25,
};
const phone = {
  quoteStart: -.18,
  quoteFull: .45,
  photosStart: .53,
  photosEnd: 1.9,
};

const imageSize = (src: string, width: number) => `${src}${src.includes("?") ? "&" : "?"}w=${width}&auto=format&q=82`;
const phoneLayout = "(max-width: 767px), (max-width: 900px) and (pointer: coarse)";

function HomeLoader({ onReveal }: { onReveal: () => void }) {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem("jh-intro") || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = 0;
    let removed: ReturnType<typeof setTimeout>;
    setVisible(true);

    const advance = (now: number) => {
      const value = clamp((now - start) / 1200);
      setProgress(Math.floor(100 * (1 - (1 - value) ** 2)));
      if (value < 1) {
        frame = requestAnimationFrame(advance);
        return;
      }
      sessionStorage.setItem("jh-intro", "done");
      setDone(true);
      onReveal();
      removed = setTimeout(() => setVisible(false), 500);
    };

    frame = requestAnimationFrame(advance);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(removed);
    };
  }, [onReveal]);

  if (!visible) return null;

  return (
    <div className="jh-loader" data-done={done} aria-hidden="true">
      <div className="jh-loader-lockup">
        <div className="jh-loader-mark" style={{ "--progress": `${100 - progress}%` } as Style} />
        <span>{progress}%</span>
      </div>
    </div>
  );
}

function MomentDialog({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <dialog
      className="jh-moment-dialog"
      ref={dialog}
      aria-label={moment.title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button className="jh-dialog-close" type="button" aria-label="Close highlight" onClick={onClose}>×</button>
      <figure>
        <video controls autoPlay playsInline poster={imageSize(moment.image, 800)}>
          <source media="(max-width: 767px)" src={moment.videoMobile} type="video/mp4" />
          <source src={moment.video} type="video/mp4" />
        </video>
        <figcaption>
          <strong>{moment.title}</strong>
          <span>{moment.stat}</span>
        </figcaption>
      </figure>
    </dialog>
  );
}

function TradingCard({
  moment,
  onOpen,
  hero = false,
  active = false,
}: {
  moment: Moment;
  onOpen: (moment: Moment) => void;
  hero?: boolean;
  active?: boolean;
}) {
  const preview = useRef<HTMLVideoElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  function onMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    event.currentTarget.style.setProperty("--card-ry", `${x * 22}deg`);
    event.currentTarget.style.setProperty("--card-rx", `${y * -18}deg`);
    event.currentTarget.style.setProperty("--card-glint", `${50 + x * 80}%`);
  }

  function reset() {
    button.current?.style.removeProperty("--card-ry");
    button.current?.style.removeProperty("--card-rx");
    button.current?.style.removeProperty("--card-glint");
    preview.current?.pause();
  }

  return (
    <button
      ref={button}
      type="button"
      className="jh-card"
      aria-label={`Open ${moment.title}`}
      data-active={active}
      onClick={() => onOpen(moment)}
      onPointerMove={onMove}
      onPointerEnter={() => void preview.current?.play().catch(() => {})}
      onPointerLeave={reset}
      tabIndex={active || hero ? 0 : -1}
    >
      <span className="jh-card-plane">
        <img src={imageSize(moment.image, 480)} alt="" decoding="async" draggable={false} />
        {!hero && <video ref={preview} src={moment.preview} muted loop playsInline preload="none" aria-hidden="true" />}
        <span className="jh-card-glint" />
        {!hero && (
          <span className="jh-card-play" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.1v11.8L14 8 4 2.1Z" /></svg>
          </span>
        )}
      </span>
      {!hero && (
        <span className="jh-card-label">
          <strong>{moment.title}</strong>
          <span>{moment.stat}</span>
        </span>
      )}
    </button>
  );
}

function Hero({ onOpen, introduce }: { onOpen: (moment: Moment) => void; introduce: boolean }) {
  return (
    <div className="jh-hero" data-home-tone="tone-light" data-introduce={introduce}>
      <h1 className="jh-sr-only">Justin Jefferson</h1>
      <div className="jh-hero-pattern" aria-hidden="true">
        {["justin", "jefferson"].map((name) => (
          <div className={`jh-hero-track jh-hero-track-${name}`} key={name}>
            {Array.from({ length: 4 }, (_, i) => (
              <span style={{ "--word-mask": `url(/home/${name}.svg)` } as Style} key={i} />
            ))}
          </div>
        ))}
      </div>
      <div className="jh-hero-light" aria-hidden="true" />
      <img className="jh-hero-wordmark" src="/home/wordmark.svg" alt="" />
      <div className="jh-hero-editorial jh-hero-left">
        <TradingCard moment={data.moments[0]} onOpen={onOpen} hero />
        <p>{data.cardCopy}</p>
      </div>
      <div className="jh-hero-editorial jh-hero-right">
        <img className="jh-hero-signature" src="/home/signature.svg" alt="" />
        <p>{data.heroCopy}</p>
      </div>
      <Portrait introduce={introduce} video={data.heroVideo} mobileVideo={data.heroVideoMobile} />
    </div>
  );
}

function Field() {
  return (
    <div className="jh-field" aria-hidden="true">
      <div className="jh-yard-numbers">
        {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((yard, index) => <span key={index}>{yard}</span>)}
      </div>
    </div>
  );
}

function Timeline({ introduce }: { introduce: boolean }) {
  const timeline = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const quoteWindow = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<Moment | null>(null);
  const [current, setCurrent] = useState(-1);
  const [mobileCard, setMobileCard] = useState(0);

  useEffect(() => {
    const wrapper = timeline.current;
    const element = stage.current;
    const quote = quoteWindow.current;
    if (!wrapper || !element || !quote) return;
    const responsiveScenes = element.querySelectorAll<HTMLElement>("[data-home-tone]");
    const hero = element.querySelector<HTMLElement>(".jh-hero");
    let frame = 0;
    let focus = -1;

    const measure = () => {
      frame = 0;
      const rect = wrapper.getBoundingClientRect();
      const mobile = matchMedia(phoneLayout).matches;
      responsiveScenes.forEach((scene) => {
        if (mobile && scene.dataset.theme !== scene.dataset.homeTone) scene.dataset.theme = scene.dataset.homeTone;
        if (!mobile && scene.hasAttribute("data-theme")) scene.removeAttribute("data-theme");
      });
      const height = mobile ? quote.firstElementChild?.clientHeight || innerHeight : element.clientHeight;
      if (!height || rect.bottom < -height || rect.top > height) return;

      const progress = Math.max(0, -rect.top / height);
      const quoteProgress = mobile ? -quote.getBoundingClientRect().top / height : progress;
      const timing = mobile ? phone : desktop;
      const heroFade = range(progress, desktop.cardsStart, desktop.heroEnd);
      const cardTravel = clamp((progress - 1.56) / 3.63);
      const quoteFade = range(quoteProgress, timing.quoteStart, timing.quoteStart + (mobile ? .22 : .42));
      const quoteReveal = range(quoteProgress, timing.quoteStart + (mobile ? .08 : .63), timing.quoteFull + .05);
      const quoteScale = range(quoteProgress, timing.quoteStart + (mobile ? .08 : .72), timing.quoteFull + .18);
      const photoTravel = range(quoteProgress, timing.photosStart, timing.photosEnd);
      const photoFade = range(quoteProgress, timing.photosEnd, timing.photosEnd + .38);

      element.style.setProperty("--hero-opacity", String(1 - heroFade));
      element.style.setProperty("--hero-zoom", String(mobile ? 1 : 1 - range(progress, .15, desktop.heroEnd) * .12));
      element.style.setProperty("--story-opacity", String(1 - range(progress, .15, mobile ? .48 : 1.23)));
      element.style.setProperty("--field-opacity", String(range(progress, desktop.cardsStart - .08, desktop.heroEnd) * (1 - quoteFade)));
      element.style.setProperty("--card-travel", String(cardTravel));
      element.style.setProperty("--quote-opacity", String(quoteFade * (1 - photoFade * .35)));
      element.style.setProperty("--quote-reveal", String(quoteReveal));
      element.style.setProperty("--quote-scale", String(mobile ? 1.04 - quoteScale * .19 : 1.65 - quoteScale * .65));
      element.style.setProperty("--photo-travel", String(photoTravel));
      element.style.setProperty("--photo-fade", String(1 - photoFade));
      element.style.setProperty("--stage-theme", progress < desktop.cardsStart ? "#f4efe6" : "#171220");
      const tone = !mobile && progress < desktop.cardsStart ? "tone-light" : "tone-dark";
      if (element.dataset.theme !== tone) element.dataset.theme = tone;
      if (hero) hero.inert = !mobile && heroFade >= 1;
      element.dataset.cards = String(mobile || (progress > desktop.cardsStart && progress < desktop.quoteStart + .25));
      const next = mobile ? -2 : progress > desktop.cardsStart && progress < desktop.quoteStart + .25
        ? clamp(Math.round((cardTravel * 172 + 3) / 31), 0, data.moments.length - 1)
        : -1;
      if (focus !== next) {
        focus = next;
        setCurrent(next);
      }
    };

    const refresh = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  return (
    <section className="jh-timeline" ref={timeline} aria-label="Justin Jefferson highlights">
      <div className="jh-timeline-stage" ref={stage} data-theme="tone-light" data-cards="false">
        <Hero onOpen={setOpened} introduce={introduce} />
        <div className="jh-moments" data-home-tone="tone-dark">
          <Field />
          <h2 className="jh-display jh-moments-title">Signature Moments</h2>
          <div className="jh-cards-track" aria-label="Signature Moments" onScroll={(event) => {
            if (!matchMedia(phoneLayout).matches) return;
            const track = event.currentTarget;
            const first = track.firstElementChild;
            const step = first ? first.clientWidth + 14 : 1;
            setMobileCard(clamp(Math.round(track.scrollLeft / step), 0, data.moments.length - 1));
          }}>
            {data.moments.map((moment, index) => (
              <div className="jh-moment-slot" key={moment.title} style={{ "--index": index } as Style}>
                <TradingCard moment={moment} onOpen={setOpened} active={(current === -2 ? mobileCard : current) === index} />
              </div>
            ))}
          </div>
        </div>
        <div className="jh-quote-window" ref={quoteWindow} data-home-tone="tone-dark">
          <div className="jh-quote-pane">
            <div className="jh-quote">
              <img src="/home/quotes.svg" alt="" />
              <h2 className="jh-display">
                {data.quoteLines.map((line, index) => (
                  <span data-line={line} key={line} style={{ "--line-index": index } as Style}>{line}</span>
                ))}
              </h2>
              <p>{data.quoteBody}</p>
            </div>
            <div className="jh-quote-photos">
              {data.quotePhotos.map((photo, index) => (
                <img
                  key={photo.src}
                  src={imageSize(photo.src, 700)}
                  alt={photo.alt}
                  decoding="async"
                  style={{ "--photo-index": index, "--photo-angle": [-4, 3, -5][index] + "deg" } as Style}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {opened && <MomentDialog moment={opened} onClose={() => setOpened(null)} />}
    </section>
  );
}

function Foundation() {
  const [selected, setSelected] = useState(0);

  return (
    <section className="jh-foundation" data-theme="tone-light">
      <div className="jh-foundation-pane">
        <h2 className="jh-display">{data.foundation.headline}</h2>
        <div
          className="jh-foundation-gallery"
          onScroll={(event) => {
            const rail = event.currentTarget;
            const first = rail.firstElementChild;
            if (first && matchMedia(phoneLayout).matches) {
              setSelected(clamp(Math.round(rail.scrollLeft / (first.clientWidth + 12)), 0, data.foundation.gallery.length - 1));
            }
          }}
        >
          {data.foundation.gallery.map((photo, index) => (
            <Link
              href={data.foundation.ctaUrl}
              className="jh-foundation-photo"
              data-active={index === selected}
              key={photo.src}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setSelected(index);
              }}
              onFocus={() => setSelected(index)}
              aria-label={`${photo.alt}. Learn more about the JJets Foundation`}
            >
              <img src={imageSize(photo.src, 1000)} alt={photo.alt} loading="lazy" draggable={false} />
            </Link>
          ))}
        </div>
        <div className="jh-foundation-caption">
          <h3>{data.foundation.name}</h3>
          <p>{data.foundation.blurb}</p>
          <Link prefetch={false} className="jh-pill jh-pill-dark" href={data.foundation.ctaUrl}>{data.foundation.ctaLabel}</Link>
        </div>
      </div>
    </section>
  );
}

function PartnerVisual({ index }: { index: number }) {
  const partner = data.partners[index];
  if (index === 1) {
    return (
      <>
        <img className="jh-gatorade-back" src="/home/gatorade-front.webp" alt="" draggable={false} />
        <img className="jh-gatorade-front" src="/home/gatorade-back.webp" alt={partner.heroImageAlt} draggable={false} />
      </>
    );
  }

  const local = ["/home/under-armour.webp", null, "/home/pepsi.webp", null, "/home/oakley.webp", null][index];
  return <img src={local || imageSize(partner.heroImageUrl, 1300)} alt={partner.heroImageAlt} decoding="async" draggable={false} />;
}

function PartnerLogos() {
  return (
    <div className="jh-logos" aria-label="Partner brands">
      <div className="jh-logos-track">
        {[0, 1, 2, 3].map((repeat) => (
          <div key={repeat} className="jh-logos-list" aria-hidden={repeat > 0}>
            {data.partnerLogos.map((logo) => (
              <img
                src={logo.src}
                alt={repeat === 0 ? logo.alt : ""}
                style={{ "--logo-scale": logo.scale || 1 } as Style}
                loading="lazy"
                key={logo.alt}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Partnerships() {
  const section = useRef<HTMLElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const wrapper = section.current;
    const content = pane.current;
    if (!wrapper || !content) return;

    let frame = 0;
    let previous = -1;

    const measure = () => {
      frame = 0;
      if (matchMedia(phoneLayout).matches) {
        content.style.removeProperty("--partner-scroll");
        return;
      }
      const { top, bottom } = wrapper.getBoundingClientRect();
      if (top > innerHeight * 1.5 || bottom < -innerHeight) return;
      const height = content.clientHeight || innerHeight;
      const slide = clamp(-top / height, 0, data.partners.length - 1);
      const selected = Math.min(data.partners.length - 1, Math.floor(slide + .28));
      content.style.setProperty("--partner-scroll", String(slide));
      if (previous !== selected) {
        previous = selected;
        setSelected(selected);
      }
    };

    const refresh = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", refresh, { passive: true });
    window.addEventListener("resize", refresh);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, []);

  function go(index: number) {
    if (!section.current || !pane.current) return;
    if (matchMedia(phoneLayout).matches) {
      setSelected((index + data.partners.length) % data.partners.length);
      return;
    }
    const next = clamp(index, 0, data.partners.length - 1);
    const top = section.current.getBoundingClientRect().top + scrollY + next * pane.current.clientHeight;
    window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const x = event.clientX - pointer.current.x;
    const y = event.clientY - pointer.current.y;
    if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y)) go(selected - Math.sign(x));
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    event.currentTarget.style.setProperty("--partner-x", `${x * 28}px`);
    event.currentTarget.style.setProperty("--partner-y", `${y * 18}px`);
    event.currentTarget.style.setProperty("--partner-angle", `${x * 7}deg`);
  }

  return (
    <section className="jh-partnerships" ref={section} aria-label="Partnerships">
      <div className="jh-partnerships-pane" ref={pane} data-theme="tone-dark" style={{ "--partner-selection": selected } as Style}>
        <h2 className="jh-display jh-partnerships-title">Partnerships</h2>
        <div
          className="jh-partner-art"
          onPointerMove={move}
          onPointerLeave={(event) => {
            event.currentTarget.style.removeProperty("--partner-x");
            event.currentTarget.style.removeProperty("--partner-y");
            event.currentTarget.style.removeProperty("--partner-angle");
          }}
          onPointerDown={startDrag}
          onPointerUp={endDrag}
        >
          {data.partners.map((partner, index) => (
            <div
              className="jh-partner-visual"
              data-index={index}
              data-active={selected === index}
              aria-hidden={selected !== index}
              style={{ "--partner-index": index } as Style}
              key={partner.name}
            >
              <PartnerVisual index={index} />
            </div>
          ))}
        </div>
        <div className="jh-partner-copy">
          <div className="jh-partner-dots" aria-label="Featured partnerships">
            {data.partners.map((partner, index) => (
              <button key={partner.name} type="button" aria-label={partner.name} aria-current={selected === index} onClick={() => go(index)} />
            ))}
          </div>
          <div className="jh-partner-description" key={data.partners[selected].name} onPointerDown={startDrag} onPointerUp={endDrag}>
            <h3>{data.partners[selected].name}</h3>
            <p>{data.partners[selected].description}</p>
          </div>
        </div>
        <Link prefetch={false} className="jh-pill jh-partner-link" href="/partnerships">View all</Link>
        <PartnerLogos />
      </div>
    </section>
  );
}

export default function HomeOpening() {
  const [introduce, setIntroduce] = useState(false);
  const reveal = useCallback(() => { if (window.scrollY < 5) setIntroduce(true); }, []);
  useEffect(() => {
    if (!introduce) return;
    const timer = setTimeout(() => setIntroduce(false), 3400);
    return () => clearTimeout(timer);
  }, [introduce]);
  return (
    <>
      <HomeLoader onReveal={reveal} />
      <Timeline introduce={introduce} />
      <div className="jh-community">
        <Partnerships />
        <Foundation />
      </div>
    </>
  );
}
