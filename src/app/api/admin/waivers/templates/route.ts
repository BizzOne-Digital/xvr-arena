import { z } from "zod";
import { handle, ok, parseJson } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { WaiverTemplate } from "@/lib/models";
import { CLIENT_WAIVER_BODY, CLIENT_WAIVER_TITLE } from "@/lib/waiver-text";
import { audit } from "@/lib/security";

export const GET = handle(async (req: Request) => {
  await requireAdminApi(req);
  await connectDB();
  const items = await WaiverTemplate.find({}).sort({ version: -1 }).lean();
  return ok({ items });
});

/** Create a new draft version, copying the latest version's text. */
export const POST = handle(async (req: Request) => {
  const admin = await requireAdminApi(req, "manager");
  await parseJson(req, z.object({}).passthrough());
  await connectDB();
  const latest = await WaiverTemplate.findOne({}).sort({ version: -1 }).lean();
  const isPlaceholder = !latest || /DRAFT WAIVER|NOT FOR PUBLICATION/i.test(latest.body);
  const draft = await WaiverTemplate.create({
    version: (latest?.version ?? 0) + 1,
    title: isPlaceholder ? CLIENT_WAIVER_TITLE : latest!.title,
    body: isPlaceholder ? CLIENT_WAIVER_BODY : latest!.body,
    acknowledgments: latest?.acknowledgments ?? [],
    requireDob: latest?.requireDob ?? true,
    minorAgeThreshold: latest?.minorAgeThreshold ?? 18,
    retentionYears: latest?.retentionYears,
    status: "draft",
  });
  await audit({ actor: admin.userId, actorEmail: admin.email, action: "waiver.draft_create", entity: "WaiverTemplate", entityId: String(draft.version) });
  return ok({ item: draft.toObject() }, { status: 201 });
});
