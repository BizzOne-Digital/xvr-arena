import { handle, ok, fail } from "@/lib/api";
import { findBookingForCustomer, markPaidFromSession, toPublicBooking } from "@/lib/booking/service";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/** Customer booking status. If a Stripe session id is supplied, verify it server-side with Stripe. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ number: string }> }) => {
  const { number } = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  let booking = await findBookingForCustomer(number, token);
  if (!booking) return fail(404, "Booking not found.");

  const sessionId = url.searchParams.get("session_id");
  if (sessionId && isStripeConfigured() && booking.stripeSessionId === sessionId && booking.paymentStatus !== "paid") {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await markPaidFromSession(session);
      booking = (await findBookingForCustomer(number, token))!;
    }
  }
  return ok(toPublicBooking(booking), { headers: { "Cache-Control": "no-store" } });
});
