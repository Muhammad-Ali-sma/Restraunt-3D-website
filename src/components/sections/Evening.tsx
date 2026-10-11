const steps = [
  {
    time: "17:45",
    title: "Arrival",
    body: "A hot oshibori and a cup of genmaicha. Your seat is set with a cypress plate and a pair of chopsticks made for the night.",
  },
  {
    time: "18:00",
    title: "Tsumami",
    body: "Six small plates: ankimo, a warm chawanmushi, grilled nodoguro, each paired with a pour from our sake list of forty.",
  },
  {
    time: "18:40",
    title: "Nigiri",
    body: "Eleven pieces, handed across the counter one at a time. Red vinegar shari, kept at body temperature.",
  },
  {
    time: "20:15",
    title: "Kanmi",
    body: "A closing tamago, a seasonal fruit and matcha whisked at the counter. Take your time. There is no rush to leave.",
  },
];

const fish = [
  "Kinmedai",
  "Nodoguro",
  "Shima-aji",
  "Kohada",
  "Akagai",
  "Bafun uni",
  "Kuruma ebi",
  "Sawara",
  "Hotaru-ika",
  "Anago",
];

export function Evening() {
  return (
    <section id="evening" className="relative border-t border-line py-24 sm:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        <div data-reveal>
          <p className="text-[11px] tracking-[0.35em] text-gold uppercase">03 — The evening</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.1] text-paper sm:text-6xl">
            Two and a half hours, <em className="text-gold-soft">one counter,</em> no menu.
          </h2>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              data-reveal
              style={{ "--d": `${i * 90}ms` } as React.CSSProperties}
              className="group relative bg-ink p-8 transition-colors duration-500 hover:bg-ink-3"
            >
              <span className="font-display text-sm text-gold">{s.time}</span>
              <h3 className="mt-10 font-display text-3xl text-paper">{s.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-paper-dim">{s.body}</p>
              <span className="absolute inset-x-8 bottom-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-700 ease-out-expo group-hover:scale-x-100" />
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-24 overflow-hidden border-y border-line py-6" aria-label="Fish in season">
        <div className="marquee flex w-max gap-12 whitespace-nowrap">
          {[...fish, ...fish].map((f, i) => (
            <span
              key={i}
              className="flex items-center gap-12 font-display text-3xl text-paper/40 italic sm:text-5xl"
              aria-hidden={i >= fish.length}
            >
              {f}
              <span className="size-1.5 rounded-full bg-vermilion" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
