import "server-only";
import crypto from "node:crypto";
import { connectDB } from "../db";
import { Booking, BookingHold, Payment, Promotion, WaiverTemplate, type IBooking } from "../models";
import { HttpError, randomToken } from "../security";
import type { HoldInput } from "../validation";
import {
  capacityFor,
  coveredSlots,
  getAvailableSlots,
  loadBookingSettings,
  loadExperience,
  releaseBookingSlots,
  reserveSlots,
  unitsFor,
} from "./availability";
import { buildQuote } from "./pricing";
import { getStripe, isStripeConfigured } from "../stripe";
import { siteUrl, zonedToUtc, formatDateTime } from "../utils";
import {
  bookingAdminLines,
  notifyAdmins,
  sendCustomerBookingEmail,
  sendPaymentReceipt,
} from "../emails";

function newBookingNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(7);
  return "XVR-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function waiverRequirement(players: number) {
  const published = await WaiverTemplate.exists({ status: "published" });
  return published
    ? { waiverStatus: "pending" as const, waiversRequired: players }
    : { waiverStatus: "unavailable" as const, waiversRequired: players };
}

/** Step 1 of checkout: validate everything server-side and place a temporary capacity hold. */
export async function createHold(input: HoldInput) {
  await connectDB();
  const settings = await loadBookingSettings();
  const exp = await loadExperience(input.experience);
  if (!exp.bookable) throw new HttpError(400, "This experience is booked by inquiry only. Please send us an event inquiry.");

  const quote = await buildQuote({
    exp,
    settings,
    players: input.players,
    gameSlug: input.game || undefined,
    planId: input.pricingPlan || undefined,
    isBirthday: input.isBirthday,
    promoCode: input.promoCode || undefined,
  });

  const { slots, open, reason } = await getAvailableSlots({
    experience: exp,
    date: input.date,
    durationMin: quote.durationMin,
    players: input.players,
    settings,
  });
  if (!open) throw new HttpError(409, reason || "This date is not available.");
  const slot = slots.find((s) => s.startMinutes === input.startMinutes);
  if (!slot) throw new HttpError(409, "That time is not available. Please choose another time.");
  if (!slot.available) throw new HttpError(409, "That time is fully booked. Please choose another time.");

  const units = unitsFor(exp, input.players);
  const minutes = coveredSlots(input.startMinutes, quote.durationMin, exp.bufferMin, settings.slotIntervalMin);
  const slotKeys = await reserveSlots({
    resourceKey: exp.resourceKey,
    date: input.date,
    minutes,
    units,
    capacity: capacityFor(exp),
  });

  const startAt = zonedToUtc(input.date, input.startMinutes);
  const holdMinutes = Math.max(30, settings.holdMinutes); // Stripe sessions last at least 30 minutes
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60_000);

  try {
    let booking = null;
    for (let attempt = 0; attempt < 3 && !booking; attempt++) {
      try {
        booking = await Booking.create({
          bookingNumber: newBookingNumber(),
          publicToken: randomToken(24),
          experience: exp.slug,
          experienceName: exp.name,
          game: quote.game?.slug,
          gameName: quote.game?.name,
          pricingPlan: quote.planId,
          resourceKey: exp.resourceKey,
          date: input.date,
          startMinutes: input.startMinutes,
          startAt,
          endAt: new Date(startAt.getTime() + quote.durationMin * 60_000),
          durationMin: quote.durationMin,
          players: input.players,
          units,
          slotKeys,
          customer: input.customer,
          notes: input.notes,
          event: input.event,
          isBirthday: !!input.isBirthday,
          pricing: {
            unitPriceCents: quote.unitPriceCents,
            unit: quote.unit,
            subtotalCents: quote.subtotalCents,
            discountCents: quote.discountCents,
            feeCents: quote.feeCents,
            taxCents: quote.taxCents,
            taxRatePercent: quote.taxRatePercent,
            totalCents: quote.totalCents,
            promotions: quote.promotions,
          },
          status: "held",
          paymentStatus: "unpaid",
          holdExpiresAt,
          ...(await waiverRequirement(input.players)),
        });
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }
    if (!booking) throw new HttpError(500, "Could not create booking. Please try again.");
    await BookingHold.create({ booking: booking._id, slotKeys, units, expiresAt: holdExpiresAt });
    return { booking, quote, settings };
  } catch (err) {
    // Roll back the capacity reservation if the booking record could not be written.
    const { SlotLedger } = await import("../models");
    await SlotLedger.updateMany({ key: { $in: slotKeys } }, { $inc: { used: -units } });
    throw err;
  }
}

