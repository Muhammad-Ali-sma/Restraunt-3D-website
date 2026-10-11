"use server";

export type ReserveState = {
  ok: boolean;
  code?: string;
  message?: string;
  errors?: Partial<Record<"name" | "email" | "date" | "seating" | "guests", string>>;
};

const SEATINGS = new Set(["18:00", "20:45"]);

/**
 * Validates a reservation request on the server. This is a portfolio demo,
 * so nothing is stored — it returns a confirmation reference instead.
 */
export async function reserve(_prev: ReserveState, form: FormData): Promise<ReserveState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const date = String(form.get("date") ?? "");
  const seating = String(form.get("seating") ?? "");
  const guests = Number(form.get("guests"));

  const errors: ReserveState["errors"] = {};
  if (name.length < 2) errors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "That email doesn't look right.";

  const day = new Date(`${date}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!date || Number.isNaN(day.getTime())) errors.date = "Choose a date.";
  else if (day < today) errors.date = "That date has already passed.";
  else if (day.getDay() === 0 || day.getDay() === 1) errors.date = "We're closed Sundays and Mondays.";

  if (!SEATINGS.has(seating)) errors.seating = "Choose a seating.";
  if (!Number.isInteger(guests) || guests < 1 || guests > 4) errors.guests = "The counter seats parties of 1–4.";

  if (Object.keys(errors).length) return { ok: false, errors, message: "A few details need another look." };

  const code = `KS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  return {
    ok: true,
    code,
    message: `${name.split(" ")[0]}, your request for ${guests} at ${seating} is noted.`,
  };
}
