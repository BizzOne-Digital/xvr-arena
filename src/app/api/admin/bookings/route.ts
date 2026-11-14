import { handle, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Booking } from "@/lib/models";
import { releaseExpiredHolds } from "@/lib/booking/availability";
import { BOOKING_STATUSES } from "@/lib/models/booking";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = handle(async (req: Request) => {
  await requireAdminApi(req);
  await connectDB();
  await releaseExpiredHolds(50).catch(() => 0);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const status = url.searchParams.get("status") || "";
  const payment = url.searchParams.get("payment") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const experience = url.searchParams.get("experience") || "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = 25;

  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ bookingNumber: rx }, { "customer.name": rx }, { "customer.email": rx }, { "customer.phone": rx }];
  }
  if (status === "active") filter.status = { $in: ["confirmed", "requested", "pending_payment"] };
  else if ((BOOKING_STATUSES as readonly string[]).includes(status)) filter.status = status;
  else filter.status = { $ne: "held" };
  if (payment) filter.paymentStatus = payment;
  if (experience) filter.experience = experience;
  if (from || to) filter.date = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

  const sort: Record<string, 1 | -1> = from ? { startAt: 1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).select("-publicToken -slotKeys").lean(),
    Booking.countDocuments(filter),
  ]);
  return ok({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) }, { headers: { "Cache-Control": "no-store" } });
});