export async function findBookingForCustomer(bookingNumber: string, token: string) {
  await connectDB();
  const b = await Booking.findOne({ bookingNumber }).lean();
  if (!b || !token || b.publicToken !== token) return null;
  return b;
}

/**
 * Step 2 of checkout. With Stripe configured, creates a Checkout Session.
 * Otherwise the booking becomes a "requested" reservation awaiting admin approval (no fake payment).
 */
export async function startCheckout(bookingNumber: string, token: string) {
  await connectDB();
  const booking = await Booking.findOne({ bookingNumber });
  if (!booking || booking.publicToken !== token) throw new HttpError(404, "Booking not found.");
  if (!["held", "pending_payment"].includes(booking.status)) {
    throw new HttpError(409, booking.status === "expired" ? "This checkout has expired. Please start a new booking." : "This booking is already being processed.");
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() < Date.now()) {
    throw new HttpError(409, "Your reserved time has expired. Please start a new booking.");
  }
  const settings = await loadBookingSettings();

  const payOnline = settings.onlinePaymentsEnabled && isStripeConfigured() && booking.pricing.totalCents > 0;
  if (!payOnline) {
    booking.status = "requested";
    booking.paymentStatus = booking.pricing.totalCents > 0 ? "pay_at_venue" : "unpaid";
    booking.holdExpiresAt = undefined;
    await booking.save();
    await BookingHold.updateOne({ booking: booking._id, status: "active" }, { $set: { status: "converted" } });
    await sendCustomerBookingEmail(booking.toObject(), "requested", { dedupe: true });
    await notifyAdmins("New booking request", "New booking request (awaiting approval)", bookingAdminLines(booking.toObject()), `${siteUrl()}/admin/bookings?q=${booking.bookingNumber}`);
    return { mode: "request" as const, redirectUrl: `/booking/confirmation/${booking.bookingNumber}?t=${booking.publicToken}` };
  }

  // Reuse a still-open Stripe session if the customer clicks pay twice.
  const stripe = getStripe();
  if (booking.stripeSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(booking.stripeSessionId).catch(() => null);
    if (existing && existing.status === "open" && existing.url) return { mode: "stripe" as const, redirectUrl: existing.url };
  }

  const base = siteUrl();
  const expiresAt = Math.floor(Math.max(booking.holdExpiresAt!.getTime(), Date.now() + 31 * 60_000) / 1000);
  const description = `${formatDateTime(booking.startAt)} · ${booking.players} player(s) · ${booking.durationMin} min`;
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      currency: "cad",
      customer_email: booking.customer.email,
      client_reference_id: booking.bookingNumber,
      metadata: { bookingId: String(booking._id), bookingNumber: booking.bookingNumber },
      payment_intent_data: { metadata: { bookingId: String(booking._id), bookingNumber: booking.bookingNumber } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: booking.pricing.totalCents,
            product_data: {
              name: `XVR – ${booking.experienceName}${booking.gameName ? `: ${booking.gameName}` : ""}`,
              description,
            },
          },
        },
      ],
      expires_at: expiresAt,
      success_url: `${base}/booking/confirmation/${booking.bookingNumber}?t=${booking.publicToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/booking/confirmation/${booking.bookingNumber}?t=${booking.publicToken}&cancelled=1`,
    },
    { idempotencyKey: `checkout-${booking.bookingNumber}-${booking.updatedAt?.getTime()}` },
  );

  booking.stripeSessionId = session.id;
  booking.status = "pending_payment";
  booking.paymentStatus = "pending";
  booking.holdExpiresAt = new Date(expiresAt * 1000);
  await booking.save();
  await BookingHold.updateOne({ booking: booking._id, status: "active" }, { $set: { expiresAt: booking.holdExpiresAt } });
  await Payment.updateOne(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        booking: booking._id,
        bookingNumber: booking.bookingNumber,
        provider: "stripe",
        stripeSessionId: session.id,
        amountCents: booking.pricing.totalCents,
        currency: "cad",
        status: "pending",
      },
    },
    { upsert: true },
  );
  return { mode: "stripe" as const, redirectUrl: session.url! };
}

