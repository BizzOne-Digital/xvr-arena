import { z } from "zod";
import { revalidateTag } from "next/cache";
import { handle, ok, parseJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/lib/models";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { TAGS } from "@/lib/data";
import { audit } from "@/lib/security";
import { isSmtpConfigured } from "@/lib/mailer";
import { isStripeConfigured } from "@/lib/stripe";
import { collectUploadUrls, deleteUploadIfUnreferenced } from "@/lib/uploads";

const optStr = (max = 300) => z.string().trim().max(max).optional().default("");

const schema = z.object({
  businessName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(160),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: optStr(),
  city: z.string().trim().min(2).max(80),
  province: z.string().trim().min(2).max(80),
  postalCode: optStr(20),
  country: z.string().trim().min(2).max(80),
  entranceNote: optStr(),
  mapsQuery: z.string().trim().min(3).max(300),
  hoursConfirmed: z.boolean(),
  hoursNote: optStr(500),
  social: z.object({ facebook: optStr(), instagram: optStr(), tiktok: optStr(), youtube: optStr() }),
  logoUrl: optStr(),
  notifyEmails: z.array(z.string().trim().email()).max(10),
  taxRatePercent: z.number().min(0).max(30),
  taxLabel: z.string().trim().min(1).max(60),
  bookingFeeCents: z.number().int().min(0).max(100000),
  holdMinutes: z.number().int().min(30).max(120),
  minLeadMinutes: z.number().int().min(0).max(10080),
  maxAdvanceDays: z.number().int().min(1).max(365),
  slotIntervalMin: z.number().int().refine((v) => [10, 15, 20, 30, 45, 60].includes(v), "Use 10, 15, 20, 30, 45 or 60"),
  onlinePaymentsEnabled: z.boolean(),
  waiverTiming: z.enum(["before_payment", "before_arrival"]),
  cancellationPolicy: optStr(5000),
  cancellationCutoffHours: z.number().int().min(0).max(720),
  allowSelfReschedule: z.boolean(),
  arrivalInstructions: optStr(1000),
  reminderHoursBefore: z.number().int().min(1).max(168),
});

export const GET = handle(async (req: Request) => {
  await requireAdminApi(req, "manager");
  await connectDB();
  const doc = await SiteSettings.findOne({ key: "main" }).lean();
  return ok({
    settings: { ...DEFAULT_SETTINGS, ...(doc ?? {}) },
    integrations: {
      stripe: isStripeConfigured(),
      smtp: isSmtpConfigured(),
      cron: Boolean(process.env.CRON_SECRET),
      siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      maps: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY),
    },
  });
});

export const PUT = handle(async (req: Request) => {
  const admin = await requireAdminApi(req, "manager");
  const data = await parseJson(req, schema);
  await connectDB();
  const before = await SiteSettings.findOne({ key: "main" }).lean();
  await SiteSettings.updateOne({ key: "main" }, { $set: { ...data, key: "main" } }, { upsert: true });
  for (const url of collectUploadUrls(before?.logoUrl)) if (url !== data.logoUrl) await deleteUploadIfUnreferenced(url);
  revalidateTag(TAGS.settings, { expire: 0 });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "settings.update", entity: "SiteSettings" });
  return ok({ ok: true });
});
