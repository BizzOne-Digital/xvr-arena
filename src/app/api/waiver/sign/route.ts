import { handle, ok, parseJson } from "@/lib/api";
import { waiverSignSchema } from "@/lib/validation";
import { signWaiver } from "@/lib/waiver";
import { clientIp, HttpError, rateLimit } from "@/lib/security";
import { connectDB } from "@/lib/db";

export const POST = handle(async (req: Request) => {
  const input = await parseJson(req, waiverSignSchema);
  await connectDB();
  const ip = await clientIp();
  if (!(await rateLimit(`waiver:${ip}`, 30, 600))) throw new HttpError(429, "Too many submissions. Please wait a few minutes.");
  const result = await signWaiver(input, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  return ok(result);
});
