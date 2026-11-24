import { z } from "zod";
import { revalidateTag } from "next/cache";
import { handle, ok, parseJson, fail } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { PageContent } from "@/lib/models";
import { PAGE_DEFAULTS, TAGS } from "@/lib/data";
import { audit } from "@/lib/security";
import { collectUploadUrls, deleteUploadIfUnreferenced } from "@/lib/uploads";

const keys = Object.keys(PAGE_DEFAULTS) as [string, ...string[]];
const schema = z.object({
  key: z.enum(keys),
  data: z.record(z.string(), z.string().max(50000)),
});

export const GET = handle(async (req: Request) => {
  await requireAdminApi(req);
  await connectDB();
  const docs = await PageContent.find({}).lean();
  const stored = Object.fromEntries(docs.map((d) => [d.key, d.data]));
  return ok({ defaults: PAGE_DEFAULTS, stored });
});

export const PUT = handle(async (req: Request) => {
  const admin = await requireAdminApi(req, "manager");
  const { key, data } = await parseJson(req, schema);
  const allowed = Object.keys(PAGE_DEFAULTS[key as keyof typeof PAGE_DEFAULTS]);
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  for (const [k, v] of Object.entries(clean)) {
    if (/image$/i.test(k) && v && !v.startsWith("/api/uploads/") && !v.startsWith("/images/") && !v.startsWith("https://")) return fail(400, "Images must be uploaded or https URLs.");
  }
  await connectDB();
  const before = await PageContent.findOne({ key }).lean();
  await PageContent.updateOne({ key }, { $set: { data: clean, updatedBy: admin.userId } }, { upsert: true });
  const newUrls = collectUploadUrls(clean);
  for (const url of collectUploadUrls(before?.data)) if (!newUrls.has(url)) await deleteUploadIfUnreferenced(url);
  revalidateTag(TAGS.pages, { expire: 0 });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "page.update", entity: "PageContent", entityId: key });
  return ok({ ok: true });
});
