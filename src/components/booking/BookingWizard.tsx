"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { Calendar } from "./Calendar";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { FormAlert, TextArea, TextField } from "@/components/forms/Field";
import { postJson, type FieldErrors } from "@/components/forms/useSubmit";
import { WaiverForm, type WaiverTemplateDTO } from "@/components/waiver/WaiverForm";
import { cn, formatCAD } from "@/lib/utils";

export type WizardExperience = {
  slug: string;
  name: string;
  shortName?: string;
  icon: string;
  image?: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  bookable: boolean;
  isPrivateEvent: boolean;
  capacityMode: "players" | "private";
  resourceKey: string;
  defaultDurationMin: number;
};
export type WizardGame = {
  slug: string;
  name: string;
  experience: string;
  image?: string;
  durationMin?: number;
  minPlayers?: number;
  maxPlayers?: number;
  priceCents?: number;
  recommendedAge?: string;
};
export type WizardPlan = {
  _id: string;
  experience: string;
  name: string;
  durationMin: number;
  priceCents: number;
  unit: "person" | "session";
  minPlayers: number;
  maxPlayers: number;
  kind: string;
};

type Slot = { startMinutes: number; label: string; remaining: number; available: boolean };
type Quote = {
  unitPriceCents: number;
  priceTbc: boolean;
  unit: "person" | "session";
  durationMin: number;
  minPlayers: number;
  maxPlayers: number;
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  taxCents: number;
  taxRatePercent: number;
  taxLabel: string;
  totalCents: number;
  promotions: { slug: string; title: string; discountCents: number }[];
  promoMessage?: string;
};
type Hold = { bookingNumber: string; token: string; holdExpiresAt?: string };

const STEPS = ["Experience", "Date", "Time", "Players", "Details", "Summary", "Waiver", "Payment"] as const;

