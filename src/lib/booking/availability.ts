import "server-only";
import { connectDB } from "../db";
import { AvailabilityRule, Booking, BookingHold, Experience, SiteSettings, SlotLedger, type IExperience } from "../models";
import { DEFAULT_EXPERIENCES, DEFAULT_SETTINGS, DEFAULT_WEEKLY_HOURS } from "../defaults";
import { addDays, hhmmToMinutes, minutesToLabel, todayInTz, weekdayOf, zonedToUtc } from "../utils";
import { HttpError } from "../security";

export type BookingSettings = typeof DEFAULT_SETTINGS;

export async function loadBookingSettings(): Promise<BookingSettings> {
  await connectDB();
  const s = await SiteSettings.findOne({ key: "main" }).lean();
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) } as BookingSettings;
}

export async function loadExperience(slug: string): Promise<IExperience> {
  await connectDB();
  const exp = await Experience.findOne({ slug, active: true }).lean();
  if (exp) return exp;
  const count = await Experience.estimatedDocumentCount();
  if (count === 0) {
    const d = DEFAULT_EXPERIENCES.find((e) => e.slug === slug);
    if (d) return { ...d, gallery: [], active: true } as IExperience;
  }
  throw new HttpError(404, "This experience is not available for booking.");
}

/** Opening window (minutes since midnight) for a date, or null if closed. */
export async function getOpeningWindow(date: string, resourceKey?: string) {
  await connectDB();
  const closures = await AvailabilityRule.find({
    key: "closure",
    date: { $lte: date },
    $or: [{ endDate: { $gte: date } }, { endDate: null, date }],
  }).lean();
  const closed = closures.some((c) => !c.resourceKey || c.resourceKey === resourceKey);
  if (closed) return null;

  const override = await AvailabilityRule.findOne({ key: "override", date }).lean();
  if (override?.openTime && override?.closeTime) {
    return { open: hhmmToMinutes(override.openTime), close: hhmmToMinutes(override.closeTime) };
  }
  const weekly = await AvailabilityRule.findOne({ key: "weekly" }).lean();
  const hours = weekly?.hours?.length ? weekly.hours : DEFAULT_WEEKLY_HOURS;
  const day = hours.find((h) => h.day === weekdayOf(date));
  if (!day || !day.open) return null;
  return { open: hhmmToMinutes(day.openTime), close: hhmmToMinutes(day.closeTime) };
}

export function slotKey(resourceKey: string, date: string, minutes: number) {
  return `${resourceKey}|${date}|${minutes}`;
}

/** Slot start minutes a booking occupies (duration + buffer, rounded up to the slot grid). */
export function coveredSlots(startMinutes: number, durationMin: number, bufferMin: number, interval: number) {
  const span = Math.ceil((durationMin + bufferMin) / interval);
  return Array.from({ length: span }, (_, i) => startMinutes + i * interval);
}

export function unitsFor(exp: Pick<IExperience, "capacityMode">, players: number) {
  return exp.capacityMode === "private" ? 1 : players;
}
export function capacityFor(exp: Pick<IExperience, "capacityMode" | "capacity">) {
  return exp.capacityMode === "private" ? 1 : exp.capacity;
}

/* ------------------------------ Hold expiry sweep ------------------------------ */

/** Release capacity held by a booking exactly once (slotKeys is cleared atomically). */
export async function releaseBookingSlots(bookingId: unknown) {
  const prev = await Booking.findOneAndUpdate(
    { _id: bookingId, "slotKeys.0": { $exists: true } },
    { $set: { slotKeys: [] } },
    { new: false },
  ).lean();
  if (!prev) return;
  await SlotLedger.updateMany({ key: { $in: prev.slotKeys }, used: { $gte: prev.units } }, { $inc: { used: -prev.units } });
}

const GRACE_MS = 2 * 60_000;

