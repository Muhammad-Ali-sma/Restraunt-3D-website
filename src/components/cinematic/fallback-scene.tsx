"use client";

import { gsap } from "gsap";
import { useEffect, useMemo, useRef } from "react";
import { ASSET_PATHS, type AssetManifest } from "@/lib/assets";
import { director, INITIAL_SHOT } from "@/lib/director";
import { mulberry32 } from "@/lib/random";
import { WARRIOR } from "@/lib/warrior-figure";

/**
 * The CSS + SVG version of the film. It paints instantly (before Three.js has
 * loaded), and it is the whole experience on devices without WebGL. It reads
 * the same director values as the 3D scene, written into CSS variables once
 * per frame while it is visible.
 */
export function FallbackScene({ assets, active }: { assets: AssetManifest; active: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || !active) return;
    const write = () => {
      const s = director.shot;
      const zoom = INITIAL_SHOT.camZ / s.camZ;
      const vars: Record<string, number> = {
        "--fx-cam": 1 + (zoom - 1) * 0.35 + (1 - director.introPush) * 0.06,
        "--fx-sil": s.silhouette,
        "--fx-aura": Math.min(1, s.aura * 1.2),
        "--fx-gold": s.gold,
        "--fx-ultra": s.ultra,
        "--fx-ssj": s.ssj,
        "--fx-storm": s.storm,
        "--fx-dark": s.darkness,
        "--fx-cosmic": s.cosmic,
        "--fx-tunnel": s.tunnel,
        "--fx-strike": director.strike,
        "--fx-crack": s.crack,
        "--fx-ground": s.ground,
        "--fx-wave": s.wave,
      };
      for (const k in vars) el.style.setProperty(k, vars[k].toFixed(3));
    };
    write();
    gsap.ticker.add(write);
    return () => gsap.ticker.remove(write);
  }, [active]);

  const cracks = useMemo(() => crackPaths(), []);
  const embers = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: 22 }, () => ({
      left: `${8 + r() * 84}%`,
      "--dur": `${5 + r() * 6}s`,
      "--delay": `${-r() * 10}s`,
      "--drift": `${(r() - 0.5) * 120}px`,
    }));
  }, []);

  const images = assets.characterBase;

  return (
    <div ref={root} className="fb stage-layer" aria-hidden="true" style={{ display: active ? undefined : "none" }}>
      <div
        className="stage-layer fb-clouds"
        style={assets.battlefield ? { background: `url(${ASSET_PATHS.battlefield}) center 40% / cover` } : undefined}
      />
      <div
        className="stage-layer fb-cosmic"
        style={assets.cosmic ? { background: `url(${ASSET_PATHS.cosmic}) center / cover` } : undefined}
      />
      <div className="stage-layer fb-goldlight" />
      <div className="stage-layer fb-ground">
        <svg viewBox="0 0 1000 300" preserveAspectRatio="none">
          {cracks.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
      <div className="stage-layer fb-tunnel" />
      <div className="fb-figure">
        <div className="fb-aura" />
        {images ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local, optional art with alpha */}
            <img src={ASSET_PATHS.characterBase} alt="" className="fb-hair-base fb-rim" decoding="async" />
            {assets.characterSuperSaiyan ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ASSET_PATHS.characterSuperSaiyan}
                alt=""
                className="fb-hair-ssj fb-rim"
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </>
        ) : (
          <svg viewBox="0 0 1000 1500" className="fb-rim">
            <defs>
              <linearGradient id="fb-ssj" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#ff9a1a" />
                <stop offset="0.5" stopColor="#ffd040" />
                <stop offset="1" stopColor="#fff6c8" />
              </linearGradient>
            </defs>
            <g fill="#06070b">
              {WARRIOR.body.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g className="fb-hair-base" fill="#06070b">
              {WARRIOR.hairBase.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
            <g className="fb-hair-ssj" fill="url(#fb-ssj)">
              {WARRIOR.hairSsj.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </svg>
        )}
      </div>
      <div className="stage-layer fb-embers">
        {embers.map((style, i) => (
          <span key={i} style={style as React.CSSProperties} />
        ))}
      </div>
      <div className="stage-layer fb-strike" />
      <div className="stage-layer fb-wave" />
    </div>
  );
}

/** Jagged fissures radiating from under the character's feet. */
function crackPaths() {
  const r = mulberry32(21);
  const paths: string[] = [];
  for (let i = 0; i < 14; i++) {
    const dir = (i / 14) * Math.PI - Math.PI + (r() - 0.5) * 0.2;
    let x = 500;
    let y = 40;
    let d = `M${x} ${y}`;
    const steps = 6 + Math.floor(r() * 5);
    for (let s = 0; s < steps; s++) {
      const len = 30 + r() * 60;
      const a = dir + (r() - 0.5) * 0.9;
      x += Math.cos(a) * len * 1.6;
      y += Math.abs(Math.sin(a)) * len * 0.5 + 6;
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    paths.push(d);
  }
  return paths;
}
