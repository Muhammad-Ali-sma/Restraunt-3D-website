import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  // Next has no metrics for this family to build a size-adjusted fallback.
  adjustFontFallback: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Only a handful of kanji appear on the page, so instead of Google's full
// Japanese font we self-host a tiny subset of Noto Serif JP (SIL OFL).
// Regenerate it with scripts/subset-jp-font.sh after editing chapter kanji.
const notoJp = localFont({
  src: "./fonts/noto-serif-jp-subset.woff2",
  variable: "--font-noto-jp",
  weight: "900",
  display: "swap",
});

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");

const description =
  "An unofficial, fan-made cinematic scroll experience inspired by Dragon Ball: an awakening, a Super Saiyan transformation, Ultra Instinct and a final surge, told through scroll-driven 3D.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Son Goku: The Power Within (fan-made experience)",
  description,
  openGraph: {
    title: "Son Goku: The Power Within",
    description: "Beyond every limit lies another transformation. An unofficial fan-made cinematic experience.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  colorScheme: "dark",
};

// Runs before first paint: flags that JS is available so chapter copy can be
// hidden until the timeline reveals it, and always opens on the first frame of
// the film instead of a restored mid-story scroll position.
const bootScript = `(()=>{document.documentElement.classList.add('js');try{history.scrollRestoration='manual'}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${inter.variable} ${notoJp.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full">
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