export async function releaseExpiredHolds(limit = 50) {
  await connectDB();
  const now = Date.now();
  const expired = await BookingHold.find({ status: "active", expiresAt: { $lt: new Date(now - GRACE_MS) } })
    .limit(limit)
    .lean();
  let released = 0;
  for (const hold of expired) {
    const claimed = await BookingHold.findOneAndUpdate({ _id: hold._id, status: "active" }, { $set: { status: "released" } });
    if (!claimed) continue;
    const booking = await Booking.findOneAndUpdate(
      { _id: hold.booking, status: { $in: ["held", "pending_payment"] }, paymentStatus: { $ne: "paid" } },
      { $set: { status: "expired", paymentStatus: "expired" } },
      { new: true },
    );
    if (booking) {
      await releaseBookingSlots(booking._id);
      released++;
    }
  }
  return released;
}

/* -------------------------------- Availability -------------------------------- */

export type SlotOption = { startMinutes: number; label: string; remaining: number; available: boolean };

export async function getAvailableSlots(opts: {
  experience: IExperience;
  date: string;
  durationMin: number;
  players: number;
  settings: BookingSettings;
  ignoreBookingId?: string;
}): Promise<{ open: boolean; reason?: string; slots: SlotOption[] }> {
  const { experience: exp, date, durationMin, players, settings } = opts;
  const today = todayInTz();
  if (date < today) return { open: false, reason: "This date has passed.", slots: [] };
  if (date > addDays(today, settings.maxAdvanceDays))
    return { open: false, reason: `Bookings open up to ${settings.maxAdvanceDays} days in advance.`, slots: [] };

  const window = await getOpeningWindow(date, exp.resourceKey);
  if (!window) return { open: false, reason: "We are closed on this date.", slots: [] };

  await releaseExpiredHolds(20).catch(() => 0);

  const interval = settings.slotIntervalMin;
  const capacity = capacityFor(exp);
  const units = unitsFor(exp, players);
  const ledger = await SlotLedger.find({ resourceKey: exp.resourceKey, date }).select("minutes used").lean();
  const used = new Map(ledger.map((l) => [l.minutes, l.used]));

  // When rescheduling, the booking's own current usage should not block itself.
  if (opts.ignoreBookingId) {
    const own = await Booking.findById(opts.ignoreBookingId).select("slotKeys units").lean();
    for (const k of own?.slotKeys ?? []) {
      const [, d, m] = k.split("|");
      if (d === date) used.set(Number(m), Math.max(0, (used.get(Number(m)) ?? 0) - (own?.units ?? 0)));
    }
  }

  const earliest = Date.now() + settings.minLeadMinutes * 60_000;
  const slots: SlotOption[] = [];
  for (let start = window.open; start + durationMin <= window.close; start += interval) {
    const startAt = zonedToUtc(date, start);
    if (startAt.getTime() < earliest) continue;
    const covered = coveredSlots(start, durationMin, exp.bufferMin, interval);
    const remaining = Math.min(...covered.map((m) => capacity - (used.get(m) ?? 0)));
    slots.push({ startMinutes: start, label: minutesToLabel(start), remaining, available: remaining >= units });
  }
  return { open: true, slots };
}

/* ---------------------------- Atomic reservation ---------------------------- */

/**
 * Reserve capacity across every covered slot atomically per slot. If any slot is full,
 * previously reserved slots are rolled back and a 409 is thrown.
 */
export async function reserveSlots(opts: {
  resourceKey: string;
  date: string;
  minutes: number[];
  units: number;
  capacity: number;
}) {
  const { resourceKey, date, minutes, units, capacity } = opts;
  if (units > capacity) throw new HttpError(409, "This group is larger than the available capacity.");
  const done: string[] = [];
  for (const m of minutes) {
    const key = slotKey(resourceKey, date, m);
    try {
      await SlotLedger.updateOne(
        { key },
        { $setOnInsert: { key, resourceKey, date, minutes: m, used: 0, capacity } },
        { upsert: true },
      );
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
    const res = await SlotLedger.findOneAndUpdate(
      { key, used: { $lte: capacity - units } },
      { $inc: { used: units }, $set: { capacity } },
      { new: true },
    );
    if (!res) {
      if (done.length) await SlotLedger.updateMany({ key: { $in: done } }, { $inc: { used: -units } });
      throw new HttpError(409, "Sorry, that time was just booked by someone else. Please choose another time.");
    }
    done.push(key);
  }
  return done;
}