async function fetchCalendar(resourceKey: string) {
  const r = await fetch(`/api/booking/calendar?resource=${encodeURIComponent(resourceKey)}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return {
    today: d.today as string,
    maxDate: d.maxDate as string,
    open: new Set<string>(d.dates.filter((x: { open: boolean }) => x.open).map((x: { date: string }) => x.date)),
  };
}

function fmtDate(d: string) {
  return new Intl.DateTimeFormat("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
}

export function BookingWizard({
  experiences,
  games,
  plans,
  initial,
  waiverTiming,
  payOnline,
  dbReady,
}: {
  experiences: WizardExperience[];
  games: WizardGame[];
  plans: WizardPlan[];
  initial: { experience?: string; game?: string; plan?: string };
  waiverTiming: "before_payment" | "before_arrival";
  payOnline: boolean;
  dbReady: boolean;
}) {
  const initialExp = experiences.find((e) => e.slug === initial.experience && e.bookable) ?? null;
  const [step, setStep] = useState(initialExp ? 1 : 0);
  const [expSlug, setExpSlug] = useState<string | null>(initialExp?.slug ?? null);
  const [gameSlug, setGameSlug] = useState<string>(initial.game && games.some((g) => g.slug === initial.game) ? initial.game : "");
  const [planId, setPlanId] = useState<string>(initial.plan && plans.some((p) => p._id === initial.plan) ? initial.plan : "");
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [rawPlayers, setPlayers] = useState(1);
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [isBirthday, setIsBirthday] = useState(false);
  const [event, setEvent] = useState({ occasion: "", birthdayName: "", company: "" });
  const [promoCode, setPromoCode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [waiver, setWaiver] = useState<WaiverTemplateDTO | null | "none">(null);
  const [waiverSigned, setWaiverSigned] = useState(false);

  const [calendar, setCalendar] = useState<{ today: string; maxDate: string; open: Set<string> } | null>(null);
  const [slots, setSlots] = useState<{ open: boolean; reason?: string; slots: Slot[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [now, setNow] = useState(() => Date.now());

  const exp = experiences.find((e) => e.slug === expSlug) ?? null;
  const expGames = useMemo(() => games.filter((g) => g.experience === expSlug), [games, expSlug]);
  const expPlans = useMemo(() => plans.filter((p) => p.experience === expSlug && p.kind === "standard"), [plans, expSlug]);
  const game = expGames.find((g) => g.slug === gameSlug) ?? null;
  const plan = expPlans.find((p) => p._id === planId) ?? (game?.priceCents != null ? null : expPlans[0] ?? null);
  const hasPricing = game?.priceCents != null || !!plan;

  const limits = useMemo(() => {
    if (!exp) return { min: 1, max: 1, duration: 30 };
    const min = Math.max(exp.minPlayers, game?.minPlayers ?? 1, game?.priceCents != null ? 1 : plan?.minPlayers ?? 1);
    let max = Math.min(exp.maxPlayers, game?.maxPlayers ?? Infinity, game?.priceCents != null ? Infinity : plan?.maxPlayers ?? Infinity);
    if (exp.capacityMode === "players" && slot) max = Math.min(max, slot.remaining);
    return { min, max: Math.max(min, max), duration: game?.durationMin ?? plan?.durationMin ?? exp.defaultDurationMin };
  }, [exp, game, plan, slot]);

  // Player count is always kept inside the limits of the current selection.
  const players = Math.min(Math.max(rawPlayers, limits.min), limits.max);

  // Countdown for the temporary hold.
  useEffect(() => {
    if (!hold?.holdExpiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hold?.holdExpiresAt]);
  const remainingMs = hold?.holdExpiresAt ? new Date(hold.holdExpiresAt).getTime() - now : null;

  /* ------------------------------- Data loading ------------------------------- */
  const loadCalendar = (resourceKey: string) =>
    fetchCalendar(resourceKey)
      .then(setCalendar)
      .catch((e: Error) => setError(e.message || "Could not load the calendar."));

  // Deep links (e.g. /booking?experience=vr-arena) start on the date step.
  const initialResource = initialExp?.resourceKey;
  useEffect(() => {
    if (!initialResource) return;
    let alive = true;
    fetchCalendar(initialResource)
      .then((c) => alive && setCalendar(c))
      .catch((e: Error) => alive && setError(e.message || "Could not load the calendar."));
    return () => {
      alive = false;
    };
  }, [initialResource]);

  async function loadSlots() {
    if (!exp || !date) return;
    setLoading(true);
    setSlots(null);
    try {
      const qs = new URLSearchParams({ experience: exp.slug, date, players: String(limits.min) });
      if (gameSlug) qs.set("game", gameSlug);
      if (plan) qs.set("plan", plan._id);
      const r = await fetch(`/api/booking/availability?${qs}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSlots(d);
    } catch (e) {
      setError((e as Error).message || "Could not load available times.");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuote() {
    if (!exp) return;
    setLoading(true);
    setQuote(null);
    try {
      const q = await postJson<Quote>("/api/booking/quote", {
        experience: exp.slug,
        game: gameSlug,
        pricingPlan: plan?._id ?? "",
        players,
        isBirthday,
        promoCode,
      });
      setQuote(q);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWaiver() {
    try {
      const d = await (await fetch("/api/waiver/template")).json();
      setWaiver(d.published ? d : "none");
    } catch {
      setWaiver("none");
    }
  }

  /** Move to a step and load whatever that step needs. */
  function go(n: number) {
    setError(null);
    setFieldErrors({});
    setStep(n);
    if (n === 1 && exp && !calendar) loadCalendar(exp.resourceKey);
    if (n === 2) loadSlots();
    if (n === 5 && !hold) loadQuote();
    if (n === 6 && !waiver) loadWaiver();
    document.getElementById("booking-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* --------------------------------- Actions --------------------------------- */
  async function reserve() {
    if (!exp || !date || !slot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postJson<{ bookingNumber: string; token: string; booking: { holdExpiresAt?: string } }>("/api/booking/hold", {
        experience: exp.slug,
        game: gameSlug,
        pricingPlan: plan?._id ?? "",
        date,
        startMinutes: slot.startMinutes,
        players,
        customer,
        notes: notes || undefined,
        isBirthday,
        event: exp.isPrivateEvent || isBirthday ? { type: exp.isPrivateEvent ? "Private event" : undefined, ...event } : undefined,
        promoCode,
      });
      setHold({ bookingNumber: res.bookingNumber, token: res.token, holdExpiresAt: res.booking.holdExpiresAt });
      go(6);
    } catch (e) {
      const err = e as Error & { details?: FieldErrors; status?: number };
      setError(err.message);
      if (err.details) setFieldErrors(err.details);
      if (err.status === 409) {
        setSlot(null);
        setSlots(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function checkout() {
    if (!hold) return;
    setLoading(true);
    setError(null);
    try {
      const res = await postJson<{ mode: string; redirectUrl: string }>("/api/booking/checkout", { bookingNumber: hold.bookingNumber, token: hold.token });
      window.location.assign(res.redirectUrl);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  /* ---------------------------------- Guards --------------------------------- */
  const detailsValid = customer.name.trim().length >= 2 && /\S+@\S+\.\S+/.test(customer.email) && customer.phone.replace(/\D/g, "").length >= 7;
  const waiverRequiredNow = waiverTiming === "before_payment" && waiver && waiver !== "none";
  const canContinue: Record<number, boolean> = {
    0: !!exp && exp.bookable,
    1: !!date,
    2: !!slot,
    3: players >= limits.min && players <= limits.max,
    4: detailsValid,
    5: !!quote,
    6: !waiverRequiredNow || waiverSigned,
  };

  if (!dbReady) {
    return (
      <FormAlert kind="info">
        Online booking is being set up. Please call or email us to reserve your session in the meantime.
      </FormAlert>
    );
  }

  /* ---------------------------------- Render --------------------------------- */
  return (
    <div id="booking-top" className="scroll-mt-28">
      {/* Progress */}
      <ol className="mb-8 flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none]" aria-label="Booking progress">
        {STEPS.map((s, i) => (
          <li key={s} className="min-w-[72px] flex-1" aria-current={i === step ? "step" : undefined}>
            <div className={cn("h-1.5 rounded-full transition-colors", i < step ? "bg-cyan" : i === step ? "bg-red shadow-[0_0_10px_#ff254a]" : "bg-white/10")} />
            <p className={cn("mt-2 text-center text-[11px] font-semibold uppercase tracking-wider", i === step ? "text-ink" : "text-muted")}>
              <span className="font-orbitron">{i + 1}</span> {s}
            </p>
          </li>
        ))}
      </ol>

      {hold && remainingMs != null && step < 8 && (
        <div className={cn("mb-6 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm", remainingMs > 5 * 60_000 ? "border-cyan/40 bg-cyan/5" : "border-red/50 bg-red/10")} role="status">
          <Timer className="size-5 shrink-0 text-cyan" aria-hidden="true" />
          {remainingMs > 0 ? (
            <span>
              Your time slot is held for{" "}
              <strong className="font-orbitron">
                {Math.floor(remainingMs / 60000)}:{String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}
              </strong>
              . Complete your booking before it expires.
            </span>
          ) : (
            <span>
              Your hold has expired.{" "}
              <button type="button" className="font-semibold text-cyan underline" onClick={() => window.location.reload()}>
                Start again
              </button>
            </span>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          aria-labelledby="step-title"
        >
          <h2 id="step-title" className="section-title mb-6 text-3xl sm:text-4xl">
            {
              [
                "Choose your experience",
                "Select a date",
                "Select a time",
                "Number of players",
                "Your details",
                "Booking summary",
                "Online waiver",
                "Payment",
              ][step]
            }
          </h2>

          {/* STEP 1: Experience */}
          {step === 0 && (
            <div className="space-y-8">
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Experience">
                {experiences.map((e) => {
                  const selected = e.slug === expSlug;
                  return (
                    <li key={e.slug}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={!e.bookable}
                        onClick={() => {
                          setExpSlug(e.slug);
                          setGameSlug("");
                          setPlanId("");
                          setCalendar(null);
                          setDate(null);
                          setSlot(null);
                        }}
                        className={cn(
                          "card-neon group flex w-full items-center gap-4 overflow-hidden p-3 text-left disabled:opacity-50",
                          selected && "border-cyan! shadow-[0_0_26px_rgba(0,223,255,0.35)]!",
                        )}
                      >
                        <span className="relative size-20 shrink-0 overflow-hidden rounded-lg">
                          <SmartImage src={e.image} alt="" fill sizes="80px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 font-display text-lg font-bold uppercase leading-tight">
                            <Icon name={e.icon} className="size-5 shrink-0 text-cyan" /> {e.shortName || e.name}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-xs text-muted">{e.bookable ? e.description : "Booked by inquiry only"}</span>
                        </span>
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", selected ? "border-cyan bg-cyan text-bg" : "border-white/20")}>
                          {selected && <Check className="size-4" aria-hidden="true" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {exp && expGames.length > 0 && (
                <div className="max-w-xl">
                  <label htmlFor="game-select" className="mb-3 block font-display text-xl font-bold uppercase">
                    Choose a game (optional)
                  </label>
                  <select id="game-select" className="field" value={gameSlug} onChange={(e) => setGameSlug(e.target.value)}>
                    <option value="">No preference / decide at the arena</option>
                    {expGames.map((g) => (
                      <option key={g.slug} value={g.slug}>
                        {g.name}
                        {g.recommendedAge ? ` (${g.recommendedAge})` : ""}
                        {g.priceCents != null ? ` - ${formatCAD(g.priceCents)}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {exp && !(game?.priceCents != null) && expPlans.length > 1 && (
                <div>
                  <h3 className="mb-3 font-display text-xl font-bold uppercase">Session option</h3>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Session option">
                    {expPlans.map((p) => {
                      const sel = (plan?._id ?? "") === p._id;
                      return (
                        <li key={p._id}>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={sel}
                            onClick={() => setPlanId(p._id)}
                            className={cn("card-neon flex w-full items-center justify-between p-4 text-left", sel && "border-cyan!")}
                          >
                            <span>
                              <span className="block font-semibold">{p.name}</span>
                              <span className="text-xs text-muted">{p.durationMin} min · {p.minPlayers}–{p.maxPlayers} players</span>
                            </span>
                            <span className="font-orbitron text-cyan">
                              {formatCAD(p.priceCents)}
                              <span className="block text-right font-sans text-[10px] text-muted">/{p.unit}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {exp && !hasPricing && (
                <FormAlert kind="info">Our team will confirm the price with you before your visit. No payment is taken online for this booking.</FormAlert>
              )}
              {exp?.isPrivateEvent && (
                <FormAlert kind="info">
                  Planning a larger party or a private event?{" "}
                  <a className="text-cyan underline" href="/parties#inquiry">
                    Send an event inquiry
                  </a>{" "}
                  and our team will tailor a package for you.
                </FormAlert>
              )}
            </div>
          )}

          {/* STEP 2: Date */}
          {step === 1 &&
            (calendar ? (
              <div>
                <Calendar
                  today={calendar.today}
                  maxDate={calendar.maxDate}
                  openDates={calendar.open}
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setSlot(null);
                    setSlots(null);
                  }}
                />
                <p className="mt-4 text-center text-sm text-muted">All times are in Winnipeg time (Central Time).</p>
              </div>
            ) : (
              <LoadingBlock />
            ))}

          {/* STEP 3: Time */}
          {step === 2 && (
            <div>
              <p className="mb-4 text-muted">
                {date && fmtDate(date)} · {limits.duration}-minute session
              </p>
              {loading && !slots ? (
                <LoadingBlock />
              ) : slots && !slots.open ? (
                <FormAlert kind="info">{slots.reason || "No times available on this date."}</FormAlert>
              ) : slots && slots.slots.length === 0 ? (
                <FormAlert kind="info">No more times are available on this date. Please choose another day.</FormAlert>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Available times">
                  {slots?.slots.map((s) => {
                    const sel = slot?.startMinutes === s.startMinutes;
                    return (
                      <li key={s.startMinutes}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={sel}
                          disabled={!s.available}
                          onClick={() => setSlot(s)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-3 text-center transition-all",
                            s.available ? "border-cyan/30 hover:border-cyan hover:bg-cyan/10" : "cursor-not-allowed border-white/5 text-muted/40",
                            sel && "border-cyan bg-cyan/15 shadow-[0_0_20px_rgba(0,223,255,0.35)]",
                          )}
                        >
                          <span className="font-orbitron block text-base">{s.label}</span>
                          <span className="text-[11px] text-muted">
                            {!s.available ? "Full" : exp?.capacityMode === "players" ? `${s.remaining} spots left` : "Available"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* STEP 4: Players */}
          {step === 3 && (
            <div className="card-neon mx-auto max-w-md p-8 text-center">
              <Users className="mx-auto size-10 text-cyan" aria-hidden="true" />
              <div className="mt-6 flex items-center justify-center gap-6">
                <button
                  type="button"
                  aria-label="Fewer players"
                  onClick={() => setPlayers(Math.max(limits.min, players - 1))}
                  disabled={players <= limits.min}
                  className="grid size-14 place-items-center rounded-xl border border-cyan/40 text-cyan disabled:opacity-30"
                >
                  <Minus className="size-6" />
                </button>
                <output className="font-orbitron w-20 text-6xl font-extrabold text-glow-cyan" aria-live="polite">
                  {players}
                </output>
                <button
                  type="button"
                  aria-label="More players"
                  onClick={() => setPlayers(Math.min(limits.max, players + 1))}
                  disabled={players >= limits.max}
                  className="grid size-14 place-items-center rounded-xl border border-cyan/40 text-cyan disabled:opacity-30"
                >
                  <Plus className="size-6" />
                </button>
              </div>
              <p className="mt-5 text-sm text-muted">
                {limits.min === limits.max ? `${limits.min} player` : `Between ${limits.min} and ${limits.max} players`} for this time slot.
              </p>
              {exp?.capacityMode === "players" && slot && slot.remaining <= exp.maxPlayers && (
                <p className="mt-1 text-xs text-muted">Only {slot.remaining} spots remain at {slot.label}.</p>
              )}
            </div>
          )}

          {/* STEP 5: Details */}
          {step === 4 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Full name"
                required
                autoComplete="name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                error={fieldErrors["customer.name"] || fieldErrors.customer}
              />
              <TextField label="Email address" type="email" required autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
              <TextField label="Phone number" type="tel" required autoComplete="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
              <TextField label="Number of participants" value={String(players)} readOnly hint="Change this in the Players step." />
              <label className="flex items-start gap-3 rounded-xl border border-white/10 p-4 text-sm sm:col-span-2">
                <input type="checkbox" className="mt-0.5 size-5 accent-cyan" checked={isBirthday} onChange={(e) => setIsBirthday(e.target.checked)} />
                <span>
                  <strong className="block text-ink">We&apos;re celebrating a birthday</strong>
                  <span className="text-muted">Birthday offers are applied automatically when eligible.</span>
                </span>
              </label>
              {(isBirthday || exp?.isPrivateEvent) && (
                <>
                  <TextField label="Birthday person / guest of honour" value={event.birthdayName} onChange={(e) => setEvent({ ...event, birthdayName: e.target.value })} />
                  <TextField label="Occasion" value={event.occasion} onChange={(e) => setEvent({ ...event, occasion: e.target.value })} placeholder="e.g. 10th birthday" />
                  {exp?.isPrivateEvent && (
                    <TextField label="Company / organization (optional)" className="sm:col-span-2" value={event.company} onChange={(e) => setEvent({ ...event, company: e.target.value })} />
                  )}
                </>
              )}
              <TextArea label="Booking notes (optional)" className="sm:col-span-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" />
              <TextField label="Promo code (optional)" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} autoComplete="off" />
            </div>
          )}

          {/* STEP 6: Summary */}
          {step === 5 && (
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="card-neon p-6">
                <dl className="divide-y divide-white/5 text-sm">
                  {[
                    ["Experience", exp?.name],
                    ...(game ? [["Game", game.name]] : []),
                    ["Date", date && fmtDate(date)],
                    ["Time", slot && `${slot.label} (Winnipeg time)`],
                    ["Players", String(players)],
                    ["Session duration", quote ? `${quote.durationMin} minutes` : `${limits.duration} minutes`],
                    ["Name", customer.name],
                    ["Email", customer.email],
                    ["Phone", customer.phone],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2.5">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card-neon is-red h-fit p-6">
                {loading && !quote ? (
                  <LoadingBlock />
                ) : quote?.priceTbc ? (
                  <div>
                    <p className="font-display text-lg font-bold uppercase">Price to be confirmed</p>
                    <p className="mt-2 text-sm text-muted">Our team will confirm the price when approving your booking. You pay at the venue.</p>
                  </div>
                ) : quote ? (
                  <dl className="space-y-2 text-sm">
                    <Row k={`Unit price (per ${quote.unit})`} v={formatCAD(quote.unitPriceCents)} />
                    <Row k="Subtotal" v={formatCAD(quote.subtotalCents)} />
                    {quote.promotions.map((p) => (
                      <Row key={p.slug} k={p.title} v={`− ${formatCAD(p.discountCents)}`} accent />
                    ))}
                    {quote.feeCents > 0 && <Row k="Booking fee" v={formatCAD(quote.feeCents)} />}
                    {quote.taxRatePercent > 0 && <Row k={`${quote.taxLabel} (${quote.taxRatePercent}%)`} v={formatCAD(quote.taxCents)} />}
                    <div className="neon-divider my-3" />
                    <div className="flex items-end justify-between">
                      <dt className="font-display text-lg font-bold uppercase">Total</dt>
                      <dd className="font-orbitron text-3xl text-glow-cyan text-cyan">{formatCAD(quote.totalCents)}</dd>
                    </div>
                    <p className="pt-1 text-xs text-muted">All prices in CAD.</p>
                    {quote.promoMessage && <p className="pt-2 text-xs text-red">{quote.promoMessage}</p>}
                  </dl>
                ) : null}
              </div>
            </div>
          )}

          {/* STEP 7: Waiver */}
          {step === 6 && (
            <div className="space-y-5">
              {waiver === null ? (
                <LoadingBlock />
              ) : waiver === "none" ? (
                <FormAlert kind="info">
                  Our online waiver is being finalized. You&apos;ll receive a link to sign before your visit, or you can sign on arrival.
                </FormAlert>
              ) : (
                <>
                  <FormAlert kind="info">
                    Every participant needs a signed waiver.{" "}
                    {waiverTiming === "before_payment"
                      ? "Please sign for yourself (or your child) now. Other participants can sign using the link in your confirmation."
                      : "You can sign now or later from your booking confirmation. All participants must sign before playing."}
                  </FormAlert>
                  <div className="card-neon p-5 sm:p-8">
                    <WaiverForm
                      template={waiver}
                      bookingNumber={hold?.bookingNumber}
                      token={hold?.token}
                      defaults={customer}
                      compact
                      onSigned={() => setWaiverSigned(true)}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 8: Payment */}
          {step === 7 && quote && (
            <div className="card-neon mx-auto max-w-lg p-8 text-center">
              {payOnline ? <CreditCard className="mx-auto size-12 text-cyan" aria-hidden="true" /> : <CalendarDays className="mx-auto size-12 text-cyan" aria-hidden="true" />}
              <p className="mt-4 text-muted">Amount due</p>
              <p className="font-orbitron text-3xl text-glow-cyan text-cyan sm:text-5xl">{quote.priceTbc ? "To be confirmed" : formatCAD(quote.totalCents)}</p>
              <p className="mt-4 text-sm text-muted">
                {payOnline && !quote.priceTbc
                  ? "You'll be redirected to Stripe's secure checkout. Your booking is confirmed once payment is verified."
                  : "Submit your booking request and our team will confirm your session. Payment is collected at the venue."}
              </p>
              <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted">
                <ShieldCheck className="size-4 text-cyan" aria-hidden="true" /> Card details are never stored by XVR.
              </p>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {error && (
        <div className="mt-6">
          <FormAlert kind="error">{error}</FormAlert>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-cyan/15 pt-6 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => go(step - 1)}
          disabled={step === 0 || loading || (!!hold && step <= 6)}
          title={hold && step <= 6 ? "Your time is held. To change details, start a new booking." : undefined}
        >
          <ArrowLeft className="size-5" aria-hidden="true" /> Back
        </button>
        {step < 5 && (
          <button type="button" className="btn btn-cyan" disabled={!canContinue[step] || loading} onClick={() => go(step + 1)}>
            Continue <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        )}
        {step === 5 && (
          <button type="button" className="btn btn-red" disabled={!quote || loading || (remainingMs != null && remainingMs <= 0)} onClick={reserve}>
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Clock className="size-5" aria-hidden="true" />}
            Reserve my spot
          </button>
        )}
        {step === 6 && (
          <button type="button" className="btn btn-cyan" disabled={!canContinue[6]} onClick={() => go(7)}>
            {waiverSigned || waiver === "none" || waiverTiming === "before_payment" ? "Continue" : "Sign later & continue"} <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        )}
        {step === 7 && (
          <button type="button" className="btn btn-red" disabled={loading || (remainingMs != null && remainingMs <= 0)} onClick={checkout}>
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : payOnline ? <CreditCard className="size-5" aria-hidden="true" /> : <Check className="size-5" aria-hidden="true" />}
            {payOnline && !quote?.priceTbc ? "Pay securely" : "Submit booking request"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={accent ? "text-cyan" : "text-muted"}>{k}</dt>
      <dd className={cn("font-medium", accent && "text-cyan")}>{v}</dd>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-muted" role="status">
      <Loader2 className="size-6 animate-spin text-cyan" aria-hidden="true" /> Loading…
    </div>
  );
}
