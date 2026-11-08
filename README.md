# Jefferson

A responsive Next.js recreation of [Justin Jefferson’s website](https://jjettas.com/). The project explores scroll-driven storytelling through a video reflection in the hero, animated career statistics, draggable galleries, and a Journal you can navigate by dragging or swiping.

## Run locally

Use Node.js 22 and npm.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000/). No environment variables are required. Some images, fonts, and videos load from external services.

## Explore the site

| Route | Experience |
| --- | --- |
| `/` | Interactive hero, Signature Moments, partnerships, and a photo gallery |
| `/on-field` | Career statistics, records, and cleat gallery |
| `/off-field` | Editorial photography and video features |
| `/foundation` | Foundation programs, community photography, and films |
| `/partnerships` | Expandable partner profiles and media galleries |
| `/journal` | Draggable collection with video and item details |
| `/inquiries` | Email links for partnerships, press, and booking |
| `/privacy`, `/terms` | Legal pages adapted for the concept |

Journal items can be opened directly. Try [`/journal?item=cleat-lv`](http://localhost:3000/journal?item=cleat-lv).

## Check and build

```bash
npm run typecheck
npm run build
npm start
```

The nine routes were smoke-tested in Chromium and WebKit using desktop and mobile viewports. Browser interaction checks also covered drag and swipe gestures, galleries, video dialogs, and Journal deep links.

## Reference and credits

The original website credits [LayerTwo](https://layertwo.design/) for the site design. This repository is an independent concept recreation. The reflection distortion, some transition timings, and audio layering are approximations. Third-party imagery, video, typography, and brand marks belong to their respective rights holders.
