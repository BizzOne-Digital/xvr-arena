import { connectDB } from "@/lib/db";
import { Booking } from "@/lib/models";
import { releaseExpiredHolds, loadBookingSettings } from "@/lib/booking/availability";
import { processEmailQueue } from "@/lib/mailer";
import { sendCustomerBookingEmail } from "@/lib/emails";
import { safeEqual } from "@/lib/security";

/**
 * Scheduled maintenance (Vercel Cron, see vercel.json):
 *  - expire abandoned checkout holds and free their capacity
 *  - retry queued emails
 *  - send booking reminders
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  await connectDB();
  const released = await releaseExpiredHolds(200);
  const emails = await processEmailQueue(50);

  const settings = await loadBookingSettings();
  const now = Date.now();
  const upcoming = await Booking.find({
    status: "confirmed",
    reminderSentAt: null,
    startAt: { $gt: new Date(now), $lte: new Date(now + settings.reminderHoursBefore * 3_600_000) },
  }).limit(100);
  let reminders = 0;
  for (const b of upcoming) {
    const claimed = await Booking.findOneAndUpdate({ _id: b._id, reminderSentAt: null }, { $set: { reminderSentAt: new Date() } });
    if (!claimed) continue;
    await sendCustomerBookingEmail(b.toObject(), "reminder", { dedupe: true });
    reminders++;
  }
  return Response.json({ released, emails, reminders });
}
