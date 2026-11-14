import { handle, ok, parseJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Review } from "@/lib/models";
import { reviewSchema } from "@/lib/validation";
import { clientIp, HttpError, rateLimit } from "@/lib/security";
import { notifyAdmins } from "@/lib/emails";
import { siteUrl } from "@/lib/utils";

export const POST = handle(async (req: Request) => {
  const data = await parseJson(req, reviewSchema);
  if (data.website) return ok({ ok: true });
  await connectDB();
  if (!(await rateLimit(`review:${await clientIp()}`, 3, 3600))) throw new HttpError(429, "Too many submissions. Please try again later.");
  // Always stored as pending: nothing is public until an admin approves it.
  await Review.create({ name: data.name, email: data.email || undefined, rating: data.rating, text: data.text, experience: data.experience, status: "pending" });
  await notifyAdmins("New review awaiting moderation", "New customer review", [
    ["Name", data.name],
    ["Rating", `${data.rating} / 5`],
    ["Review", data.text],
  ], `${siteUrl()}/admin/reviews`);
  return ok({ ok: true });
});