/**
 * Mark a booking paid after Stripe confirms it (webhook or verified session lookup).
 * Idempotent: repeat calls for the same session do nothing.
 */
export async function markPaidFromSession(session: {
  id: string;
  payment_status: string;
  amount_total: number | null;
  payment_intent: string | { id: string } | null;
  metadata?: Record<string, string> | null;
}) {
  await connectDB();
  if (session.payment_status !== "paid") return null;
  const booking = await Booking.findOne({ stripeSessionId: session.id });
  if (!booking) return null;
  if (booking.paymentStatus === "paid") return booking;
  if (session.amount_total !== booking.pricing.totalCents) {
    console.error("[stripe] amount mismatch for", booking.bookingNumber);
  }

  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  let receiptUrl: string | undefined;
  try {
    if (piId) {
      const pi = await getStripe().paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
      const charge = pi.latest_charge as { receipt_url?: string } | null;
      receiptUrl = charge?.receipt_url ?? undefined;
    }
  } catch {
    /* receipt URL is optional */
  }

  // Atomic transition so concurrent webhook + redirect verification only confirm once.
  const updated = await Booking.findOneAndUpdate(
    { _id: booking._id, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "paid", status: booking.status === "expired" ? "requested" : "confirmed" }, $unset: { holdExpiresAt: 1 } },
    { new: true },
  );
  if (!updated) return booking;

  if (booking.status === "expired") {
    // Paid after the hold lapsed: slot may have been resold. Flag for staff.
    updated.adminNotes = `${updated.adminNotes ?? ""}\nPayment received after checkout hold expired – please confirm the time slot manually.`.trim();
    await updated.save();
  }
  await BookingHold.updateOne({ booking: booking._id, status: "active" }, { $set: { status: "converted" } });
  await Payment.updateOne(
    { stripeSessionId: session.id },
    {
      $set: { status: "paid", stripePaymentIntentId: piId, receiptUrl, amountCents: session.amount_total ?? booking.pricing.totalCents },
      $setOnInsert: { booking: booking._id, bookingNumber: booking.bookingNumber, provider: "stripe", currency: "cad" },
    },
    { upsert: true },
  );
  for (const p of updated.pricing.promotions ?? []) {
    await Promotion.updateOne({ slug: p.slug }, { $inc: { redemptions: 1 } });
  }

  const plain = updated.toObject();
  await sendCustomerBookingEmail(plain, plain.status === "confirmed" ? "confirmed" : "requested", { dedupe: true });
  await sendPaymentReceipt(plain, receiptUrl);
  await notifyAdmins("New paid booking", "New booking – payment received", bookingAdminLines(plain), `${siteUrl()}/admin/bookings?q=${plain.bookingNumber}`);
  return updated;
}

export async function markSessionExpired(sessionId: string) {
  await connectDB();
  const booking = await Booking.findOneAndUpdate(
    { stripeSessionId: sessionId, paymentStatus: { $ne: "paid" }, status: { $in: ["held", "pending_payment"] } },
    { $set: { status: "expired", paymentStatus: "expired" } },
    { new: true },
  );
  await Payment.updateOne({ stripeSessionId: sessionId, status: "pending" }, { $set: { status: "expired" } });
  if (booking) {
    await BookingHold.updateOne({ booking: booking._id, status: "active" }, { $set: { status: "released" } });
    await releaseBookingSlots(booking._id);
  }
}

export async function markPaymentFailed(sessionId: string, reason?: string) {
  await connectDB();
  await Payment.updateOne({ stripeSessionId: sessionId }, { $set: { status: "failed", failureReason: reason } });
  const booking = await Booking.findOneAndUpdate(
    { stripeSessionId: sessionId, paymentStatus: { $ne: "paid" } },
    { $set: { paymentStatus: "failed" } },
    { new: true },
  );
  if (booking) {
    await notifyAdmins("Payment failed", "Payment failure alert", bookingAdminLines(booking.toObject()));
  }
}

/** Cancel a booking and free its capacity. Refunds are handled by staff in Stripe. */
export async function cancelBooking(bookingId: string, reason: string, notify = true) {
  await connectDB();
  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, status: { $nin: ["cancelled", "expired", "completed"] } },
    { $set: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason } },
    { new: true },
  );
  if (!booking) throw new HttpError(409, "This booking cannot be cancelled.");
  await BookingHold.updateMany({ booking: booking._id, status: "active" }, { $set: { status: "released" } });
  await releaseBookingSlots(booking._id);
  if (notify) {
    await sendCustomerBookingEmail(booking.toObject(), "cancelled");
    await notifyAdmins("Booking cancelled", "Booking cancelled", [...bookingAdminLines(booking.toObject()), ["Reason", reason]]);
  }
  return booking;
}

