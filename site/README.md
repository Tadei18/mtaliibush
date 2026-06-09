# Mtalii Bush Camps — Marketing Website

A premium, editorial marketing site for **Mtalii Bush Camps**, a luxury tented safari camp at the foothills of Mount Kenya in Nanyuki. Built with Astro + Tailwind CSS as a fully static site — host anywhere (Netlify, Cloudflare Pages, Vercel, GitHub Pages, S3+CloudFront, etc.).

## Tech

- **Astro 5** — static-site generator, ships zero JS by default
- **Tailwind CSS** — utility styling with a custom brand theme
- **Lenis** — buttered smooth scroll
- **Fraunces** (display serif) + **Mulish** (body sans) via `@fontsource`
- **Sharp** — image optimisation (built into Astro's `<Image />`)

## Run locally

```bash
cd site
npm install
npm run dev          # http://127.0.0.1:4321
```

## Build for production

```bash
npm run build        # outputs to ./dist
npm run preview      # preview the build locally
```

## Deploy

The `dist/` directory is a fully static site. Drag-and-drop deploy to:

- **Netlify** — connect repo or drop `dist/`. Forms work out of the box (see TODO below).
- **Cloudflare Pages** — Framework preset: Astro. Build cmd: `npm run build`. Output: `dist`.
- **Vercel** — Framework preset: Astro. Same build cmd & output.
- **GitHub Pages** — push `dist/` to a `gh-pages` branch (a workflow can automate this).

## Brand tokens

Sampled directly from the Mtalii logo. Defined in `tailwind.config.mjs`:

| Token | Hex |
|---|---|
| `forest` | `#186030` |
| `forest-deep` | `#0F4423` |
| `coffee` | `#603C0C` |
| `coffee-light` | `#7A4E1B` |
| `sand` | `#E4C084` |
| `cream` | `#FBF5EC` |
| `mist` | `#F4EEE3` |
| `ink` | `#241C12` |

## Project structure

```
site/
├── public/                 # static, copied as-is (favicon, robots.txt)
├── src/
│   ├── assets/             # source images, organised by section
│   │   ├── hero/
│   │   ├── accommodation/
│   │   ├── dining/
│   │   ├── lounges/
│   │   ├── pool/
│   │   ├── spa/
│   │   ├── activities/
│   │   ├── events/
│   │   ├── gallery/
│   │   └── video/
│   ├── components/
│   │   ├── BrandMark.astro     # inline SVG tent + mountain mark
│   │   ├── Logo.astro          # full lockup
│   │   ├── Header.astro        # transparent → solid sticky header + mobile overlay
│   │   ├── Footer.astro
│   │   ├── Section.astro       # tone + spacing primitive
│   │   ├── Kicker.astro        # letter-spaced small-caps eyebrow
│   │   ├── CTAButton.astro     # primary / outline / ghost
│   │   ├── Reveal.astro        # scroll-in fade/rise wrapper
│   │   └── Hero.astro          # cinematic landing hero
│   ├── layouts/
│   │   └── BaseLayout.astro    # <html> + SEO + JSON-LD + Header + Footer
│   ├── pages/
│   │   └── index.astro
│   ├── scripts/
│   │   └── motion.ts                # Lenis smooth-scroll + reveals + hero parallax + ambient video + lightbox
│   └── styles/
│       └── global.css
├── scripts/
│   └── compress-videos.mjs          # ffmpeg pipeline — poster + 1080p MP4 for every reel
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Video pipeline

The source clips in `../Reels/` are 100–230 MB vertical 1080×1920 phone footage at 20 Mbps — not web-ready. The build script processes them all:

```bash
npm run videos:compress
```

For each clip in `../Reels/` it writes to `public/video/`:

- A poster JPG (e.g. `trip.jpg`) — first frame at 1.5s, max 1080w, ~120–700 kB.
- A web-friendly MP4 (e.g. `trip.mp4`) — H.264, CRF 26, slow preset, audio stripped, `+faststart`.

It also generates a small `hero-ambient.mp4` — an 8-second muted loop from `trip.mp4` scaled to 720w at CRF 30 (~1 MB) for the hero background.

Override the ffmpeg binary path: `FFMPEG_PATH=/path/to/ffmpeg npm run videos:compress`.

### Current sizes (after compression)

| Clip | Source | Compressed | Poster |
|---|---|---|---|
| `trip.mp4` | 165 MB | **53 MB** | 122 kB |
| `rooms.mp4` | 116 MB | **31 MB** | 660 kB |
| `mtalii.mp4` | 99 MB | **22 MB** | 184 kB |
| `cath.mp4` | 223 MB | **71 MB** | 578 kB |
| `models.mp4` | 223 MB | **39 MB** | 159 kB |
| `hero-ambient.mp4` | from trip.mp4 | **~1 MB** | 122 kB |

None exceed 100 MB so they can ship from the same origin as the site, but several are still 30–70 MB. For a global audience consider serving `cath.mp4` (71 MB), `trip.mp4` (53 MB), and `models.mp4` (39 MB) from a CDN (Cloudflare Stream, Bunny, or even a CloudFront in front of the static host) — they're only loaded on click for the reels strip, never on initial page load.

The hero ambient loop is ~1 MB and lazy-loaded only when:
- the user hasn't requested reduced motion
- the connection isn't slow (`navigator.connection.saveData`, `effectiveType`, `downlink`)
- the hero section is in view

## TODO before launch

- [ ] **Enquiry form endpoint.** `Contact` page will wire `<form method="POST" action="/__forms.html">` for Netlify Forms, or swap to Formspree. Search for `TODO: form endpoint`.
- [ ] **Social links.** Placeholders in `src/components/Footer.astro` — search for `TODO: Replace #`.
- [ ] **Google Map embed.** Will go on the `Contact` page — embed an iframe centred on "Nanyuki Airstrip".
- [ ] **Open Graph image.** Drop a `public/og-image.jpg` (1200×630) — a crop of the hero is ideal.
- [ ] **Optional: move heavier reels to CDN.** See sizes table above. Update the `data-video-src` URLs on the `VideoPoster` invocations once moved.

## Phase plan

1. **Setup & design system** ✅ — scaffold, theme, fonts, layout, Header/Footer, hero. **You are here.**
2. **Homepage** — full long-form scroll narrative.
3. **Inner pages** — Stay, Dine, Experiences, Events, Gallery, Contact.
4. **Polish & QA** — responsive sweep, Lighthouse, a11y, SEO, lightbox, reels strip.
