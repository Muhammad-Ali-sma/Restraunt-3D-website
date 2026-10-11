"use client";

import { gsap } from "gsap";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";
import { AmbientAudio } from "@/lib/audio-engine";
import { onStrike } from "@/lib/storm";
import { story, useStory } from "@/lib/story-store";

/**
 * Sound starts muted. Turning it on creates the generative soundscape inside
 * the click handler itself (Safari only unlocks audio synchronously within a
 * user gesture) and unmutes the opening film if there is one.
 */
export function SoundToggle() {
  const soundOn = useStory((s) => s.soundOn);
  const engine = useRef<AmbientAudio | null>(null);

  const toggle = () => {
    const next = !soundOn;
    if (next && !engine.current) {
      try {
        engine.current = new AmbientAudio();
      } catch {
        engine.current = null; // Web Audio unavailable: the film can still unmute.
      }
    }
    void engine.current?.setEnabled(next);
    story.setSound(next);
  };

  useEffect(() => {
    const audio = engine.current;
    if (!soundOn || !audio) return;
    const update = () => audio.update();
    gsap.ticker.add(update);
    const offStrike = onStrike((i) => audio.thunder(i));
    return () => {
      gsap.ticker.remove(update);
      offStrike();
    };
  }, [soundOn]);

  useEffect(
    () => () => {
      engine.current?.dispose();
      engine.current = null;
    },
    [],
  );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? "Mute sound" : "Turn sound on (ambient only, no dialogue)"}
      className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-ink/40 py-2.5 pr-3.5 pl-3 md:pr-4 text-bone/80 backdrop-blur-sm transition-colors hover:border-bone/40 hover:text-bone"
    >
      {soundOn ? (
        <Volume2 size={15} strokeWidth={1.5} aria-hidden="true" />
      ) : (
        <VolumeX size={15} strokeWidth={1.5} aria-hidden="true" />
      )}
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`w-[2px] bg-current ${soundOn ? "eq-bar" : ""}`}
            style={{ height: soundOn ? "100%" : "25%", animationDelay: `${i * -0.23}s` }}
          />
        ))}
      </span>
      <span className="eyebrow hidden text-[0.625rem] md:inline">{soundOn ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