/** Move a booking to a new date/time, reserving the new slots before releasing the old ones. */
export async function rescheduleBooking(bookingId: string, date: string, startMinutes: number, notify = true) {
  await connectDB();
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new HttpError(404, "Booking not found.");
  if (!["confirmed", "requested", "pending_payment"].includes(booking.status)) {
    throw new HttpError(409, "Only active bookings can be rescheduled.");
  }
  const settings = await loadBookingSettings();
  const exp = await loadExperience(booking.experience);
  const { slots, open, reason } = await getAvailableSlots({
    experience: exp,
    date,
    durationMin: booking.durationMin,
    players: booking.players,
    settings,
    ignoreBookingId: String(booking._id),
  });
  if (!open) throw new HttpError(409, reason || "This date is not available.");
  if (!slots.find((s) => s.startMinutes === startMinutes && s.available)) throw new HttpError(409, "That time is not available.");

  // Release first then reserve; if reserving fails, restore the original reservation.
  const oldKeys = booking.slotKeys;
  const oldDate = booking.date;
  const oldStart = booking.startMinutes;
  await releaseBookingSlots(booking._id);
  let newKeys: string[];
  try {
    newKeys = await reserveSlots({
      resourceKey: exp.resourceKey,
      date,
      minutes: coveredSlots(startMinutes, booking.durationMin, exp.bufferMin, settings.slotIntervalMin),
      units: booking.units,
      capacity: capacityFor(exp),
    });
  } catch (err) {
    // Put the original reservation back exactly as it was (it was ours a moment ago).
    const { SlotLedger } = await import("../models");
    await SlotLedger.updateMany({ key: { $in: oldKeys } }, { $inc: { used: booking.units } });
    await Booking.updateOne({ _id: booking._id }, { $set: { slotKeys: oldKeys } });
    throw err;
  }
  const startAt = zonedToUtc(date, startMinutes);
  const updated = await Booking.findByIdAndUpdate(
    booking._id,
    {
      $set: { date, startMinutes, startAt, endAt: new Date(startAt.getTime() + booking.durationMin * 60_000), slotKeys: newKeys, reminderSentAt: null },
      $push: { rescheduledFrom: { date: oldDate, startMinutes: oldStart } },
    },
    { new: true },
  );
  if (notify && updated) await sendCustomerBookingEmail(updated.toObject(), "rescheduled");
  return updated;
}

/** Recalculate waiver counts for a booking after a waiver is signed. */
export async function refreshWaiverStatus(bookingId: unknown) {
  const { SignedWaiver } = await import("../models");
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  const signed = await SignedWaiver.countDocuments({ booking: booking._id });
  booking.waiversSigned = signed;
  if (booking.waiverStatus !== "not_required") {
    booking.waiverStatus = signed === 0 ? "pending" : signed >= booking.waiversRequired ? "complete" : "partial";
  }
  await booking.save();
  return booking;
}

export type PublicBooking = Pick<
  IBooking,
  | "bookingNumber"
  | "experienceName"
  | "gameName"
  | "date"
  | "startAt"
  | "durationMin"
  | "players"
  | "status"
  | "paymentStatus"
  | "waiverStatus"
  | "waiversRequired"
  | "waiversSigned"
  | "pricing"
  | "holdExpiresAt"
> & { customerName: string; customerEmail: string };

export function toPublicBooking(b: IBooking): PublicBooking {
  return {
    bookingNumber: b.bookingNumber,
    experienceName: b.experienceName,
    gameName: b.gameName,
    date: b.date,
    startAt: b.startAt,
    durationMin: b.durationMin,
    players: b.players,
    status: b.status,
    paymentStatus: b.paymentStatus,
    waiverStatus: b.waiverStatus,
    waiversRequired: b.waiversRequired,
    waiversSigned: b.waiversSigned,
    pricing: b.pricing,
    holdExpiresAt: b.holdExpiresAt,
    customerName: b.customer.name,
    customerEmail: b.customer.email,
  };
}
