export function Chef() {
  return (
    <section className="relative overflow-hidden border-t border-line bg-ink-2 py-28 sm:py-40">
      {/* Decorative watermark drawn as generated content so it isn't treated as page text */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 right-[-4vw] font-jp text-[38vw] leading-none text-paper/[0.025] select-none before:content-['一期一会'] sm:text-[26vw]"
      />
      <figure className="relative mx-auto max-w-4xl px-5 text-center sm:px-10" data-reveal>
        <p className="font-jp text-sm tracking-[0.5em] text-gold">一期一会</p>
        <blockquote className="mt-8 font-display text-3xl leading-snug text-paper sm:text-5xl">
          &ldquo;<em>Ichigo ichie</em>, one time, one meeting. The fish, the rice, the twelve of you at the counter:
          tonight will not happen twice. <span className="text-gold-soft">So we make it count.</span>&rdquo;
        </blockquote>
        <figcaption className="mt-10 text-[11px] tracking-[0.35em] text-paper-dim uppercase">
          Ren Takeda — Itamae, formerly of Ginza
        </figcaption>
      </figure>
    </section>
  );
}
