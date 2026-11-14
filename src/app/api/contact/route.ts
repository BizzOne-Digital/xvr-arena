import { handle, ok, parseJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { ContactInquiry } from "@/lib/models";
import { contactSchema } from "@/lib/validation";
import { clientIp, HttpError, rateLimit } from "@/lib/security";
import { notifyAdmins } from "@/lib/emails";
import { siteUrl } from "@/lib/utils";

export const POST = handle(async (req: Request) => {
  const data = await parseJson(req, contactSchema);
  if (data.website) return ok({ ok: true }); // honeypot: silently accept bots
  await connectDB();
  if (!(await rateLimit(`contact:${await clientIp()}`, 5, 600))) throw new HttpError(429, "Too many messages. Please try again later.");
  const { website: _hp, ...fields } = data;
  void _hp;
  const doc = await ContactInquiry.create(fields);
  await notifyAdmins(
    "New contact message",
    "New contact form message",
    [
      ["Name", doc.name],
      ["Email", doc.email],
      ["Phone", doc.phone || "—"],
      ["Subject", doc.subject || "—"],
      ["Message", doc.message],
    ],
    `${siteUrl()}/admin/inquiries`,
  );
  return ok({ ok: true });
});
