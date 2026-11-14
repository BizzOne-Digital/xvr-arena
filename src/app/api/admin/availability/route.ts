import { z } from "zod";
import { revalidateTag } from "next/cache";
import { isValidObjectId } from "mongoose";
import { handle, ok, parseJson, fail } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AvailabilityRule, SlotLedger } from "@/lib/models";
import { DEFAULT_WEEKLY_HOURS } from "@/lib/defaults";
import { TAGS } from "@/lib/data";
import { audit } from "@/lib/security";
import { todayInTz } from "@/lib/utils";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("weekly"),
    hours: z
      .array(z.object({ day: z.number().int().min(0).max(6), open: z.boolean(), openTime: hhmm, closeTime: hhmm }))
      .length(7)
      .refine((h) => h.every((d) => !d.open || d.openTime < d.closeTime), "Closing time must be after opening time"),
  }),
  z.object({
    action: z.literal("closure"),
    date: dateStr,
    endDate: dateStr.optional().or(z.literal("")),
    reason: z.string().trim().max(200).optional(),
    resourceKey: z.string().trim().max(80).optional().or(z.literal("")),
  }),
  z.object({ action: z.literal("override"), date: dateStr, openTime: hhmm, closeTime: hhmm, reason: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("delete"), id: z.string() }),
]);

export const GET = handle(async (req: Request) => {
  await requireAdminApi(req);
  await connectDB();
  const today = todayInTz();
  const [weekly, rules, ledger] = await Promise.all([
    AvailabilityRule.findOne({ key: "weekly" }).lean(),
    AvailabilityRule.find({ key: { $in: ["closure", "override"] }, $or: [{ endDate: { $gte: today } }, { date: { $gte: today } }] })
      .sort({ date: 1 })
      .lean(),
    SlotLedger.find({ date: today, used: { $gt: 0 } }).sort({ resourceKey: 1, minutes: 1 }).lean(),
  ]);
  return ok({ hours: weekly?.hours?.length ? weekly.hours : DEFAULT_WEEKLY_HOURS, rules, todayUsage: ledger, today });
});

export const POST = handle(async (req: Request) => {
  const admin = await requireAdminApi(req, "manager");
  const input = await parseJson(req, schema);
  await connectDB();
  switch (input.action) {
    case "weekly":
      await AvailabilityRule.updateOne({ key: "weekly" }, { $set: { hours: input.hours } }, { upsert: true });
      break;
    case "closure":
      if (input.endDate && input.endDate < input.date) return fail(400, "End date must be after start date.");
      await AvailabilityRule.create({
        key: "closure",
        date: input.date,
        endDate: input.endDate || undefined,
        reason: input.reason,
        resourceKey: input.resourceKey || undefined,
      });
      break;
    case "override":
      if (input.openTime >= input.closeTime) return fail(400, "Closing time must be after opening time.");
      await AvailabilityRule.findOneAndUpdate(
        { key: "override", date: input.date },
        { $set: { openTime: input.openTime, closeTime: input.closeTime, reason: input.reason } },
        { upsert: true },
      );
      break;
    case "delete":
      if (!isValidObjectId(input.id)) return fail(400, "Invalid id");
      await AvailabilityRule.deleteOne({ _id: input.id, key: { $ne: "weekly" } });
      break;
  }
  revalidateTag(TAGS.availability, { expire: 0 });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: `availability.${input.action}`, entity: "AvailabilityRule" });
  return ok({ ok: true });
});
