const stats = [
  { value: "12", label: "Seats at the hinoki counter" },
  { value: "17", label: "Courses, written each morning" },
  { value: "04", label: "Fishing ports along the current" },
  { value: "02", label: "Seatings a night — 18:00 & 20:45" },
];

export function Story() {
  return (
    <section id="story" className="relative border-t border-line py-24 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-10 lg:grid-cols-12">
        <div className="lg:col-span-5" data-reveal>
          <p className="text-[11px] tracking-[0.35em] text-gold uppercase">01 — The current</p>
          <div className="mt-8 flex items-start gap-6">
            <span className="font-jp text-7xl leading-none text-paper/90 [writing-mode:vertical-rl] sm:text-8xl">
              黒潮
            </span>
            <p className="font-display text-xl leading-relaxed text-paper-dim italic sm:text-2xl">
              Kuroshio — &ldquo;the black current&rdquo; — runs warm and dark along the coast of Japan, carrying the
              richest fish in the Pacific north with it.
            </p>
          </div>
        </div>
        <div
          className="space-y-8 lg:col-span-6 lg:col-start-7"
          data-reveal
          style={{ "--d": "150ms" } as React.CSSProperties}
        >
          <h2 className="font-display text-4xl leading-[1.1] text-paper sm:text-6xl">
            We cook <em className="text-gold-soft">only</em> what the sea sends us.
          </h2>
          <p className="max-w-xl leading-relaxed text-paper-dim">
            Every morning Chef Ren Takeda takes calls from four ports along the current: Ōma, Katsuura, Shiretoko and
            Kōchi. The menu is written once the boats come in. There is no à la carte and no second sitting of the same
            fish. You sit at twelve seats of hundred-year-old hinoki, and every piece is shaped in front of you and
            eaten within eight seconds.
          </p>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line">
            {stats.map((s) => (
              <div key={s.label} className="bg-ink p-6">
                <dt className="text-xs leading-relaxed text-paper-dim">{s.label}</dt>
                <dd className="mt-3 font-display text-5xl text-paper">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
