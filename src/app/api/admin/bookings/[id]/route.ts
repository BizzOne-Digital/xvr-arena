import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { handle, ok, fail, parseJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking, BookingHold, Participant, Payment, SignedWaiver } from "@/lib/models";
import { cancelBooking, rescheduleBooking } from "@/lib/booking/service";
import { releaseBookingSlots } from "@/lib/booking/availability";
import { sendCustomerBookingEmail } from "@/lib/emails";
import { audit, HttpError } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail(404, "Not found");
  await requireAdminApi(req);
  await connectDB();
  const booking = await Booking.findById(id).select("-publicToken").lean();
  if (!booking) return fail(404, "Not found");
  const [payments, waivers, participants] = await Promise.all([
    Payment.find({ booking: id }).sort({ createdAt: -1 }).lean(),
    SignedWaiver.find({ booking: id }).select("waiverNumber participantName isMinor signerName signedAt templateVersion").lean(),
    Participant.find({ booking: id }).lean(),
  ]);
  return ok({ booking, payments, waivers, participants });
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("no_show") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(2).max(500), notify: z.boolean().default(true) }),
  z.object({
    action: z.literal("reschedule"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startMinutes: z.number().int().min(0).max(1440),
    notify: z.boolean().default(true),
  }),
  z.object({ action: z.literal("mark_paid"), method: z.string().trim().min(2).max(60), amountCents: z.number().int().min(0) }),
  z.object({ action: z.literal("notes"), adminNotes: z.string().max(5000) }),
  z.object({ action: z.literal("waiver_not_required"), value: z.boolean() }),
]);

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail(404, "Not found");
  const admin = await requireAdminApi(req);
  const input = await parseJson(req, actionSchema);
  await connectDB();
  const booking = await Booking.findById(id);
  if (!booking) return fail(404, "Not found");

  switch (input.action) {
    case "approve": {
      if (!["requested", "held"].includes(booking.status)) throw new HttpError(409, "Only requested bookings can be approved.");
      booking.status = "confirmed";
      booking.holdExpiresAt = undefined;
      await booking.save();
      await BookingHold.updateMany({ booking: booking._id, status: "active" }, { $set: { status: "converted" } });
      await sendCustomerBookingEmail(booking.toObject(), "confirmed", { dedupe: true });
      break;
    }
    case "complete":
    case "no_show": {
      if (!["confirmed", "requested"].includes(booking.status)) throw new HttpError(409, "Only active bookings can be updated.");
      booking.status = input.action === "complete" ? "completed" : "no_show";
      await booking.save();
      break;
    }
    case "cancel":
      await cancelBooking(id, input.reason, input.notify);
      break;
    case "reschedule":
      await rescheduleBooking(id, input.date, input.startMinutes, input.notify);
      break;
    case "mark_paid": {
      if (booking.paymentStatus === "paid") throw new HttpError(409, "Already marked as paid.");
      await Payment.create({
        booking: booking._id,
        bookingNumber: booking.bookingNumber,
        provider: "manual",
        amountCents: input.amountCents,
        currency: "cad",
        status: "paid",
        failureReason: undefined,
        rawEventIds: [],
        receiptUrl: undefined,
      });
      booking.paymentStatus = "paid";
      booking.adminNotes = `${booking.adminNotes ?? ""}\nPayment recorded manually (${input.method}) by ${admin.email}.`.trim();
      await booking.save();
      break;
    }
    case "notes":
      booking.adminNotes = input.adminNotes;
      await booking.save();
      break;
    case "waiver_not_required":
      booking.waiverStatus = input.value ? "not_required" : booking.waiversSigned >= booking.waiversRequired ? "complete" : "pending";
      await booking.save();
      break;
  }
  if (input.action === "cancel" || booking.status === "expired") await releaseBookingSlots(booking._id);
  await audit({ actor: admin.userId, actorEmail: admin.email, action: `booking.${input.action}`, entity: "Booking", entityId: booking.bookingNumber });
  const fresh = await Booking.findById(id).select("-publicToken").lean();
  return ok({ booking: fresh });
});
