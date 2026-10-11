# Kuroshio 黒潮 — an interactive 3D omakase site

A portfolio piece for a fictional twelve-seat omakase counter, built with **Next.js 16 (App Router)**, **React 19**,
**React Three Fiber** and **Tailwind CSS 4**.

Every visual on the page is generated in code. There are no stock photos, no `.glb` models and no licensed footage.

## The experience

| Moment | What happens |
| --- | --- |
| **Load** | A cinematic film of a moonlit ocean (the Kuroshio current) plays full-screen, with the copy fading in. |
| **Hand-over** | When the film ends, or the visitor scrolls, presses Enter or clicks *Enter*, a circular "portal" opens from the centre and reveals the live 3D hero. |
| **3D hero** | A slate board with otoro, salmon and akami nigiri, tea with rising steam, wasabi, gari, soy and chopsticks. The board follows the cursor, a warm "knife light" tracks the pointer, and pieces lift on hover and spin on click. Scrolling turns the board. |
| **Title** | The giant **KUROSHIO** wordmark plays the film *inside its letters* on hover (tap on touch screens). *Replay the film* runs the intro again. |
| **The course** | Five dishes on a lacquer plate. Pick a course and the dish swaps with an animated transition. Drag to turn the plate. |
| **Reserve** | A real Server Action validates the request on the server and returns a confirmation reference. This is a demo, so nothing is stored. |

## How it's built

- **Procedural 3D** (`src/components/three/`)
  - Rice beds are about 300 instanced grains placed on an ellipsoid.
  - Fish slices are subdivided boxes pinched into a lens profile, then draped over the rice.
  - Fish marbling, nori, slate and the maki cross-section are seeded canvas textures.
  - Tableware is lathe and extrude geometry.
  - Gold dust and steam are custom GLSL shaders, with all animation on the GPU.
  - Geometry and materials are cached and shared between scenes.
- **The film** (`scripts/film/`) is an original ray-marched ocean shader. `node scripts/film/render.mjs` renders it frame by frame in headless Chromium and encodes WebM (VP9), MP4 (H.264, faststart) and a WebP poster with ffmpeg.

## Performance

- **Light first paint.** The page is statically prerendered, and the first paint is HTML, CSS, a 21 KB poster and fonts.
- **Lazy Three.js.** Three.js (about 250 KB gzipped) loads in its own chunk, and only after `load` once the browser is idle, while the film plays. The menu scene mounts only when its section approaches the viewport.
- **No HDR or loader code.** Studio reflections are baked once with PMREM from a tiny procedural light-box. drei's `Environment` and `PresentationControls` were replaced to drop the HDR/EXR loaders and react-spring from the bundle.
- **Rendering stops when unseen.** Canvases stop when scrolled off-screen, when the tab is hidden, or while the intro covers them. Shaders are precompiled with `compileAsync`.
- **Adaptive resolution.** Device-pixel-ratio follows measured frame rate (`PerformanceMonitor`).
- **Small fonts and CSS.** Japanese text uses a self-hosted 13 KB subset of Noto Serif JP (`scripts/subset-jp-font.sh`) instead of 140+ unicode-range slices. This took the CSS from 43 KB to 9 KB gzipped.
- **Smart intro.** A tiny pre-paint script skips the intro on reload in the same tab and for `prefers-reduced-motion`, so the intro never flashes.

**Lighthouse (mobile preset, local production build):**

- Accessibility, Best Practices and SEO: **100**
- CLS: **0**
- FCP: **0.8 s**
- Speed Index: **1.2 s**

The sandbox these figures came from has no GPU, so WebGL runs on the CPU (SwiftShader) under 4× throttling. That inflates Total Blocking Time with shader compilation that a real GPU handles in milliseconds. Measure the deployed site with PageSpeed Insights for representative numbers.

## Run it

```bash
npm install
npm run dev           # http://localhost:3000
npm run build && npm start
```

Optional:

```bash
node scripts/film/render.mjs   # re-render the hero film (needs Playwright + ffmpeg)
scripts/subset-jp-font.sh      # rebuild the Japanese font subset after editing copy
```

Set `NEXT_PUBLIC_SITE_URL` in production so Open Graph URLs resolve correctly.

## Credits

- Fonts: Bodoni Moda and Inter (SIL OFL, via `next/font`), and Noto Serif JP (SIL OFL, subset).
- Kuroshio, its chef and its address are fictional.
