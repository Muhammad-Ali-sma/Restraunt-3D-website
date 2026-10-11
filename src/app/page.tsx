import { Experience } from "@/components/cinematic/experience";
import { getAssetManifest } from "@/lib/asset-manifest";

export default function Home() {
  // Resolved while prerendering, so the client never requests media that
  // isn't there. See lib/assets.ts for the paths.
  const assets = getAssetManifest();
  return <Experience assets={assets} />;
}
