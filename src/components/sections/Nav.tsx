"use client";

import { useEffect, useState } from "react";

const links = [
  { href: "#story", label: "Story" },
  { href: "#course", label: "Course" },
  { href: "#evening", label: "Evening" },
  { href: "#reserve", label: "Reserve" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-500 ${solid || open ? "border-b border-line bg-ink/80 backdrop-blur-md" : ""}`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-10" aria-label="Main">
        <a href="#top" className="flex items-center gap-3" aria-label="Kuroshio — back to top">
          <Seal />
          <span className="font-display text-lg tracking-[0.25em] text-paper uppercase">Kuroshio</span>
        </a>
        <ul className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-[11px] tracking-[0.3em] text-paper/70 uppercase transition hover:text-gold-soft"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="text-[11px] tracking-[0.3em] text-paper uppercase md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </nav>
      {open && (
        <ul id="mobile-menu" className="flex flex-col gap-1 px-5 pb-6 md:hidden">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)} className="block py-2 font-display text-3xl text-paper">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

/** Hanko-style seal: a vermilion square with a stylised wave. */
export function Seal({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="3" fill="#c2412d" />
      <path d="M6 20c3-5 6-5 8-2s5 3 6 0-1-6-4-5c4-3 9 0 9 5 0 6-6 8-10 5-2-2-4-2-6 0-1 1-2 1-3-3z" fill="#efe8dc" />
      <rect x="6" y="24" width="20" height="1.6" rx=".8" fill="#efe8dc" />
    </svg>
  );
}
