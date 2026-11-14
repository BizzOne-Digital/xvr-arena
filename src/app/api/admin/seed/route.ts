import { revalidateTag } from "next/cache";
import { handle, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AvailabilityRule, Experience, FAQ, Promotion, SiteSettings, WaiverTemplate } from "@/lib/models";
import {
  DEFAULT_EXPERIENCES,
  DEFAULT_FAQS,
  DEFAULT_PROMOTIONS,
  DEFAULT_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
  WAIVER_DRAFT_BODY,
} from "@/lib/defaults";
import { TAGS } from "@/lib/data";
import { audit } from "@/lib/security";

/**
 * Inserts starter content that is missing. Never overwrites existing records.
 * Inserts no prices, games or legal wording.
 */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdminApi(req, "owner");
  await connectDB();
  const created: string[] = [];

  if (!(await SiteSettings.exists({ key: "main" }))) {
    await SiteSettings.create(DEFAULT_SETTINGS);
    created.push("business settings");
  }
  if (!(await AvailabilityRule.exists({ key: "weekly" }))) {
    await AvailabilityRule.create({ key: "weekly", hours: DEFAULT_WEEKLY_HOURS });
    created.push("draft weekly hours");
  }
  for (const e of DEFAULT_EXPERIENCES) {
    if (!(await Experience.exists({ slug: e.slug }))) {
      await Experience.create(e);
      created.push(`experience: ${e.name}`);
    }
  }
  if ((await FAQ.estimatedDocumentCount()) === 0) {
    await FAQ.insertMany(DEFAULT_FAQS.map((f, i) => ({ ...f, sortOrder: i })));
    created.push(`${DEFAULT_FAQS.length} FAQs (policy answers saved as drafts)`);
  }
  for (const p of DEFAULT_PROMOTIONS) {
    if (!(await Promotion.exists({ slug: p.slug }))) {
      await Promotion.create(p);
      created.push(`offer: ${p.title} (rules not yet confirmed)`);
    }
  }
  if ((await WaiverTemplate.estimatedDocumentCount()) === 0) {
    await WaiverTemplate.create({ version: 1, title: "Participant Release, Waiver & Assumption of Risk", body: WAIVER_DRAFT_BODY, status: "draft" });
    created.push("waiver draft placeholder");
  }

  Object.values(TAGS).forEach((t) => revalidateTag(t, { expire: 0 }));
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "seed.starter", entity: "System", details: { created } });
  return ok({ created });
});
