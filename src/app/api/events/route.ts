import { handle, ok, parseJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { EventInquiry } from "@/lib/models";
import { eventInquirySchema } from "@/lib/validation";
import { clientIp, HttpError, rateLimit } from "@/lib/security";
import { notifyAdmins } from "@/lib/emails";
import { siteUrl } from "@/lib/utils";

export const POST = handle(async (req: Request) => {
  const data = await parseJson(req, eventInquirySchema);
  if (data.website) return ok({ ok: true });
  await connectDB();
  if (!(await rateLimit(`event:${await clientIp()}`, 5, 600))) throw new HttpError(429, "Too many requests. Please try again later.");
  const { website: _hp, ...fields } = data;
  void _hp;
  const doc = await EventInquiry.create({ ...fields, preferredDate: fields.preferredDate || undefined });
  await notifyAdmins(
    `New ${doc.eventType} inquiry`,
    "New event inquiry",
    [
      ["Name", doc.name],
      ["Email", doc.email],
      ["Phone", doc.phone],
      ["Event type", doc.eventType],
      ["Company", doc.company || "—"],
      ["Preferred date", doc.preferredDate || "—"],
      ["Group size", doc.groupSize ? String(doc.groupSize) : "—"],
      ["Requirements", doc.requirements || "—"],
    ],
    `${siteUrl()}/admin/inquiries`,
  );
  return ok({ ok: true });
});
