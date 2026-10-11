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

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMuhammad-Ali-sma%2FRestraunt-3D-website)

1. Go to [vercel.com/new](https://vercel.com/new), import `Muhammad-Ali-sma/Restraunt-3D-website`, and keep the
   detected settings. The framework preset is **Next.js**, the build command is `next build`, and no environment
   variables are required.
2. Under **Settings → Git**, set the **Production Branch** to whichever branch should be live, for example `main`
   after merging. Every other branch and pull request gets its own preview URL automatically.
3. *(Optional)* After attaching a custom domain, set `NEXT_PUBLIC_SITE_URL` to it (see `.env.example`). Until then,
   Open Graph URLs use the project's `*.vercel.app` production domain via `VERCEL_PROJECT_PRODUCTION_URL`.

What's already configured:

- **Rendering:** the page is fully static, and the only server code is the reservation Server Action, which runs as
  a Vercel Function.
- **Node version:** `engines.node` is set to `>=20.9.0`, matching Next.js 16's minimum, so Vercel uses a supported
  version.
- **Caching:** `/_next/static` assets are content-hashed and cached for a year by default. The hero film and poster
  in `/media` are cached for a week, then revalidated in the background.
- **Security headers:** `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` are set, and the
  `X-Powered-By` header is removed.

## Credits

- Fonts: Bodoni Moda and Inter (SIL OFL, via `next/font`), and Noto Serif JP (SIL OFL, subset).
- Kuroshio, its chef and its address are fictional.
