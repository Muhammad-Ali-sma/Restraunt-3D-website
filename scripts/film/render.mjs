// Renders scripts/film/ocean.html frame-by-frame in headless Chromium and
// encodes the hero film + poster into public/media with ffmpeg.
//
//   node scripts/film/render.mjs [--preview]
//
// Requires: playwright (global or local) and ffmpeg on PATH.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  const globalRoot = execFileSync("npm", ["root", "-g"]).toString().trim();
  ({ chromium } = require(path.join(globalRoot, "playwright")));
}

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const preview = process.argv.includes("--preview");
const FPS = 30;
const DURATION = 8;
const W = preview ? 640 : 1280;
const H = preview ? 360 : 720;
const frames = preview ? [0, 1.5, 3, 4.5, 6] : Array.from({ length: FPS * DURATION }, (_, i) => i / FPS);

const tmp = path.join(process.env.FILM_TMP || path.join(root, ".film-frames"));
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`${pathToFileURL(path.join(here, "ocean.html"))}?w=${W}&h=${H}&d=${DURATION}`);
await page.waitForFunction(() => window.ready === true);

let i = 0;
const started = Date.now();
for (const t of frames) {
  const data = await page.evaluate((t) => window.renderFrame(t), t);
  writeFileSync(path.join(tmp, `f${String(i).padStart(4, "0")}.png`), Buffer.from(data.split(",")[1], "base64"));
  i++;
  if (i % 15 === 0) console.log(`frame ${i}/${frames.length} (${((Date.now() - started) / 1000).toFixed(0)}s)`);
}
await browser.close();

if (preview) {
  console.log(`preview frames in ${tmp}`);
  process.exit(0);
}

const out = path.join(root, "public/media");
mkdirSync(out, { recursive: true });
const input = ["-y", "-framerate", String(FPS), "-i", path.join(tmp, "f%04d.png")];
const run = (args) => execFileSync("ffmpeg", [...input, ...args], { stdio: "inherit" });

// H.264 (universal) — faststart so playback begins before the download finishes
run(["-c:v", "libx264", "-preset", "veryslow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", path.join(out, "kuroshio-film.mp4")]);
// VP9 (smaller, preferred by Chromium/Firefox)
run(["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "44", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", path.join(out, "kuroshio-film.webm")]);
// Poster = first frame, so the swap from poster to video is seamless
execFileSync("ffmpeg", ["-y", "-i", path.join(tmp, "f0000.png"), "-c:v", "libwebp", "-quality", "72", path.join(out, "kuroshio-poster.webp")], { stdio: "inherit" });
execFileSync("ffmpeg", ["-y", "-i", path.join(tmp, "f0150.png"), "-q:v", "4", path.join(out, "og-ocean.jpg")], { stdio: "inherit" });

rmSync(tmp, { recursive: true, force: true });
console.log("done →", out);
