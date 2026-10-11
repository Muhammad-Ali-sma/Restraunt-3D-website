import { Seal } from "./Nav";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <Seal size={36} />
            <span className="font-display text-2xl tracking-[0.25em] text-paper uppercase">Kuroshio</span>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper-dim">
            A fictional omakase counter, designed and built as a portfolio piece in Next.js and React Three Fiber. Every
            dish, texture and frame of film on this page is generated in code.
          </p>
        </div>
        <div>
          <h3 className="text-[11px] tracking-[0.35em] text-gold uppercase">Find us</h3>
          <address className="mt-4 text-sm leading-relaxed text-paper-dim not-italic">
            14 Tsukiji Lane
            <br />
            Harbour District
            <br />
            <a href="mailto:counter@kuroshio.example" className="transition hover:text-paper">
              counter@kuroshio.example
            </a>
          </address>
        </div>
        <div>
          <h3 className="text-[11px] tracking-[0.35em] text-gold uppercase">Hours</h3>
          <dl className="mt-4 space-y-1 text-sm text-paper-dim">
            <div className="flex justify-between gap-4">
              <dt>Tue — Sat</dt>
              <dd>18:00 · 20:45</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Sun — Mon</dt>
              <dd>Closed for the market</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="hairline" />
      <p className="mx-auto max-w-7xl px-5 py-6 text-[11px] tracking-[0.25em] text-paper-dim uppercase sm:px-10">
        Kuroshio is a concept restaurant · Portfolio project
      </p>
    </footer>
  );
}
