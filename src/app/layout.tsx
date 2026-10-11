import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Inter } from "next/font/google";
import localFont from "next/font/local";
import { Reveals } from "@/components/ui/Reveals";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Only ~30 kanji/kana appear on the page, so instead of Google's full Japanese
// font (140+ unicode-range slices) we self-host a 13 KB subset of Noto Serif JP
// (SIL OFL). Regenerate it with scripts/subset-jp-font.sh when copy changes.
const notoJp = localFont({
  src: "./fonts/noto-serif-jp-subset.woff2",
  variable: "--font-noto-jp",
  weight: "500",
  display: "swap",
});

// Canonical origin for Open Graph/Twitter URLs. On Vercel this resolves
// automatically from its system env vars; set NEXT_PUBLIC_SITE_URL to override
// (e.g. once a custom domain is attached).
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Kuroshio 黒潮 — Omakase Counter",
  description:
    "A twelve-seat omakase counter shaped by the Kuroshio current. An interactive 3D experience built with Next.js and React Three Fiber.",
  openGraph: {
    title: "Kuroshio 黒潮 — Omakase Counter",
    description: "From the black current to a counter of twelve.",
    images: [{ url: "/media/og-ocean.jpg", width: 1280, height: 720, alt: "Moonlit ocean over the Kuroshio current" }],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  colorScheme: "dark",
};

// Runs before first paint: marks JS as available (enables reveal animations)
// and skips the intro film for repeat visits in the same session or for
// visitors who prefer reduced motion, so they never see a flash of it.
const bootScript = `(()=>{const d=document.documentElement;d.classList.add('js');try{if(sessionStorage.getItem('kuroshio:intro')||matchMedia('(prefers-reduced-motion: reduce)').matches)d.dataset.intro='skip'}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodoni.variable} ${inter.variable} ${notoJp.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-full">
        <SmoothScroll />
        <Reveals />
        {children}
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
