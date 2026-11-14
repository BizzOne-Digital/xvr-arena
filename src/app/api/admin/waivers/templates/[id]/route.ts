import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { handle, ok, parseJson, fail } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WaiverTemplate } from "@/lib/models";
import { audit, HttpError, sha256 } from "@/lib/security";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(20).max(100000),
    acknowledgments: z.array(z.string().trim().min(3).max(500)).max(20),
    requireDob: z.boolean(),
    minorAgeThreshold: z.number().int().min(1).max(25),
    retentionYears: z.number().int().min(1).max(50).optional(),
  }),
  z.object({
    action: z.literal("publish"),
    legalApproval: z.literal(true, { message: "Confirm that this wording has been approved" }),
    legalApprovalNote: z.string().trim().min(3, "Note who approved this wording and when").max(500),
  }),
  z.object({ action: z.literal("archive") }),
]);

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!isValidObjectId(id)) return fail(404, "Not found");
  const admin = await requireAdminApi(req, "manager");
  const input = await parseJson(req, schema);
  await connectDB();
  const t = await WaiverTemplate.findById(id);
  if (!t) return fail(404, "Not found");

  if (input.action === "save") {
    // Published text is immutable so signed waivers always match the version they accepted.
    if (t.status !== "draft") throw new HttpError(409, "Published versions cannot be edited. Create a new draft version.");
    Object.assign(t, { ...input, action: undefined });
    await t.save();
  } else if (input.action === "publish") {
    if (t.status !== "draft") throw new HttpError(409, "Only drafts can be published.");
    if (/DRAFT WAIVER|NOT FOR PUBLICATION/i.test(t.body)) throw new HttpError(400, "Replace the placeholder text with the approved waiver wording first.");
    await WaiverTemplate.updateMany({ status: "published" }, { $set: { status: "archived" } });
    t.status = "published";
    t.publishedAt = new Date();
    t.legalApprovalNote = `${input.legalApprovalNote} (confirmed by ${admin.email})`;
    t.contentHash = sha256(t.body);
    await t.save();
  } else {
    t.status = "archived";
    await t.save();
  }
  await audit({ actor: admin.userId, actorEmail: admin.email, action: `waiver.${input.action}`, entity: "WaiverTemplate", entityId: String(t.version) });
  return ok({ item: t.toObject() });
});
