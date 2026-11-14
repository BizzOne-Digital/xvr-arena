import { handle, ok, parseJson } from "@/lib/api";
import { createHold, toPublicBooking } from "@/lib/booking/service";
import { holdSchema } from "@/lib/validation";
import { clientIp, HttpError, rateLimit } from "@/lib/security";
import { connectDB } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const input = await parseJson(req, holdSchema);
  await connectDB();
  if (!(await rateLimit(`hold:${await clientIp()}`, 15, 600))) throw new HttpError(429, "Too many booking attempts. Please wait a few minutes.");
  const { booking } = await createHold(input);
  return ok({
    bookingNumber: booking.bookingNumber,
    token: booking.publicToken,
    booking: toPublicBooking(booking.toObject()),
  });
});
