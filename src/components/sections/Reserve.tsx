"use client";

import { useActionState, useSyncExternalStore } from "react";
import { reserve, type ReserveState } from "@/app/actions";

const initial: ReserveState = { ok: false };

// "Today" is read on the client only, so the page itself stays fully static.
const noop = () => () => {};
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const field =
  "w-full border-b border-paper/20 bg-transparent py-3 text-paper placeholder:text-paper/30 transition focus:border-gold focus:outline-none";
const label = "text-[11px] tracking-[0.3em] text-paper-dim uppercase";

export function Reserve() {
  const [state, action, pending] = useActionState(reserve, initial);
  const minDate = useSyncExternalStore(noop, today, () => undefined);

  const err = state.errors ?? {};

  return (
    <section id="reserve" className="relative border-t border-line py-24 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-10 lg:grid-cols-12">
        <div className="lg:col-span-5" data-reveal>
          <p className="text-[11px] tracking-[0.35em] text-gold uppercase">04 — Reserve</p>
          <h2 className="mt-4 font-display text-4xl leading-[1.1] text-paper sm:text-6xl">
            Take a seat <em className="text-gold-soft">at the counter.</em>
          </h2>
          <p className="mt-6 max-w-md leading-relaxed text-paper-dim">
            Seats open thirty days ahead, on the first of each month at noon. The omakase is ¥38,000 per guest. Tell us
            about allergies when you book. The fish changes, but our care doesn&apos;t.
          </p>
        </div>

        <div className="lg:col-span-6 lg:col-start-7" data-reveal style={{ "--d": "150ms" } as React.CSSProperties}>
          {state.ok ? (
            <div className="rounded-sm border border-gold/40 bg-ink-2 p-10" role="status">
              <p className="font-jp text-gold">ありがとうございます</p>
              <p className="mt-4 font-display text-3xl text-paper">{state.message}</p>
              <p className="mt-6 text-sm text-paper-dim">
                Reference <span className="font-mono text-gold-soft">{state.code}</span>. This is a portfolio demo, so
                no booking was made.
              </p>
            </div>
          ) : (
            <form action={action} noValidate className="grid gap-8 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className={label}>Name</span>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  className={field}
                  placeholder="Your full name"
                  aria-invalid={!!err.name}
                />
                {err.name && <span className="mt-2 block text-xs text-vermilion">{err.name}</span>}
              </label>
              <label className="sm:col-span-2">
                <span className={label}>Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={field}
                  placeholder="you@example.com"
                  aria-invalid={!!err.email}
                />
                {err.email && <span className="mt-2 block text-xs text-vermilion">{err.email}</span>}
              </label>
              <label>
                <span className={label}>Date</span>
                <input
                  name="date"
                  type="date"
                  min={minDate}
                  required
                  className={`${field} [color-scheme:dark]`}
                  aria-invalid={!!err.date}
                />
                {err.date && <span className="mt-2 block text-xs text-vermilion">{err.date}</span>}
              </label>
              <label>
                <span className={label}>Guests</span>
                <select
                  name="guests"
                  defaultValue="2"
                  className={`${field} [color-scheme:dark]`}
                  aria-invalid={!!err.guests}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n} className="bg-ink">
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
                {err.guests && <span className="mt-2 block text-xs text-vermilion">{err.guests}</span>}
              </label>
              <fieldset className="sm:col-span-2">
                <legend className={label}>Seating</legend>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {["18:00", "20:45"].map((s, i) => (
                    <label key={s} className="cursor-pointer">
                      <input type="radio" name="seating" value={s} defaultChecked={i === 0} className="peer sr-only" />
                      <span className="block rounded-sm border border-paper/20 px-5 py-4 text-center font-display text-2xl text-paper/60 transition peer-checked:border-gold peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-gold">
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
                {err.seating && <span className="mt-2 block text-xs text-vermilion">{err.seating}</span>}
              </fieldset>
              <div className="flex flex-wrap items-center gap-6 sm:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-paper px-8 py-4 text-xs font-medium tracking-[0.25em] text-ink uppercase transition hover:bg-gold-soft disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Request seats"}
                </button>
                {state.message && !state.ok && (
                  <p className="text-sm text-vermilion" role="alert">
                    {state.message}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
