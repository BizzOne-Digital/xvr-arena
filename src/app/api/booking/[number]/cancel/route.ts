import { z } from "zod";
import { handle, ok, parseJson, fail } from "@/lib/api";
import { cancelBooking, findBookingForCustomer } from "@/lib/booking/service";
import { loadBookingSettings } from "@/lib/booking/availability";

const schema = z.object({ token: z.string().min(10).max(100), reason: z.string().trim().max(500).optional() });

/**
 * Customer self-cancellation. Only allowed for unpaid requests/holds, or paid bookings when the
 * admin-configured cutoff has not passed. Refunds are processed by staff.
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ number: string }> }) => {
  const { number } = await ctx.params;
  const { token, reason } = await parseJson(req, schema);
  const booking = await findBookingForCustomer(number, token);
  if (!booking) return fail(404, "Booking not found.");
  const settings = await loadBookingSettings();
  const hoursUntil = (new Date(booking.startAt).getTime() - Date.now()) / 3_600_000;
  if (booking.paymentStatus === "paid" && hoursUntil < settings.cancellationCutoffHours) {
    return fail(409, `Online cancellation closes ${settings.cancellationCutoffHours} hours before your session. Please contact us.`);
  }
  await cancelBooking(String(booking._id), reason ? `Customer: ${reason}` : "Cancelled by customer");
  return ok({ ok: true });
});
