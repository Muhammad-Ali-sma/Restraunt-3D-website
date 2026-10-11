import "server-only";

import { existsSync } from "node:fs";
import path from "node:path";
import { ASSET_PATHS, type AssetKey, type AssetManifest } from "./assets";

/**
 * Checks which optional media files exist in /public. This runs while the page
 * is prerendered, so a production build reflects the files present at build
 * time (in development it runs on every request). Synchronous filesystem reads
 * are deterministic, so the page stays fully static.
 */
export function getAssetManifest(): AssetManifest {
  const publicDir = path.join(process.cwd(), "public");
  return Object.fromEntries(
    (Object.keys(ASSET_PATHS) as AssetKey[]).map((key) => [key, existsSync(path.join(publicDir, ASSET_PATHS[key]))]),
  ) as AssetManifest;
}
