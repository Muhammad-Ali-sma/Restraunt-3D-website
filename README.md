# Son Goku: The Power Within

An unofficial, fan-made, scroll-driven cinematic experience inspired by Dragon Ball, built with **Next.js 16
(App Router)**, **React 19**, **React Three Fiber**, **GSAP ScrollTrigger**, **Lenis** and **Tailwind CSS 4**.

The page plays like an anime trailer: an opening title card, then one continuous pinned shot that the visitor
scrubs with the scroll wheel. Scrolling forward advances the film and scrolling back rewinds every layer.

> **Rights notice.** Dragon Ball and Son Goku are © Bird Studio / Shueisha and Toei Animation. This repository
> ships **no official artwork, footage or models**. Out of the box, Goku is a code-drawn, cel-shaded fan
> illustration (vector paths in `src/lib/goku-figure.ts`), and every effect and sound is generated in code: GLSL
> shaders and a Web Audio soundscape. For pixel-exact official art, drop in media you own or are
> licensed to use (see [Supplying your own media](#supplying-your-own-media)). Don't deploy official assets
> publicly without permission.

## The film

| Chapter | Scroll | What happens |
| --- | --- | --- |
| **00 Prologue** | 1.1 screens | Full-screen opening (your film, or the live 3D storm), with the title "THE POWER WITHIN." revealed character by character as the camera pushes in. |
| **01 Awakening** | 2 | A storm-lit battlefield: the camera pushes toward Goku, smoke drifts past the lens, lightning lights the clouds, and the rim light slowly finds the figure. |
| **02 Energy** | 2 | The world darkens, ki particles spiral inward, the cracks in the ground glow blue, rocks begin to levitate, arcs crawl over the body, and the camera starts to shake. |
| **03 Transformation** | 3.2 | The climax. The aura stutters from blue to gold behind letterbox bars, then a flash. The hair regrows into upswept golden spikes, a shockwave rolls out, the ground fractures, rocks rise, and the camera pulls back to show the scale. |
| **04 Ultra Instinct** | 2.4 | Gold dissolves into a silent silver-blue void: the ground falls away, stars and nebulae appear, light trails orbit the figure, and the camera slowly circles. |
| **05 Final Surge** | 2.4 | Every energy converges, the camera rushes down a tunnel of light, and an energy wave swallows the lens into white, then a hard cut to black. |
| **06 Legend** | (normal scroll) | Black-and-gold closing card, **Replay experience** and credits. |

Phones use 72% of the scroll length so the pin never feels endless.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run lint
npm run typecheck
npm run build && npm start
```

Node ≥ 20.9 is required (Next.js 16).

## Supplying your own media

Every path lives in [`src/lib/assets.ts`](src/lib/assets.ts). None of these files exist in the repo. While the page
is prerendered, `src/lib/asset-manifest.ts` checks which ones are present in `/public`, so a missing file never
causes a request, a 404 or a broken layout. **After adding or removing a file, restart `npm run dev` or rebuild.**

| File | Used for | If it's missing |
| --- | --- | --- |
| `public/videos/goku-intro.mp4` | Opening film (H.264) | The live 3D storm scene opens the page |
| `public/videos/goku-intro.webm` | Opening film (VP9/AV1, preferred by Chromium/Firefox) | MP4 only |
| `public/videos/goku-intro-mobile.mp4` | ≤ 720p encode for screens ≤ 767px | Main file is used |
| `public/images/goku-intro-poster.webp` | First frame shown while the film buffers | No poster |
| `public/videos/goku-intro.vtt` | Captions / sound descriptions for the film's audio | No track |
| `public/videos/goku-transformation.mp4` (+ `.webm`) | Clip scrubbed by scroll over the chapter 03 burst | Procedural transformation |
| `public/models/goku.glb` | Rigged 3D character (takes priority over images) | Images, then the drawn Goku |
| `public/images/goku-base.webp` | Base-form cut-out | Drawn Goku |
| `public/images/goku-super-saiyan.webp` | Golden-form cut-out | Base image, regrown with the golden wipe |
| `public/images/goku-ultra-instinct.webp` | Ultra Instinct cut-out | Base image, tinted silver |
| `public/images/battlefield.webp` | Painted panorama behind chapters 00–03 | Procedural storm sky |
| `public/images/cosmic-environment.webp` | Painted panorama for chapter 04 | Procedural star field |

### Video

The opening film always starts **muted** (browsers only allow muted autoplay), loops, and never blocks scrolling.
The sound toggle unmutes it, and its volume fades with it as the story takes over. Recommended encodes:

```bash
# MP4 / H.264, 1080p, 24–30 fps, 6–12 s loop. faststart lets playback begin before the download finishes.
ffmpeg -i master.mov -vf scale=1920:-2 -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart public/videos/goku-intro.mp4
# WebM / VP9 (smaller)
ffmpeg -i master.mov -vf scale=1920:-2 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -c:a libopus public/videos/goku-intro.webm
# Mobile, 720p
ffmpeg -i master.mov -vf scale=1280:-2 -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart \
  public/videos/goku-intro-mobile.mp4
# Poster = first frame, so the poster-to-film swap is seamless
ffmpeg -i master.mov -frames:v 1 -c:v libwebp -quality 75 public/images/goku-intro-poster.webp
```

Keep the subject centred, because the title sits over the lower-middle of the frame. If the film has meaningful
audio, add a WebVTT file at `goku-intro.vtt`.

The **transformation clip** is scrubbed frame by frame by the scroll position, so it must be easy to seek. Encode
it with a keyframe on every frame, short (2–4 s) and silent:

```bash
ffmpeg -i transform.mov -vf scale=1920:-2 -c:v libx264 -crf 20 -g 1 -pix_fmt yuv420p -an -movflags +faststart \
  public/videos/goku-transformation.mp4
ffmpeg -i transform.mov -vf scale=1920:-2 -c:v libvpx-vp9 -b:v 0 -crf 34 -g 1 -an public/videos/goku-transformation.webm
```

### Character artwork

Provide transparent **WebP or PNG** cut-outs, one per form, all with **the same pose, scale and framing** so the
transformation can cross-fade and regrow between them. Each image is fitted, bottom-centred, into a 2:3 frame with
the feet on the ground line, so use roughly 2:3 canvases with the feet near the bottom edge and some headroom
above the hair. 1000 × 1500 px or larger works well. The scene adds the rim light, aura, arcs and grading, so the
art should be clean and un-glowed.

### 3D model

- **GLB** (binary glTF), Y-up, facing +Z, feet at the origin. It is scaled to `MODEL_CONFIG.height` automatically.
- **Animations are optional and detected by name**, never assumed (`MODEL_CONFIG` in `src/lib/assets.ts`):
  - a clip whose name contains `idle` loops (otherwise the first clip does);
  - a clip whose name contains `transform` has its playhead scrubbed by the transformation's progress.
- Meshes or materials whose name contains `hair` shift to gold, then silver, with each form.
- Uncompressed and **Meshopt**-compressed files load (`npx @gltf-transform/cli optimize in.glb public/models/goku.glb --compress meshopt`).
  Draco is not enabled.
- If the file fails to load, the drawn Goku takes over and a warning is logged.

The aura behind a model is shaped by the drawn figure's silhouette, which fits most humanoid proportions.

### Backdrops

2:1 panoramas. The centre of the image sits straight ahead of the camera, and the horizon line should be about
**42% from the bottom**. The ground covers everything below it.

## How it's built

```
src/
  app/                    layout (fonts, metadata), page (server: reads the asset manifest)
  components/cinematic/   DOM layer: pinned stage, hero, chapter copy, CSS fallback scene, UI, ending
  components/three/       WebGL layer: sky, ground, warrior + aura, particles, rocks, lightning,
                          smoke, shockwave, light trails, tunnel, camera rig, post-processing
  hooks/                  use-cinematic-scroll (the master timeline), Lenis, media queries
  lib/                    assets, scene-config, story-copy, animation-config, quality tiers,
                          director (shared shot state), storm, Web Audio engine, drawn Goku figure
```

- **One master timeline.** `hooks/use-cinematic-scroll.ts` pins the stage for the whole story and builds a
  single scrubbed GSAP timeline. One unit of timeline time is one screen of scroll. Every layer is placed on it,
  so nothing animates independently of the scroll position: the 3D shot values, the copy and the DOM overlays
  (flash, letterbox, white-out, cut to black).
- **The director.** 3D values live in a plain object (`lib/director.ts`) that the timeline writes and each WebGL
  component reads in its frame loop. Scrolling never re-renders React. Only the chapter indicator updates, about
  six times per visit.
- **Frame-locked rendering.** The canvas uses `frameloop="never"` and is advanced from GSAP's ticker right after
  the timeline updates, so copy and 3D never drift apart. It stops rendering when off-screen or fully covered.
- **Lenis + ScrollTrigger** share GSAP's ticker. Touch devices keep native scrolling.
- **Drawn character.** `lib/goku-figure.ts` draws Goku as cel-shaded vector art: gi, undershirt, sash,
  wristbands, boots and the 悟 badge are shared, while hair, eyes and brows exist per form (black, Super Saiyan
  gold with teal eyes, Ultra Instinct silver). Each form is rasterised into a colour texture, with a mask of the
  visible hair (so gold and silver hair can glow) and blurred silhouettes for the rim light and the flame aura.
  The golden form regrows from the scalp up behind a bright front. The same paths render the CSS fallback.
- **Fallbacks.** The CSS/SVG scene (`components/cinematic/fallback-scene.tsx`) paints instantly and reads the
  same director values through CSS variables, so it is also a complete simplified experience when WebGL is
  unavailable. WebGL errors and context loss fall back to it automatically.
- **Sound** (`lib/audio-engine.ts`) is generated with Web Audio: a drone that opens with the ki, wind, an Ultra
  Instinct pad, a rush for the surge, and thunder on lightning. It is created only on the user's click and is
  purely atmospheric.

## Configuring the sequence

- **Chapters, order and length:** `src/lib/scene-config.ts` (`span` is scroll length in screens; `SCROLL_SCALE`
  shortens it on phones). The palette lives there too.
- **Copy:** `src/lib/story-copy.ts`. Layout per chapter: `components/cinematic/story-section.tsx`.
- **Choreography:** `src/hooks/use-cinematic-scroll.ts`. Beats are positioned relative to each chapter's start
  (`A + 0.35` = 0.35 screens into chapter 01). Adding a beat is one `shot({...}, start, end)` call. The available
  shot values are documented in `src/lib/director.ts`.
- **Kanji:** after changing chapter kanji, run `scripts/subset-jp-font.sh` to rebuild the 5 KB font subset.

## Tuning performance and intensity

- `src/lib/animation-config.ts`: scrub smoothing, title timing, global multipliers (`shake`, `flash`,
  `aberration`, `particles`) and lightning frequency.
- `src/lib/quality.ts`: per-tier budgets (particle count, rocks, smoke layers, post-processing, texture size, DPR
  cap). The tier is detected per device, and `PerformanceMonitor` lowers the resolution, then the tier, if the
  frame rate drops.
- Low-tier devices also compile the full-screen shaders with fewer noise octaves and skip bloom and chromatic
  aberration.
- Three.js loads in its own chunk, only on the client and after the first paint, while the CSS scene is already
  on screen.

## Accessibility

- **Reduced motion:** no smooth scrolling, direct scrub with no easing lag, no shake, no lightning flicker,
  softened flashes, slower arcs and a simple fade instead of the title animation. The story still advances with
  the scroll.
- **Flashes:** lightning is rate-limited far below three per second (WCAG 2.3.1), and scripted strikes only fire
  while reading forward, never when rewinding or replaying.
- **Screen readers:** headings are read as whole sentences (the split characters are hidden), the chapter changes
  are announced, and sound is never required.
- **Keyboard:** a *Skip to the ending* link, chapter jump buttons on the progress rail, and replay returns focus to
  the title.
- Without JavaScript, the chapters render as plain stacked sections.

## Deploying

The page is fully static. On Vercel, import the repository and keep the detected Next.js settings. Optionally set
`NEXT_PUBLIC_SITE_URL` (see `.env.example`) for Open Graph URLs on a custom domain. Supplied media in `/videos`,
`/images` and `/models` is cached for a week, then revalidated in the background.

## Credits

- Unofficial, non-commercial fan concept. Dragon Ball and Son Goku © Bird Studio / Shueisha, Toei Animation.
- Fonts: Big Shoulders and Inter (SIL OFL, via `next/font`), Noto Serif JP (SIL OFL, subset).
- Simplex noise: Ashima Arts / Stefan Gustavson (MIT).
